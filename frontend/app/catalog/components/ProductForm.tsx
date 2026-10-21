"use client"

import { useEffect, useState } from "react"
import useSWR, { mutate } from "swr"
import api, { fetcher, mediaUrl } from "../../../services/api"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Plus, ImageIcon, Trash2, FlaskConical } from "lucide-react"
import { CategoryModal } from "./CategoryModal"

interface Categoria {
  id: number
  nome: string
  status: boolean
}

interface InsumoOpt {
  id: number
  nome: string
  unidade_medida: string
}

interface FichaRow {
  key: string
  id?: number
  insumo: string
  quantidade: string
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
    imagem_url?: string | null
  } | null
}

export function ProductForm({ onClose, productToEdit }: ProductFormProps) {
  const { data: categorias, isLoading: loadingCategorias } = useSWR<Categoria[]>(
    "/catalog/categorias/",
    fetcher
  )

  const { data: insumos } = useSWR<InsumoOpt[]>("/inventory/insumos/", fetcher)
  const { data: receitaAtual } = useSWR<any[]>(
    productToEdit?.id ? `/inventory/receitas/?produto=${productToEdit.id}` : null,
    fetcher
  )
  const [ficha, setFicha] = useState<FichaRow[]>([])
  const [fichaLoaded, setFichaLoaded] = useState(!productToEdit?.id)

  useEffect(() => {
    if (!fichaLoaded && Array.isArray(receitaAtual)) {
      setFicha(
        receitaAtual.map((r) => ({
          key: `r${r.id}`,
          id: r.id,
          insumo: String(r.insumo),
          quantidade: String(Number(r.quantidade_necessaria)),
        }))
      )
      setFichaLoaded(true)
    }
  }, [receitaAtual, fichaLoaded])

  const addFichaRow = () =>
    setFicha((rows) => [...rows, { key: `n${Date.now()}${rows.length}`, insumo: "", quantidade: "" }])
  const updateFicha = (key: string, patch: Partial<FichaRow>) =>
    setFicha((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const removeFicha = (key: string) => setFicha((rows) => rows.filter((r) => r.key !== key))

  const syncFicha = async (produtoId: number) => {
    const atuais: any[] = Array.isArray(receitaAtual) ? receitaAtual : []
    const mantidos = new Set(ficha.filter((r) => r.id).map((r) => r.id))
    for (const r of atuais) {
      if (!mantidos.has(r.id)) await api.delete(`/inventory/receitas/${r.id}/`)
    }
    for (const r of ficha) {
      const body = { produto: produtoId, insumo: Number(r.insumo), quantidade_necessaria: Number(r.quantidade.replace(",", ".")) }
      if (r.id) await api.put(`/inventory/receitas/${r.id}/`, body)
      else await api.post("/inventory/receitas/", body)
    }
  }

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
  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [removerImagem, setRemoverImagem] = useState(false)
  const [preview, setPreview] = useState<string | null>(mediaUrl(productToEdit?.imagem_url))

  const handleFile = (file: File | null) => {
    setErrorMsg("")
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Formato inválido. Use JPG, PNG ou WebP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("A imagem deve ter no máximo 5 MB.")
      return
    }
    setImagemFile(file)
    setRemoverImagem(false)
    setPreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImagemFile(null)
    setPreview(null)
    setRemoverImagem(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!fichaLoaded) {
      setErrorMsg("Aguarde o carregamento da ficha técnica.")
      return
    }
    const usados = new Set<string>()
    for (const r of ficha) {
      const q = Number(r.quantidade.replace(",", "."))
      if (!r.insumo || !(q > 0)) {
        setErrorMsg("Ficha técnica: selecione o insumo e informe uma quantidade maior que zero em todas as linhas.")
        return
      }
      if (usados.has(r.insumo)) {
        setErrorMsg("Ficha técnica: o mesmo insumo foi informado mais de uma vez.")
        return
      }
      usados.add(r.insumo)
    }
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

      const payload = new FormData()
      payload.append("nome", nome)
      payload.append("preco", String(parseFloat(preco)))
      payload.append("categoria", String(selectedCatId))
      payload.append("disponibilidade", String(disponibilidade))
      payload.append("descricao", descricao)
      if (imagemFile) payload.append("imagem", imagemFile)
      if (removerImagem) payload.append("remover_imagem", "true")

      const saved = productToEdit?.id
        ? await api.put(`/catalog/produtos/${productToEdit.id}/`, payload)
        : await api.post("/catalog/produtos/", payload)

      await syncFicha(saved.data.id)
      mutate((key) => typeof key === "string" && key.startsWith("/inventory/receitas"))

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
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
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
            <label htmlFor="f-appcatalogcomponentsProductForm-1" className="mb-1.5 block font-semibold text-zinc-300">
              Nome do Produto
            </label>
            <Input id="f-appcatalogcomponentsProductForm-1"
              required
              placeholder="Ex: Pastel de Carne Especial"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="f-appcatalogcomponentsProductForm-2" className="mb-1.5 block font-semibold text-zinc-300">
              Preço de Venda (R$)
            </label>
            <Input id="f-appcatalogcomponentsProductForm-2"
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
                className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
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
            <label htmlFor="f-appcatalogcomponentsProductForm-3" className="mb-1.5 block font-semibold text-zinc-300">
              Descrição (Opcional)
            </label>
            <Input id="f-appcatalogcomponentsProductForm-3"
              placeholder="Ex: Recheio caprichado com carne e azeitona"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-300">
              Imagem do Produto (Opcional)
            </label>
            <div className="flex items-center gap-3">
              {preview ? (
                <img src={preview} alt="Pré-visualização" className="h-16 w-16 rounded-xl object-cover border border-zinc-800" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-950 border border-dashed border-zinc-700 text-zinc-600">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-yellow-400/60">
                  {preview ? "Trocar imagem" : "Selecionar imagem"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {preview && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" /> Remover
                  </button>
                )}
                <span className="text-xs text-zinc-500">JPG, PNG ou WebP, até 5 MB</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-zinc-300">
                <FlaskConical className="h-3.5 w-3.5 text-yellow-400" /> Ficha Técnica (Opcional)
              </label>
              <button
                type="button"
                onClick={addFichaRow}
                disabled={!insumos || insumos.length === 0}
                className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 disabled:opacity-40"
              >
                <Plus className="h-3 w-3" /> Insumo
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Quantidade de cada insumo usada em 1 unidade. O estoque é baixado automaticamente quando o pedido é confirmado.
            </p>
            {Array.isArray(insumos) && insumos.length === 0 && (
              <p className="text-xs text-amber-400">Cadastre insumos no módulo Estoque para montar a ficha técnica.</p>
            )}
            <div className="space-y-2">
              {ficha.map((row) => {
                const ins = Array.isArray(insumos) ? insumos.find((i) => String(i.id) === row.insumo) : undefined
                return (
                  <div key={row.key} className="flex items-center gap-2">
                    <select
                      value={row.insumo}
                      onChange={(e) => updateFicha(row.key, { insumo: e.target.value })}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                    >
                      <option value="">Insumo...</option>
                      {(Array.isArray(insumos) ? insumos : []).map((i) => (
                        <option key={i.id} value={i.id}>{i.nome}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="Qtd"
                      value={row.quantidade}
                      onChange={(e) => updateFicha(row.key, { quantidade: e.target.value })}
                      className="h-9 w-20 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                    />
                    <span className="w-6 text-xs text-zinc-500">{ins?.unidade_medida}</span>
                    <button type="button" onClick={() => removeFicha(row.key)} className="text-red-400 hover:text-red-300" title="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
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
