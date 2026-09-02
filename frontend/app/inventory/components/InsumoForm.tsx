"use client"

import { useState } from "react"
import { mutate } from "swr"
import api from "../../../services/api"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"

interface InsumoFormProps {
  onClose: () => void
  insumoToEdit?: {
    id: number
    nome: string
    unidade_medida: string
    quantidade_atual: number | string
    estoque_minimo: number | string
  } | null
}

export function InsumoForm({ onClose, insumoToEdit }: InsumoFormProps) {
  const [nome, setNome] = useState(insumoToEdit?.nome || "")
  const [unidadeMedida, setUnidadeMedida] = useState(insumoToEdit?.unidade_medida || "kg")
  const [quantidadeAtual, setQuantidadeAtual] = useState(
    insumoToEdit?.quantidade_atual !== undefined ? String(insumoToEdit.quantidade_atual) : "0"
  )
  const [estoqueMinimo, setEstoqueMinimo] = useState(
    insumoToEdit?.estoque_minimo !== undefined ? String(insumoToEdit.estoque_minimo) : "5"
  )
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setLoading(true)

    try {
      const payload = {
        nome,
        unidade_medida: unidadeMedida,
        quantidade_atual: parseFloat(quantidadeAtual),
        estoque_minimo: parseFloat(estoqueMinimo),
      }

      if (insumoToEdit?.id) {
        await api.put(`/inventory/insumos/${insumoToEdit.id}/`, payload)
      } else {
        await api.post("/inventory/insumos/", payload)
      }

      mutate("/inventory/insumos/")
      onClose()
    } catch (err: any) {
      console.error("Erro ao salvar insumo:", err)
      setErrorMsg(
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "Erro ao salvar insumo. Verifique os valores."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          {insumoToEdit ? "Editar Insumo" : "Novo Insumo / Matéria-Prima"}
        </h2>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Nome do Insumo
            </label>
            <Input
              required
              placeholder="Ex: Queijo Mussarela Fatiado"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block font-semibold text-zinc-300">
                Unidade de Medida
              </label>
              <select
                className="flex h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-sm focus-visible:outline-none focus-visible:border-yellow-400"
                value={unidadeMedida}
                onChange={(e) => setUnidadeMedida(e.target.value)}
              >
                <option value="kg">Quilograma (kg)</option>
                <option value="g">Grama (g)</option>
                <option value="l">Litro (l)</option>
                <option value="ml">Mililitro (ml)</option>
                <option value="un">Unidade (un)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-semibold text-zinc-300">
                Estoque Mínimo Ideal
              </label>
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Quantidade Atual em Estoque
            </label>
            <Input
              required
              type="number"
              step="0.01"
              min="0"
              value={quantidadeAtual}
              onChange={(e) => setQuantidadeAtual(e.target.value)}
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
              {loading ? "Salvando..." : insumoToEdit ? "Salvar Alterações" : "Cadastrar Insumo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
