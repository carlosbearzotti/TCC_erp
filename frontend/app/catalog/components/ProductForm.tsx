"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import api, { fetcher } from "../../../services/api"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Plus } from "lucide-react"
import { CategoryModal } from "./CategoryModal"

interface Categoria {
  id: number
  nome: string
  status: boolean
}

interface ProductFormProps {
  onClose: () => void
  productToEdit?: {
    id: number
    nome: string
    preco: number | string
    categoria: number
    disponibilidade: boolean
    descricao?: string
  } | null
}

export function ProductForm({ onClose, productToEdit }: ProductFormProps) {
  const { data: categorias, isLoading: loadingCategorias } = useSWR<Categoria[]>(
    "/catalog/categorias/",
    fetcher
  )

  const [nome, setNome] = useState(productToEdit?.nome || "")
  const [preco, setPreco] = useState(productToEdit?.preco ? String(productToEdit.preco) : "")
  const [categoria, setCategoria] = useState(
    productToEdit?.categoria ? String(productToEdit.categoria) : ""
  )
  const [disponibilidade, setDisponibilidade] = useState(
    productToEdit?.disponibilidade !== undefined ? productToEdit.disponibilidade : true
  )
  const [descricao, setDescricao] = useState(productToEdit?.descricao || "")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showCatModal, setShowCatModal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setLoading(true)

    try {
      let selectedCatId = categoria ? parseInt(categoria) : null

      if (!selectedCatId && categorias && categorias.length > 0) {
        selectedCatId = categorias[0].id
      }

      if (!selectedCatId) {
        const catRes = await api.post("/catalog/categorias/", {
          nome: "Geral",
          descricao: "Categoria padrão",
          status: true,
        })
        selectedCatId = catRes.data.id
        mutate("/catalog/categorias/")
      }

      const payload = {
        nome,
        preco: parseFloat(preco),
        categoria: selectedCatId,
        disponibilidade,
        descricao,
      }

      if (productToEdit?.id) {
        await api.put(`/catalog/produtos/${productToEdit.id}/`, payload)
      } else {
        await api.post("/catalog/produtos/", payload)
      }

      mutate("/catalog/produtos/")
      onClose()
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err)
      const message =
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "Erro ao salvar produto. Verifique os dados."
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          {productToEdit ? "Editar Produto" : "Novo Produto no Cardápio"}
        </h2>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Nome do Produto
            </label>
            <Input
              required
              placeholder="Ex: Pastel de Carne Especial"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Preço de Venda (R$)
            </label>
            <Input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-zinc-300">
                Tipo / Categoria
              </label>
              <button
                type="button"
                onClick={() => setShowCatModal(true)}
                className="text-[11px] font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Novo Tipo
              </button>
            </div>
            <select
              className="flex h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-sm focus-visible:outline-none focus-visible:border-yellow-400"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {loadingCategorias ? (
                <option>Carregando categorias...</option>
              ) : Array.isArray(categorias) && categorias.length > 0 ? (
                categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))
              ) : (
                <option value="">(Criar categoria "Geral" automaticamente)</option>
              )}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Descrição (Opcional)
            </label>
            <Input
              placeholder="Ex: Recheio caprichado com carne e azeitona"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="disponibilidade"
              checked={disponibilidade}
              onChange={(e) => setDisponibilidade(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-yellow-400 focus:ring-yellow-400 accent-yellow-400"
            />
            <label htmlFor="disponibilidade" className="text-xs text-zinc-300 cursor-pointer font-medium">
              Produto Disponível para Venda
            </label>
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
              {loading ? "Salvando..." : productToEdit ? "Salvar Alterações" : "Cadastrar Produto"}
            </Button>
          </div>
        </form>
      </div>

      <CategoryModal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        onCreated={(newCat) => {
          setCategoria(String(newCat.id))
          mutate("/catalog/categorias/")
        }}
      />
    </div>
  )
}
