"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import api, { fetcher } from "../../services/api"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent } from "../../components/ui/card"
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  QrCode, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

interface Produto {
  id: number
  nome: string
  descricao?: string
  preco: number | string
  categoria_nome?: string
  disponibilidade: boolean
}

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

export default function OrdersPOS() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"dinheiro" | "cartao_debito" | "cartao_credito" | "pix">("dinheiro")
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [successOrder, setSuccessOrder] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  const { data: produtos, error, isLoading, isValidating } = useSWR<Produto[]>(
    "/catalog/produtos/",
    fetcher
  )

  const availableProducts = (produtos || []).filter((p) => p.disponibilidade)

  const filteredProducts = availableProducts.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria_nome && p.categoria_nome.toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (product: Produto) => {
    const priceNum = Number(product.preco)
    const existing = cart.find((item) => item.id === product.id)
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
    } else {
      setCart([...cart, { id: product.id, name: product.nome, price: priceNum, quantity: 1 }])
    }
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQ = item.quantity + delta
            return newQ > 0 ? { ...item, quantity: newQ } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id))
  }

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return

    setLoadingCheckout(true)
    setErrorMessage("")

    try {
      const payload = {
        status: "criado",
        payment_method: paymentMethod,
        itens: cart.map((item) => ({
          produto: item.id,
          quantidade: item.quantity,
        })),
      }

      const res = await api.post("/orders/", payload)
      const pedidoCriado = res.data

      try {
        const confirmRes = await api.patch(`/orders/${pedidoCriado.id}/`, {
          status: "confirmado",
        })
        setSuccessOrder(confirmRes.data || pedidoCriado)
      } catch (confirmErr: any) {
        console.warn("Pedido criado:", confirmErr)
        setSuccessOrder(pedidoCriado)
      }

      mutate("/inventory/insumos/")
      mutate("/catalog/produtos/")
      setCart([])
    } catch (err: any) {
      console.error("Erro ao finalizar pedido:", err)
      setErrorMessage(
        err.response?.data?.itens ||
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "Erro ao enviar o pedido para o servidor."
      )
    } finally {
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6 p-6 bg-zinc-950 text-zinc-100">
      {/* Left side: Products */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">PDV — Ponto de Venda</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Selecione os produtos para registrar a comanda.</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => mutate("/catalog/produtos/")}
            title="Atualizar cardápio"
            disabled={isValidating}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin text-yellow-400" : "text-zinc-400"}`} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Buscar por nome ou categoria..." 
            className="pl-10 h-11 text-sm bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-center space-x-3 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-xs">Falha na conexão com a API de Produtos.</p>
              <p className="text-[11px] text-red-400/80">Verifique se o backend está rodando em http://localhost:8000</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-6">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center space-x-2 text-zinc-500">
              <RefreshCw className="h-5 w-5 animate-spin text-yellow-400" />
              <span className="text-xs">Carregando cardápio...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
              <p className="font-medium text-sm">Nenhum produto cadastrado no momento.</p>
              <p className="text-xs text-zinc-600 mt-1">Cadastre produtos na aba "Cardápio".</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="group cursor-pointer rounded-2xl border border-zinc-800/80 bg-zinc-900 p-4 transition-all hover:border-yellow-400/60 hover:shadow-lg active:scale-95 flex flex-col justify-between min-h-[130px]"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    {product.categoria_nome && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 mb-1.5 inline-block">
                        {product.categoria_nome}
                      </span>
                    )}
                    <div className="font-bold text-sm text-zinc-100 line-clamp-2 leading-tight">
                      {product.nome}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-yellow-400 font-extrabold text-base">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.preco))}
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-zinc-950 font-bold shadow-md group-hover:scale-105 transition-transform">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Cart */}
      <div className="w-full lg:w-[400px] flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800/80 shadow-xl overflow-hidden h-full flex-shrink-0">
        <div className="bg-zinc-950 border-b border-zinc-800/80 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-yellow-400" />
            <span className="font-bold text-base text-zinc-100">Comanda Atual</span>
          </div>
          <span className="bg-zinc-800 text-yellow-400 text-xs px-2.5 py-1 rounded-full font-bold">
            {cart.reduce((sum, i) => sum + i.quantity, 0)} itens
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/10 text-xs text-red-400 border-b border-red-500/20">
            {errorMessage}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3 py-16">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p className="text-xs">Nenhum item adicionado à comanda</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-zinc-800/60 pb-3 last:border-0 last:pb-0">
                <div className="flex-1 pr-2">
                  <div className="font-bold text-xs text-zinc-100 leading-tight">{item.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)} un
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center border border-zinc-800 rounded-xl bg-zinc-950">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="px-2 py-1 text-zinc-400 hover:text-zinc-100 active:bg-zinc-800 rounded-l-xl"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-zinc-200">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="px-2 py-1 text-zinc-400 hover:text-zinc-100 active:bg-zinc-800 rounded-r-xl"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="w-16 text-right font-bold text-xs text-zinc-100">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                  </div>
                  <button
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 space-y-3">
          <div className="flex justify-between items-center text-lg font-black text-zinc-100">
            <span>Total:</span>
            <span className="text-yellow-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </span>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-bold border transition-colors ${
                  paymentMethod === "dinheiro"
                    ? "bg-yellow-400 text-zinc-950 border-yellow-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                }`}
                onClick={() => setPaymentMethod("dinheiro")}
              >
                <Banknote className="mr-1.5 h-3.5 w-3.5" /> Dinheiro
              </button>

              <button
                type="button"
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-bold border transition-colors ${
                  paymentMethod === "pix"
                    ? "bg-yellow-400 text-zinc-950 border-yellow-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                }`}
                onClick={() => setPaymentMethod("pix")}
              >
                <QrCode className="mr-1.5 h-3.5 w-3.5" /> Pix
              </button>

              <button
                type="button"
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-bold border transition-colors ${
                  paymentMethod === "cartao_debito"
                    ? "bg-yellow-400 text-zinc-950 border-yellow-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                }`}
                onClick={() => setPaymentMethod("cartao_debito")}
              >
                <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Débito
              </button>

              <button
                type="button"
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-bold border transition-colors ${
                  paymentMethod === "cartao_credito"
                    ? "bg-yellow-400 text-zinc-950 border-yellow-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                }`}
                onClick={() => setPaymentMethod("cartao_credito")}
              >
                <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Crédito
              </button>
            </div>
          </div>

          <button 
            className="w-full h-12 rounded-2xl bg-yellow-400 text-zinc-950 text-sm font-black shadow-lg shadow-yellow-400/20 disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center"
            disabled={cart.length === 0 || loadingCheckout}
            onClick={handleCheckout}
          >
            {loadingCheckout ? (
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Processando Venda...</span>
              </div>
            ) : (
              "Finalizar Pedido"
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-400 mb-3 ring-8 ring-green-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-zinc-100">Venda Concluída!</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pedido <span className="font-bold text-yellow-400">#{successOrder.id}</span> confirmado no sistema.
            </p>
            <div className="mt-4 rounded-2xl bg-zinc-950 border border-zinc-800 p-3.5 text-xs space-y-1.5 text-zinc-400">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-extrabold text-yellow-400 text-sm">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(successOrder.total || total))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Forma de Pagamento:</span>
                <span className="font-semibold text-zinc-200 capitalize">{successOrder.payment_method || paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-semibold text-green-400 capitalize">{successOrder.status}</span>
              </div>
            </div>
            <div className="mt-5">
              <Button className="w-full h-11" onClick={() => setSuccessOrder(null)}>
                Novo Pedido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
