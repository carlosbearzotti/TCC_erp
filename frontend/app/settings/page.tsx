"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api, { BACKEND_ORIGIN } from "../../services/api";
import { useBranding } from "../../hooks/useBranding";
import { 
  Settings, 
  Store, 
  Clock, 
  Truck, 
  Bell, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Bot,
  DollarSign,
  ArrowRight,
  KeyRound
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "delivery" | "rpa" | "security">("general");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const { nome: brandName, refresh: refreshBrand } = useBranding();
  const [storeName, setStoreName] = useState(brandName);
  const [saveError, setSaveError] = useState("");
  useEffect(() => setStoreName(brandName), [brandName]);
  const [storePhone, setStorePhone] = useState("(11) 98765-4321");
  const [storeAddress, setStoreAddress] = useState("Av. Principal, 1234 - Centro");
  const [deliveryFee, setDeliveryFee] = useState("5.00");
  const [deliveryTime, setDeliveryTime] = useState("35-45");
  const [minOrder, setMinOrder] = useState("15.00");
  const [acceptOnlineOrders, setAcceptOnlineOrders] = useState(true);
  
  // RPA states
  const [rpaInterval, setRpaInterval] = useState("15");
  const [rpaAutoSync, setRpaAutoSync] = useState(true);
  const [rpaStockAlerts, setRpaStockAlerts] = useState(true);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    try {
      // Único campo persistido no banco por enquanto: o nome do estabelecimento
      await api.patch("/core/estabelecimento/", { nome: storeName });
      refreshBrand();
    } catch (err: any) {
      setSaveError(err.response?.data?.nome || "Não foi possível salvar o nome do estabelecimento.");
      return;
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              <Settings className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-50">
                Configurações do Sistema
              </h1>
              <p className="text-xs text-zinc-400">
                Gerencie os parâmetros operacionais, delivery, regras de automação RPA e segurança.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-yellow-400/20 transition-all hover:bg-yellow-300 active:scale-95"
          >
            <Save className="h-4 w-4" />
            Salvar Alterações
          </button>
        </div>

        {/* Feedback de Salvamento */}
        {savedSuccess && (
          <div className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-xs font-medium text-green-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Nome do estabelecimento atualizado em todo o sistema. Os demais campos desta tela ainda são ilustrativos.</span>
          </div>
        )}

        {saveError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400">
            {saveError}
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="flex gap-2 overflow-x-auto border-b border-zinc-800/80 pb-2 text-xs font-semibold">
          {[
            { id: "general", label: "Geral & Estabelecimento", icon: Store },
            { id: "delivery", label: "Pedidos & Delivery", icon: Truck },
            { id: "rpa", label: "Automação & RPA", icon: Bot },
            { id: "security", label: "Segurança & Acessos", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
                  isActive
                    ? "bg-yellow-400 text-zinc-950 font-bold shadow-md shadow-yellow-400/20"
                    : "border border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo das Configurações */}
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* TAB 1: GERAL */}
          {activeTab === "general" && (
            <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Store className="h-4 w-4 text-yellow-400" /> Dados do Estabelecimento
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="f-appsettingspage-1" className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Nome Fantasia <span className="text-xs text-emerald-400">(salvo no banco — aparece em todo o sistema e nos cupons)</span>
                  </label>
                  <input id="f-appsettingspage-1"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="f-appsettingspage-2" className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Telefone / WhatsApp de Atendimento
                  </label>
                  <input id="f-appsettingspage-2"
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="f-appsettingspage-3" className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Endereço Completo
                  </label>
                  <input id="f-appsettingspage-3"
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PEDIDOS & DELIVERY */}
          {activeTab === "delivery" && (
            <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Truck className="h-4 w-4 text-yellow-400" /> Parâmetros de Venda &amp; Entrega
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="f-appsettingspage-4" className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Taxa Padrão de Delivery (R$)
                  </label>
                  <input id="f-appsettingspage-4"
                    type="number"
                    step="0.50"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="f-appsettingspage-5" className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Tempo Estimado (minutos)
                  </label>
                  <input id="f-appsettingspage-5"
                    type="text"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="f-appsettingspage-6" className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Pedido Mínimo (R$)
                  </label>
                  <input id="f-appsettingspage-6"
                    type="number"
                    step="1.00"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-4">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition-colors hover:border-zinc-700">
                  <div>
                    <p className="text-xs font-bold text-zinc-100">Aceitar Pedidos Online no App do Cliente</p>
                    <p className="text-xs text-zinc-400">Permite que clientes façam pedidos em tempo real pela rota `/cliente`.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={acceptOnlineOrders}
                    onChange={(e) => setAcceptOnlineOrders(e.target.checked)}
                    className="h-5 w-5 accent-yellow-400 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: RPA & AUTOMAÇÃO */}
          {activeTab === "rpa" && (
            <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Bot className="h-4 w-4 text-yellow-400" /> Configurações do Motor RPA
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="f-appsettingspage-7" className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Frequência de Execução Automática
                  </label>
                  <select id="f-appsettingspage-7"
                    value={rpaInterval}
                    onChange={(e) => setRpaInterval(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="15">A cada 15 minutos (Recomendado)</option>
                    <option value="30">A cada 30 minutos</option>
                    <option value="60">A cada 1 hora</option>
                    <option value="manual">Apenas Manual</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 border-t border-zinc-800/80 pt-4">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 transition-colors hover:border-zinc-700">
                  <div>
                    <p className="text-xs font-bold text-zinc-100">Sincronização Automática de Comandas PDV</p>
                    <p className="text-xs text-zinc-400">Gera lançamentos contábeis assim que um pedido é marcado como entregue.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rpaAutoSync}
                    onChange={(e) => setRpaAutoSync(e.target.checked)}
                    className="h-5 w-5 accent-yellow-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 transition-colors hover:border-zinc-700">
                  <div>
                    <p className="text-xs font-bold text-zinc-100">Alerta de Insumos Críticos no Dashboard</p>
                    <p className="text-xs text-zinc-400">Notifica o operador no sininho e no painel quando insumos atingem o estoque mínimo.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rpaStockAlerts}
                    onChange={(e) => setRpaStockAlerts(e.target.checked)}
                    className="h-5 w-5 accent-yellow-400 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: SEGURANÇA */}
          {activeTab === "security" && (
            <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-yellow-400" /> Credenciais &amp; Acessos
              </h2>

              {/* Card Matriz de Permissões (RBAC) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-yellow-400" />
                    <p className="font-bold text-xs text-zinc-100">Matriz de Permissões (RBAC)</p>
                    <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-bold text-yellow-400">Novo</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Gerencie visualmente com switches quais papéis (Admin, Atendente, Cozinheiro, etc.) têm permissão para cancelar pedidos, ver faturamento ou editar estoque.
                  </p>
                </div>
                <Link
                  href="/permissoes"
                  className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-yellow-400/20 transition-all hover:bg-yellow-300 active:scale-95 shrink-0"
                >
                  Abrir Matriz
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-2 text-xs">
                <p className="font-bold text-zinc-200">Acesso Administrativo ao Django Admin</p>
                <p className="text-zinc-400">
                  Para gerenciar modelos do sistema em baixo nível, acesse o painel seguro do Django em{" "}
                  <a
                    href={`${BACKEND_ORIGIN}/admin/`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-yellow-400 underline hover:text-yellow-300"
                  >
                    {BACKEND_ORIGIN || (typeof window !== "undefined" ? window.location.origin : "")}/admin/
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Botão Inferior Salvar */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-xs font-bold text-zinc-950 shadow-lg shadow-yellow-400/20 transition-all hover:bg-yellow-300 active:scale-95"
            >
              <Save className="h-4 w-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
