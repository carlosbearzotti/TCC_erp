"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import api, { fetcher } from "../../services/api"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table"
import { Plus, Search, Edit2, Trash2, RefreshCw, AlertCircle, UtensilsCrossed, Tags } from "lucide-react"
import { ProductForm } from "./components/ProductForm"
import { CategoryModal } from "./components/CategoryModal"

interface Produto {
  id: number
  nome: string
  descricao: string
  preco: number | string
  categoria: number
  categoria_nome?: string
  disponibilidade: boolean
}

export default function Catalog() {
  const [showForm, setShowForm] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [productToEdit, setProductToEdit] = useState<Produto | null>(null)
  const [search, setSearch] = useState("")

  const { data: produtos, error, isLoading, isValidating } = useSWR<Produto[]>(
    "/catalog/produtos/",
    fetcher
  )

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Tem certeza que deseja remover o produto "${nome}"?`)) {
      return
    }

    try {
      await api.delete(`/catalog/produtos/${id}/`)
      mutate("/catalog/produtos/")
    } catch (err: any) {
      alert("Erro ao excluir produto. Ele pode estar vinculado a pedidos ou receitas.")
    }
  }

  const filteredProducts = produtos?.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria_nome && p.categoria_nome.toLowerCase().includes(search.toLowerCase()))
  ) || []

  return (
    <div className="flex flex-col space-y-6 p-6 bg-zinc-950 text-zinc-100 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-yellow-400" />
            Cardápio &amp; Catálogo
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Gerencie os produtos, categorias e preços ofertados aos clientes.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => mutate("/catalog/produtos/")}
            title="Recarregar cardápio"
            disabled={isValidating}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin text-yellow-400" : "text-zinc-400"}`} />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCategoryModal(true)}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-yellow-400"
          >
            <Tags className="mr-2 h-4 w-4 text-yellow-400" />
            Novo Tipo / Categoria
          </Button>
          <Button
            onClick={() => {
              setProductToEdit(null)
              setShowForm(true)
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            className="pl-10 h-11 text-sm bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-center space-x-3 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-xs">Falha na conexão com a API do Django.</p>
            <p className="text-[11px] text-red-400/80">Verifique se o backend está rodando em http://localhost:8000</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 shadow-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço de Venda</TableHead>
              <TableHead>Disponibilidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-yellow-400" />
                    <span className="text-xs">Carregando catálogo de produtos...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500 text-xs">
                  Nenhum produto cadastrado ou encontrado com o filtro atual.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-semibold text-zinc-100">
                    <div>{product.nome}</div>
                    {product.descricao && (
                      <div className="text-[11px] text-zinc-500 font-normal">{product.descricao}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-lg bg-zinc-800/90 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-700/50">
                      {product.categoria_nome || `Categoria #${product.categoria}`}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-yellow-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.preco))}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      product.disponibilidade 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${product.disponibilidade ? 'bg-green-400' : 'bg-red-400'}`} />
                      {product.disponibilidade ? 'Disponível' : 'Indisponível'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                      onClick={() => {
                        setProductToEdit(product)
                        setShowForm(true)
                      }}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(product.id, product.nome)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showForm && (
        <ProductForm
          productToEdit={productToEdit}
          onClose={() => {
            setShowForm(false)
            setProductToEdit(null)
          }}
        />
      )}

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </div>
  )
}
