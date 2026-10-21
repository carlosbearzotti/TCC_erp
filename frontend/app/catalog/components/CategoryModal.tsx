"use client"

import { useState } from "react"
import { mutate } from "swr"
import api from "../../../services/api"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Tags, Plus, X } from "lucide-react"

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (newCategory: { id: number; nome: string }) => void
}

export function CategoryModal({ isOpen, onClose, onCreated }: CategoryModalProps) {
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    setLoading(true)
    setErrorMsg("")

    try {
      const res = await api.post("/catalog/categorias/", {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        status: true,
      })

      mutate("/catalog/categorias/")
      if (onCreated) {
        onCreated(res.data)
      }
      setNome("")
      setDescricao("")
      onClose()
    } catch (err: any) {
      console.error("Erro ao criar categoria:", err)
      const msg =
        err.response?.data?.nome?.[0] ||
        err.response?.data?.detail ||
        "Erro ao criar novo tipo de produto. O nome já pode estar em uso."
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-lg">
            <span className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              <Tags className="h-5 w-5" />
            </span>
            <span>Novo Tipo / Categoria</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label htmlFor="f-appcatalogcomponentsCategoryModal-1" className="mb-1.5 block font-semibold text-zinc-300">
              Nome do Tipo / Categoria <span className="text-red-400">*</span>
            </label>
            <Input id="f-appcatalogcomponentsCategoryModal-1"
              required
              autoFocus
              placeholder="Ex: Pasteis, Lanches Especiais, Sucos..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-zinc-950 border-zinc-800"
            />
          </div>

          <div>
            <label htmlFor="f-appcatalogcomponentsCategoryModal-2" className="mb-1.5 block font-semibold text-zinc-300">
              Descrição (Opcional)
            </label>
            <Input id="f-appcatalogcomponentsCategoryModal-2"
              placeholder="Ex: Fritos na hora com massa crocante..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-zinc-950 border-zinc-800"
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
            <Button type="submit" disabled={loading || !nome.trim()}>
              <Plus className="h-4 w-4 mr-1.5" />
              {loading ? "Cadastrando..." : "Cadastrar Categoria"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
