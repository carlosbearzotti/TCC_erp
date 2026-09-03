"use client"

import { useState } from "react"
import { mutate } from "swr"
import api from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Insumo {
  id: number
  nome: string
  unidade_medida: string
  quantidade_atual: number | string
}

interface MovimentacaoFormProps {
  onClose: () => void
  insumos: Insumo[]
}

export function MovimentacaoForm({ onClose, insumos }: MovimentacaoFormProps) {
  const [insumoId, setInsumoId] = useState(insumos.length > 0 ? String(insumos[0].id) : "")
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA")
  const [quantidade, setQuantidade] = useState("1")
  const [motivo, setMotivo] = useState("COMPRA")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const selectedInsumo = insumos.find((i) => String(i.id) === insumoId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setLoading(true)

    try {
      await api.post("/inventory/movimentacoes/", {
        insumo: parseInt(insumoId),
        tipo,
        quantidade: parseFloat(quantidade) || 0,
        motivo,
      })

      mutate("/inventory/insumos/")
      mutate("/inventory/movimentacoes/")
      onClose()
    } catch (err: any) {
      console.error("Erro ao registrar movimentação:", err)
      const data = err.response?.data
      let message = "Erro ao processar movimentação de estoque."
      if (typeof data === "object" && data !== null) {
        message = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join(" | ")
      }
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">Movimentar Estoque</h2>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Insumo
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-sm focus-visible:outline-none focus-visible:border-yellow-400"
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              required
            >
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} (Atual: {i.quantidade_atual} {i.unidade_medida})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  tipo === "ENTRADA"
                    ? "bg-green-500/20 border-green-500 text-green-400 shadow-sm"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
                }`}
                onClick={() => {
                  setTipo("ENTRADA")
                  if (motivo === "BAIXA" || motivo === "PERDA") setMotivo("COMPRA")
                }}
              >
                + Entrada
              </button>
              <button
                type="button"
                className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  tipo === "SAIDA"
                    ? "bg-red-500/20 border-red-500 text-red-400 shadow-sm"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
                }`}
                onClick={() => {
                  setTipo("SAIDA")
                  if (motivo === "COMPRA") setMotivo("BAIXA")
                }}
              >
                - Saída
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Motivo da Movimentação
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-sm focus-visible:outline-none focus-visible:border-yellow-400"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            >
              {tipo === "ENTRADA" ? (
                <>
                  <option value="COMPRA">Compra / Reposição de Fornecedor</option>
                  <option value="DEVOLUCAO">Devolução</option>
                  <option value="AJUSTE">Ajuste de Balanço / Inventário</option>
                </>
              ) : (
                <>
                  <option value="BAIXA">Baixa por Consumo / Pedido</option>
                  <option value="PERDA">Perda / Descarte / Validade</option>
                  <option value="AJUSTE">Ajuste de Balanço / Inventário</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Quantidade ({selectedInsumo?.unidade_medida || "UN"})
            </label>
            <Input
              required
              type="number"
              step="0.001"
              min="0.001"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-3 border-t border-zinc-800">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="border-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Confirmar Movimentação"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
