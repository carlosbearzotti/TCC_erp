"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import api, { fetcher } from "../../services/api"
import { useAuth } from "../../hooks/useAuth"
import { 
  Search, 
  ShoppingBag, 
  Home, 
  Clock, 
  User, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  ArrowLeft, 
  Sparkles,
  MapPin,
  ChevronRight,
  Flame,
  Check,
  RefreshCw,
  Utensils
} from "lucide-react"

interface Produto {
  id: number
  nome: string
  descricao?: string
  preco: number | string
  categoria: number
  categoria_nome?: string
  disponibilidade: boolean
}

interface Categoria {
  id: number
  nome: string
}

export default function ConsumerApp() {
  const [activeTab, setActiveTab] = useState<"home" | "orders" | "cart" | "profile">("home")
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  
  // API Fetching
  const { data: produtos, isLoading: loadingProdutos } = useSWR<Produto[]>("/catalog/produtos/", fetcher)
  const { data: categorias } = useSWR<Categoria[]>("/catalog/categorias/", fetcher)
  const { data: userOrders } = useSWR<any[]>("/orders/", fetcher)

  // Modal de Detalhes do Produto
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null)
  const [productQty, setProductQty] = useState(1)
  const [observacao, setObservacao] = useState("")
  
  // Carrinho e Checkout
  const [cartItems, setCartItems] = useState<any[]>([])
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "delivery" | "payment" | "success">("cart")
  const [deliveryType, setDeliveryType] = useState<"entrega" | "retirada">("entrega")
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cartao_credito" | "cartao_debito" | "dinheiro">("pix")
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null)
  const [loadingCheckout, setLoadingCheckout] = useState(false)

  // Autenticação
  const { isAuthenticated, login, user, logout } = useAuth()
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loadingLogin, setLoadingLogin] = useState(false)

  const handleLoginSubmit = async () => {
    setLoadingLogin(true)
    setLoginError("")
    const res = await login(loginUsername, loginPassword)
    if (!res.success) {
      setLoginError(res.error || "Erro ao fazer login.")
    }
    setLoadingLogin(false)
  }

  // Endereço de entrega
  const [cep, setCep] = useState("")
  const [logradouro, setLogradouro] = useState("")
  const [numero, setNumero] = useState("")
  const [complemento, setComplemento] = useState("")
  const [bairro, setBairro] = useState("")
  const [cidade, setCidade] = useState("")
  const [uf, setUf] = useState("")
  const [loadingCep, setLoadingCep] = useState(false)

  // Cartão (Mock)
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardCvv, setCardCvv] = useState("")

  const handleBuscarCep = async (cepInput: string) => {
    const raw = cepInput.replace(/\D/g, "")
    setCep(cepInput)
    if (raw.length === 8) {
      setLoadingCep(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setLogradouro(data.logradouro || "")
          setBairro(data.bairro || "")
          setCidade(data.localidade || "")
          setUf(data.uf || "")
        }
      } catch (err) {
        console.warn("Falha ViaCEP", err)
      } finally {
        setLoadingCep(false)
      }
    }
  }

  // Produtos disponíveis filtrados
  const availableProducts = (produtos || []).filter((p) => p.disponibilidade)

  const filteredProducts = availableProducts.filter((p) => {
    const matchCat = selectedCatId === null || p.categoria === selectedCatId
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.descricao && p.descricao.toLowerCase().includes(search.toLowerCase())) ||
      (p.categoria_nome && p.categoria_nome.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  const openProductModal = (product: Produto) => {
    setSelectedProduct(product)
    setProductQty(1)
    setObservacao("")
  }

  const handleAddToCart = () => {
    if (!selectedProduct) return

    const priceNum = Number(selectedProduct.preco)

    const cartEntry = {
      cartId: `${selectedProduct.id}-${Date.now()}`,
      product: selectedProduct,
      quantity: productQty,
      unitPrice: priceNum,
      observacao,
      total: priceNum * productQty,
    }

    setCartItems([...cartItems, cartEntry])
    setSelectedProduct(null)
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0)
  const deliveryFee = deliveryType === "entrega" ? 5.00 : 0.00
  const finalTotal = subtotal + deliveryFee

  // Finalizar compra real no Django
  const handleFinalizeOrder = async () => {
    if (cartItems.length === 0) return

    if (deliveryType === "entrega") {
      if (!cep || !logradouro || !numero || !bairro || !cidade) {
        alert("Preencha todos os campos obrigatórios do endereço.")
        return
      }
    }

    if (paymentMethod === "cartao_credito" || paymentMethod === "cartao_debito") {
      if (cardNumber.length < 16 || cardName.length < 3 || cardCvv.length < 3) {
        alert("Preencha os dados do cartão corretamente (apenas simulação).")
        return
      }
    }

    setLoadingCheckout(true)
    try {
      const payload: any = {
        status: "criado",
        tipo_atendimento: deliveryType === "entrega" ? "delivery" : "retirada",
        numero_mesa: deliveryType === "entrega" ? "Delivery" : "Retirada",
        payment_method: paymentMethod,
        itens: cartItems.map((item) => ({
          produto: item.product.id,
          quantidade: item.quantity,
        })),
      }

      if (deliveryType === "entrega") {
        payload.endereco = { cep, logradouro, numero, complemento, bairro, cidade, uf }
      }

      const res = await api.post("/orders/", payload)
      const orderCreated = res.data

      try {
        const confirmRes = await api.patch(`/orders/${orderCreated.id}/`, {
          status: "confirmado",
        })
        setConfirmedOrder(confirmRes.data || orderCreated)
      } catch {
        setConfirmedOrder(orderCreated)
      }

      mutate("/orders/")
      mutate("/inventory/insumos/")
      setCheckoutStep("success")
      setCartItems([])
    } catch (err: any) {
      alert("Erro ao enviar pedido. Verifique os dados.")
    } finally {
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-0 sm:p-6">
      {/* Moldura do Smartphone */}
      <div className="relative flex h-full max-h-[920px] w-full max-w-md flex-col overflow-hidden rounded-none sm:rounded-[40px] border-0 sm:border-[8px] sm:border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/80">
        
        {/* Top Notch Bar */}
        <div className="flex items-center justify-between bg-zinc-950 px-6 pt-3 pb-2 text-[11px] font-semibold text-zinc-400">
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            <span className="h-2 w-3 rounded-sm border border-zinc-400 bg-zinc-400" />
          </div>
        </div>

        {/* Dynamic App Content */}
        <div className="flex-1 overflow-y-auto pb-20">
          
          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <div className="space-y-4 px-4 pt-2">
              {/* Header do Consumidor */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 font-bold text-zinc-950">
                    🥟
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Lanchonete &amp; Pastelaria</p>
                    <p className="flex items-center text-xs font-bold text-zinc-100">
                      <MapPin className="mr-1 h-3 w-3 text-yellow-400" />
                      Balcão &amp; Delivery
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab("cart")} 
                  className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200"
                >
                  <ShoppingBag className="h-5 w-5 text-yellow-400" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-zinc-950">
                      {cartItems.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Barra de Busca */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar no cardápio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/90 pl-10 pr-4 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              {/* Categorias Dinâmicas */}
              {categorias && categorias.length > 0 && (
                <div>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      onClick={() => setSelectedCatId(null)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        selectedCatId === null
                          ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-400/20"
                          : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      <span>✨ Todos</span>
                    </button>
                    {categorias.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCatId(cat.id)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                          selectedCatId === cat.id
                            ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-400/20"
                            : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        <span>{cat.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid de Produtos Reais da API */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="flex items-center text-sm font-bold text-zinc-100">
                    <Flame className="mr-1.5 h-4 w-4 text-amber-400" /> Cardápio
                  </h4>
                  <span className="text-[11px] font-medium text-zinc-500">
                    {filteredProducts.length} itens disponíveis
                  </span>
                </div>

                {loadingProdutos ? (
                  <div className="flex h-48 items-center justify-center space-x-2 text-zinc-500 text-xs">
                    <RefreshCw className="h-5 w-5 animate-spin text-yellow-400" />
                    <span>Carregando cardápio da API...</span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-zinc-500">
                    <Utensils className="h-8 w-8 text-zinc-700 mb-2 opacity-50" />
                    <p className="font-semibold text-xs text-zinc-400">Nenhum produto no cardápio</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Cadastre produtos pelo painel "Cardápio" para exibi-los aqui.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => openProductModal(product)}
                        className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900 p-3.5 transition-all hover:border-yellow-400/60 hover:shadow-lg active:scale-95 min-h-[140px]"
                      >
                        <div>
                          {product.categoria_nome && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 mb-1.5 inline-block">
                              {product.categoria_nome}
                            </span>
                          )}
                          <p className="line-clamp-2 text-xs font-bold text-zinc-100 leading-tight">
                            {product.nome}
                          </p>
                          {product.descricao && (
                            <p className="mt-1 line-clamp-2 text-[10px] text-zinc-400">
                              {product.descricao}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-black text-yellow-400">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(product.preco))}
                          </span>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-zinc-950 shadow-sm transition-transform active:scale-90 font-bold"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CARRINHO & CHECKOUT */}
          {activeTab === "cart" && (
            <div className="px-4 pt-2">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (checkoutStep === "payment") setCheckoutStep("delivery")
                    else if (checkoutStep === "delivery") setCheckoutStep("cart")
                    else setActiveTab("home")
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                <h3 className="text-sm font-bold text-zinc-100">
                  {checkoutStep === "cart" && "Meu Carrinho"}
                  {checkoutStep === "delivery" && "Forma de Entrega"}
                  {checkoutStep === "payment" && "Pagamento"}
                  {checkoutStep === "success" && "Pedido Confirmado"}
                </h3>
                <div className="w-8" />
              </div>

              {/* ETAPA 1: ITENS DO CARRINHO */}
              {checkoutStep === "cart" && (
                <div className="space-y-4">
                  {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                      <ShoppingBag className="h-14 w-14 text-zinc-700 opacity-40 mb-3" />
                      <p className="text-sm font-semibold text-zinc-300">Seu carrinho está vazio</p>
                      <p className="text-xs text-zinc-500 mt-1">Adicione itens deliciosos do cardápio!</p>
                      <button
                        onClick={() => setActiveTab("home")}
                        className="mt-5 rounded-xl bg-yellow-400 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-yellow-400/20"
                      >
                        Ver Cardápio
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        {cartItems.map((item, idx) => (
                          <div
                            key={item.cartId || idx}
                            className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900 p-3.5"
                          >
                            <div className="flex-1 pr-3">
                              <p className="text-xs font-bold text-zinc-100">{item.product.nome}</p>
                              {item.observacao && (
                                <p className="text-[10px] text-zinc-400 mt-0.5">Obs: {item.observacao}</p>
                              )}
                              <p className="text-xs font-semibold text-yellow-400 mt-1">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.total)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-300">x{item.quantity}</span>
                              <button
                                onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
                                className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Resumo Financeiro */}
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>Subtotal</span>
                          <span className="text-zinc-200">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Taxa de Entrega</span>
                          <span className="text-zinc-200">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(deliveryFee)}
                          </span>
                        </div>
                        <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-sm text-zinc-100">
                          <span>Total</span>
                          <span className="text-yellow-400">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(finalTotal)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setCheckoutStep("delivery")}
                        className="w-full rounded-2xl bg-yellow-400 py-3.5 text-center text-xs font-black text-zinc-950 shadow-lg shadow-yellow-400/20 active:scale-95 transition-transform"
                      >
                        Continuar para Entrega
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ETAPA 2: FORMA DE ENTREGA */}
              {checkoutStep === "delivery" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryType("entrega")}
                      className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
                        deliveryType === "entrega"
                          ? "border-yellow-400 bg-yellow-400/10 text-yellow-400 font-bold"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400"
                      }`}
                    >
                      <MapPin className="mb-1.5 h-6 w-6" />
                      <span className="text-xs">Entrega Delivery</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5">R$ 5,00 • 35-45 min</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryType("retirada")}
                      className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
                        deliveryType === "retirada"
                          ? "border-yellow-400 bg-yellow-400/10 text-yellow-400 font-bold"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400"
                      }`}
                    >
                      <Home className="mb-1.5 h-6 w-6" />
                      <span className="text-xs">Retirar no Balcão</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5">Grátis • 15-25 min</span>
                    </button>
                  </div>

                  {deliveryType === "entrega" && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3 animate-in fade-in">
                      <div className="flex justify-between items-center text-xs font-bold text-yellow-400">
                        <span>Endereço de Entrega</span>
                        {loadingCep && <RefreshCw className="h-3 w-3 animate-spin" />}
                      </div>
                      <input
                        placeholder="CEP"
                        value={cep}
                        onChange={(e) => handleBuscarCep(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="Rua"
                          value={logradouro}
                          onChange={(e) => setLogradouro(e.target.value)}
                          className="col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                        />
                        <input
                          placeholder="Nº"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Bairro"
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                        />
                        <input
                          placeholder="Complemento"
                          value={complemento}
                          onChange={(e) => setComplemento(e.target.value)}
                          className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setCheckoutStep("payment")}
                    className="w-full rounded-2xl bg-yellow-400 py-3.5 text-center text-xs font-black text-zinc-950 shadow-lg shadow-yellow-400/20 active:scale-95 transition-transform"
                  >
                    Ir para Pagamento
                  </button>
                </div>
              )}

              {/* ETAPA 3: FORMAS DE PAGAMENTO COM RADIO BUTTONS AMARELOS E LOGIN */}
              {checkoutStep === "payment" && !isAuthenticated && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                    <div className="text-center">
                      <User className="mx-auto h-8 w-8 text-yellow-400 mb-2" />
                      <h4 className="text-sm font-bold text-zinc-100">Identifique-se</h4>
                      <p className="text-[10px] text-zinc-400 mt-1">Faça login para concluir seu pedido.</p>
                    </div>

                    {loginError && (
                      <div className="rounded-xl bg-red-500/10 p-2.5 text-[11px] text-red-400 text-center border border-red-500/20">
                        {loginError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <input
                        placeholder="Usuário ou Email"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                      />
                      <input
                        type="password"
                        placeholder="Senha"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                      />
                      <button
                        onClick={handleLoginSubmit}
                        disabled={loadingLogin || !loginUsername || !loginPassword}
                        className="w-full rounded-xl bg-yellow-400 py-3 text-xs font-bold text-zinc-950 disabled:opacity-50 flex justify-center items-center h-10"
                      >
                        {loadingLogin ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Entrar e Pagar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {checkoutStep === "payment" && isAuthenticated && (
                <div className="space-y-4 animate-in fade-in">
                  <p className="text-xs font-bold text-zinc-300">Selecione o meio de pagamento:</p>

                  <div className="space-y-2.5">
                    {[
                      { id: "pix", label: "Pix (Aprovação Imediata)", desc: "Chave ou QR Code", icon: "⚡" },
                      { id: "cartao_credito", label: "Cartão de Crédito", desc: "Online ou Maquininha", icon: "💳" },
                      { id: "cartao_debito", label: "Cartão de Débito", desc: "Na entrega / retirada", icon: "💳" },
                      { id: "dinheiro", label: "Dinheiro", desc: "Pagamento no local", icon: "💵" },
                    ].map((method) => (
                      <label
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all ${
                          paymentMethod === method.id
                            ? "border-yellow-400 bg-yellow-400/10"
                            : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{method.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-zinc-100">{method.label}</p>
                            <p className="text-[10px] text-zinc-400">{method.desc}</p>
                          </div>
                        </div>

                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                            paymentMethod === method.id
                              ? "border-yellow-400 bg-yellow-400"
                              : "border-zinc-600 bg-transparent"
                          }`}
                        >
                          {paymentMethod === method.id && (
                            <div className="h-2 w-2 rounded-full bg-zinc-950" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  {(paymentMethod === "cartao_credito" || paymentMethod === "cartao_debito") && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3 animate-in fade-in text-xs">
                      <p className="font-bold text-yellow-400">Dados do Cartão (Simulação)</p>
                      <input
                        placeholder="Número do Cartão"
                        maxLength={16}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Nome no Cartão"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                        />
                        <input
                          placeholder="CVV"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex justify-between font-bold text-xs text-zinc-100">
                    <span>Total a Pagar</span>
                    <span className="text-yellow-400 text-sm">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(finalTotal)}
                    </span>
                  </div>

                  <button
                    onClick={handleFinalizeOrder}
                    disabled={loadingCheckout}
                    className="w-full rounded-2xl bg-yellow-400 py-3.5 text-center text-xs font-black text-zinc-950 shadow-lg shadow-yellow-400/20 active:scale-95 transition-transform flex items-center justify-center"
                  >
                    {loadingCheckout ? (
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Enviando Pedido...</span>
                      </div>
                    ) : (
                      "Confirmar Pedido Real"
                    )}
                  </button>
                </div>
              )}

              {/* ETAPA 4: TELA DE SUCESSO */}
              {checkoutStep === "success" && (
                <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95 duration-300">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-400 mb-4 ring-8 ring-green-500/10">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="text-lg font-black text-zinc-100">Pedido Confirmado!</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Pedido <span className="font-bold text-yellow-400">#{confirmedOrder?.id}</span> registrado com sucesso.
                  </p>

                  {confirmedOrder?.codigo_pin_entrega && (
                    <div className="mt-4 rounded-2xl border-2 border-yellow-400 bg-yellow-400/10 p-4 w-full">
                      <p className="text-[10px] font-bold uppercase text-yellow-500">Seu Código de Entrega (PIN)</p>
                      <p className="text-3xl font-black text-yellow-400 mt-1 tracking-widest">{confirmedOrder.codigo_pin_entrega}</p>
                      <p className="text-[10px] text-zinc-400 mt-2">Informe este código ao entregador para receber seu pedido.</p>
                    </div>
                  )}

                  <div className="mt-4 w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-xs space-y-2">
                    <div className="flex justify-between text-zinc-400">
                      <span>Status:</span>
                      <span className="font-semibold text-green-400 capitalize">{confirmedOrder?.status || "Confirmado"}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Forma de Pagamento:</span>
                      <span className="font-semibold text-zinc-200 capitalize">{confirmedOrder?.payment_method || paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Pago:</span>
                      <span className="font-bold text-yellow-400">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(confirmedOrder?.total || finalTotal))}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCheckoutStep("cart")
                      setActiveTab("home")
                    }}
                    className="mt-6 w-full rounded-2xl bg-yellow-400 py-3.5 text-xs font-black text-zinc-950 shadow-lg shadow-yellow-400/20"
                  >
                    Fazer Novo Pedido
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PEDIDOS REAIS DA API */}
          {activeTab === "orders" && (
            <div className="px-4 pt-2 space-y-3">
              <h3 className="text-sm font-bold text-zinc-100">Histórico de Pedidos</h3>
              {(!userOrders || userOrders.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 text-xs">
                  <Clock className="h-10 w-10 text-zinc-700 opacity-40 mb-2" />
                  <p>Nenhum pedido realizado ainda.</p>
                </div>
              ) : (
                userOrders.slice(0, 8).map((ord) => (
                  <div key={ord.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-yellow-400">Pedido #{ord.id}</span>
                      <span className="rounded-full bg-yellow-400/20 px-2.5 py-0.5 text-[10px] font-bold text-yellow-400 capitalize">
                        • {ord.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400 pt-1">
                      <span>Total:</span>
                      <span className="font-bold text-zinc-100">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(ord.total))}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: CONTA */}
          {activeTab === "profile" && (
            <div className="px-4 pt-2 space-y-4 text-xs">
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-lg font-black text-zinc-950 uppercase">
                  {isAuthenticated ? (user?.first_name?.[0] || user?.username?.[0] || "C") : "?"}
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-100">
                    {isAuthenticated ? (user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username) : "Visitante"}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {isAuthenticated ? "Cliente Cadastrado" : "Faça login para gerenciar sua conta"}
                  </p>
                </div>
              </div>

              {isAuthenticated ? (
                <>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
                    <div className="p-3.5 flex justify-between items-center text-zinc-200 cursor-pointer hover:bg-zinc-800/50">
                      <span>Meus Endereços</span>
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="p-3.5 flex justify-between items-center text-zinc-200 cursor-pointer hover:bg-zinc-800/50">
                      <span>Formas de Pagamento</span>
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="p-3.5 flex justify-between items-center text-zinc-200 cursor-pointer hover:bg-zinc-800/50">
                      <span>Privacidade e Segurança</span>
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="p-3.5 flex justify-between items-center text-zinc-200 cursor-pointer hover:bg-zinc-800/50">
                      <span>Suporte e Ajuda</span>
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </div>
                  
                  <button 
                    onClick={logout}
                    className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-xs font-bold text-red-400 hover:bg-red-500/20"
                  >
                    Sair da Conta
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                  <div className="text-center mb-2">
                    <h4 className="text-sm font-bold text-zinc-100">Faça login</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Acesse seus pedidos e informações salvas.</p>
                  </div>
                  {loginError && (
                    <div className="rounded-xl bg-red-500/10 p-2.5 text-[11px] text-red-400 text-center border border-red-500/20">
                      {loginError}
                    </div>
                  )}
                  <div className="space-y-3">
                    <input
                      placeholder="Usuário ou Email"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                    />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400"
                    />
                    <button
                      onClick={handleLoginSubmit}
                      disabled={loadingLogin || !loginUsername || !loginPassword}
                      className="w-full rounded-xl bg-yellow-400 py-3 text-xs font-bold text-zinc-950 disabled:opacity-50 flex justify-center items-center h-10"
                    >
                      {loadingLogin ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Fazer Login"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="absolute bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-zinc-800/80 bg-zinc-950/95 px-4 backdrop-blur-md">
          {[
            { id: "home", label: "Início", icon: Home },
            { id: "orders", label: "Pedidos", icon: Clock },
            { id: "cart", label: "Carrinho", icon: ShoppingBag, badge: cartItems.length },
            { id: "profile", label: "Conta", icon: User },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex flex-col items-center gap-1 transition-colors ${
                  isActive ? "text-yellow-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-bold text-zinc-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* MODAL DE PRODUTO SELECIONADO */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center p-0 sm:p-4">
            <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] sm:rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl animate-in slide-in-from-bottom duration-300">
              
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">{selectedProduct.nome}</h3>
                    {selectedProduct.categoria_nome && (
                      <span className="text-[10px] font-medium text-yellow-400">{selectedProduct.categoria_nome}</span>
                    )}
                  </div>
                  <span className="text-base font-black text-yellow-400">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(selectedProduct.preco))}
                  </span>
                </div>
                {selectedProduct.descricao && (
                  <p className="text-xs text-zinc-400">{selectedProduct.descricao}</p>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Observações do Pedido (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Sem cebola, caprichar no queijo..."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sticky Bottom: Seletor de Quantidade + Botão Adicionar */}
              <div className="flex items-center gap-3 border-t border-zinc-800/80 bg-zinc-950 p-4">
                <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                  <button
                    onClick={() => setProductQty(Math.max(1, productQty - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 active:scale-90"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-zinc-100">
                    {productQty}
                  </span>
                  <button
                    onClick={() => setProductQty(productQty + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 active:scale-90"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 rounded-2xl bg-yellow-400 py-3 text-center text-xs font-black text-zinc-950 shadow-lg shadow-yellow-400/20 active:scale-95 transition-transform"
                >
                  Adicionar ao Carrinho •{" "}
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    Number(selectedProduct.preco) * productQty
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
