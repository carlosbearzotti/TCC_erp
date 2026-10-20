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
import { Plus, Search, AlertTriangle, ArrowRightLeft, RefreshCw, AlertCircle, Edit2, Trash2, Package, Download } from "lucide-react"
import { InsumoForm } from "./components/InsumoForm"
import { MovimentacaoForm } from "./components/MovimentacaoForm"
import { Can } from "../../components/Can"
import { downloadCsv, csvDate } from "../../lib/csv"

interface Insumo {
  id: number
  nome: string
  unidade_medida: string
  quantidade_atual: number | string
  estoque_minimo: number | string
  updated_at?: string
}

export default function Inventory() {
  const [showInsumoForm, setShowInsumoForm] = useState(false)
  const [showMovForm, setShowMovForm] = useState(false)
  const [insumoToEdit, setInsumoToEdit] = useState<Insumo | null>(null)
  const [search, setSearch] = useState("")

  const { data: insumos, error, isLoading, isValidating } = useSWR<Insumo[]>(
    "/inventory/insumos/",
    fetcher
  )

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Deseja realmente remover o insumo "${nome}"?`)) {
      return
    }

    try {
      await api.delete(`/inventory/insumos/${id}/`)
      mutate("/inventory/insumos/")
    } catch (err: any) {
      alert("Erro ao excluir insumo. Verifique se ele está vinculado a receitas.")
    }
  }

  const filteredInsumos = Array.isArray(insumos)
    ? insumos.filter((item) =>
        item.nome.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const exportCsv = () => {
    const rows: unknown[][] = [
      ["Código", "Insumo", "Unidade", "Estoque Atual", "Estoque Mínimo", "Status (Normal / Crítico)", "Última Atualização"],
    ]
    filteredInsumos.forEach((i) => {
      const atual = Number(i.quantidade_atual)
      const min = Number(i.estoque_minimo)
      rows.push([
        i.id,
        i.nome,
        i.unidade_medida,
        atual.toFixed(3).replace(".", ","),
        min.toFixed(3).replace(".", ","),
        atual <= min ? "Crítico" : "Normal",
        csvDate(i.updated_at),
      ])
    })
    downloadCsv(`inventario-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <div className="flex flex-col space-y-6 p-6 bg-zinc-950 text-zinc-100 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-2">
            <Package className="h-6 w-6 text-yellow-400" />
            Controle de Estoque &amp; Insumos
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Monitore níveis de matéria-prima e movimentações de compra/baixa.</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => mutate("/inventory/insumos/")}
            title="Recarregar estoque"
            disabled={isValidating}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin text-yellow-400" : "text-zinc-400"}`} />
          </Button>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
            onClick={exportCsv}
            disabled={filteredInsumos.length === 0}
          >
            <Download className="mr-2 h-4 w-4 text-yellow-400" />
            Exportar Inventário (CSV)
          </Button>
          <Can do="EDITAR_ESTOQUE">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
              onClick={() => setShowMovForm(true)}
              disabled={!insumos || insumos.length === 0}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4 text-yellow-400" />
              Movimentar
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => {
                setInsumoToEdit(null)
                setShowInsumoForm(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Insumo
            </Button>
          </Can>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar insumo..."
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
            <p className="font-semibold text-xs">Falha na conexão com a API de Estoque.</p>
            <p className="text-[11px] text-red-400/80">Verifique se o backend está rodando em http://localhost:8000</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 shadow-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Estoque Atual</TableHead>
              <TableHead>Mínimo Ideal</TableHead>
              <TableHead>Status da Matéria-Prima</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-yellow-400" />
                    <span className="text-xs">Carregando insumos do estoque...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredInsumos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500 text-xs">
                  Nenhum insumo cadastrado no estoque ainda. Clique em "Novo Insumo".
                </TableCell>
              </TableRow>
            ) : (
              filteredInsumos.map((item) => {
                const current = Number(item.quantidade_atual)
                const min = Number(item.estoque_minimo)
                const percent = min > 0 ? Math.min((current / min) * 100, 100) : 100
                
                let statusColor = "bg-green-400"
                let badgeStyle = "bg-green-500/10 text-green-400 border-green-500/30"
                let dotColor = "bg-green-400"
                let statusText = "Normal"
                
                if (current <= min && current > min * 0.5) {
                  statusColor = "bg-yellow-400"
                  badgeStyle = "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                  dotColor = "bg-yellow-400"
                  statusText = "Atenção"
                } else if (current <= min * 0.5) {
                  statusColor = "bg-red-400"
                  badgeStyle = "bg-red-500/10 text-red-400 border-red-500/30"
                  dotColor = "bg-red-400"
                  statusText = "Crítico"
                }

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-zinc-100">{item.nome}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1.5 w-full max-w-[160px]">
                        <span className="text-xs font-bold text-zinc-200">
                          {current.toFixed(2)} {item.unidade_medida}
                        </span>
                        <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${statusColor}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs font-medium">
                      {min.toFixed(2)} {item.unidade_medida}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badgeStyle}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                        {statusText}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Can do="EDITAR_ESTOQUE">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                          onClick={() => {
                            setInsumoToEdit(item)
                            setShowInsumoForm(true)
                          }}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(item.id, item.nome)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Can>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showInsumoForm && (
        <InsumoForm
          insumoToEdit={insumoToEdit}
          onClose={() => {
            setShowInsumoForm(false)
            setInsumoToEdit(null)
          }}
        />
      )}

      {showMovForm && insumos && (
        <MovimentacaoForm
          insumos={insumos}
          onClose={() => setShowMovForm(false)}
        />
      )}
    </div>
  )
}
