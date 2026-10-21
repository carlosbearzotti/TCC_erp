"use client";

import { notify, askConfirm } from "@/components/ui/feedback";
import React, { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { api, fetcher, fetcherResults } from "@/services/api";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Filter,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  RefreshCw,
  Search,
  X,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Download,
} from "lucide-react";
import { downloadCsv, csvMoney } from "@/lib/csv";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Category {
  id: number;
  name: string;
  type: "receita" | "despesa";
  description?: string;
}

interface Lancamento {
  id: number;
  type: "receita" | "despesa";
  value: string | number;
  description: string;
  date: string;
  payment_method: string;
  category: number;
  category_name?: string;
  category_details?: Category;
  responsible?: number;
  responsible_name?: string;
  pedido?: number | null;
}

interface Resumo {
  total_receitas: string | number;
  total_despesas: string | number;
  saldo: string | number;
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_debito: "Cartão Débito",
  cartao_credito: "Cartão Crédito",
  pix: "Pix",
  outros: "Outros",
};

export default function FinancePage() {
  // Estados de Filtro
  const [periodo, setPeriodo] = useState<"hoje" | "7d" | "mes" | "ano" | "todos" | "custom">("mes");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "receita" | "despesa">("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Modais
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Novo Lançamento
  const [formType, setFormType] = useState<"receita" | "despesa">("receita");
  const [formValue, setFormValue] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>("pix");

  // Form Nova Categoria
  const [newCatName, setNewCatName] = useState<string>("");
  const [newCatType, setNewCatType] = useState<"receita" | "despesa">("despesa");
  const [newCatDesc, setNewCatDesc] = useState<string>("");

  // Determinar datas conforme período selecionado
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    const today = new Date();

    if (periodo === "hoje") {
      const dateStr = today.toISOString().split("T")[0];
      params.append("inicio", dateStr);
      params.append("fim", dateStr);
    } else if (periodo === "7d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      params.append("inicio", past.toISOString().split("T")[0]);
      params.append("fim", today.toISOString().split("T")[0]);
    } else if (periodo === "mes") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      params.append("inicio", firstDay.toISOString().split("T")[0]);
      params.append("fim", today.toISOString().split("T")[0]);
    } else if (periodo === "ano") {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      params.append("inicio", firstDay.toISOString().split("T")[0]);
      params.append("fim", today.toISOString().split("T")[0]);
    } else if (periodo === "custom") {
      if (dataInicio) params.append("inicio", dataInicio);
      if (dataFim) params.append("fim", dataFim);
    }

    if (tipoFiltro !== "todos") {
      params.append("tipo", tipoFiltro);
    }
    if (categoriaFiltro) {
      params.append("categoria", categoriaFiltro);
    }

    return params.toString();
  }, [periodo, dataInicio, dataFim, tipoFiltro, categoriaFiltro]);

  const summaryParams = useMemo(() => {
    const params = new URLSearchParams();
    const today = new Date();

    if (periodo === "hoje") {
      const dateStr = today.toISOString().split("T")[0];
      params.append("inicio", dateStr);
      params.append("fim", dateStr);
    } else if (periodo === "7d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      params.append("inicio", past.toISOString().split("T")[0]);
      params.append("fim", today.toISOString().split("T")[0]);
    } else if (periodo === "mes") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      params.append("inicio", firstDay.toISOString().split("T")[0]);
      params.append("fim", today.toISOString().split("T")[0]);
    } else if (periodo === "ano") {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      params.append("inicio", firstDay.toISOString().split("T")[0]);
      params.append("fim", today.toISOString().split("T")[0]);
    } else if (periodo === "custom") {
      if (dataInicio) params.append("inicio", dataInicio);
      if (dataFim) params.append("fim", dataFim);
    }

    return params.toString();
  }, [periodo, dataInicio, dataFim]);

  // Consultas SWR
  const summaryUrl = `/finance/summary/${summaryParams ? `?${summaryParams}` : ""}`;
  const lancamentosUrl = `/finance/lancamentos/${queryParams ? `?${queryParams}` : ""}`;

  const { data: resumo, isLoading: loadingResumo } = useSWR<Resumo>(summaryUrl, fetcher);
  const { data: lancamentosRaw, isLoading: loadingLancamentos } = useSWR<any>(lancamentosUrl, fetcher);
  const { data: categoriesRaw } = useSWR<any>("/finance/categories/", fetcher);

  // Extrair arrays com segurança
  const lancamentos: Lancamento[] = useMemo(() => {
    if (!lancamentosRaw) return [];
    if (Array.isArray(lancamentosRaw)) return lancamentosRaw;
    if (lancamentosRaw.results && Array.isArray(lancamentosRaw.results)) return lancamentosRaw.results;
    return [];
  }, [lancamentosRaw]);

  const categories: Category[] = useMemo(() => {
    if (!categoriesRaw) return [];
    if (Array.isArray(categoriesRaw)) return categoriesRaw;
    if (categoriesRaw.results && Array.isArray(categoriesRaw.results)) return categoriesRaw.results;
    return [];
  }, [categoriesRaw]);

  // Filtro de texto no frontend
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((l) => {
      const matchSearch =
        search === "" ||
        l.description.toLowerCase().includes(search.toLowerCase()) ||
        (l.category_name && l.category_name.toLowerCase().includes(search.toLowerCase())) ||
        (l.responsible_name && l.responsible_name.toLowerCase().includes(search.toLowerCase()));
      return matchSearch;
    });
  }, [lancamentos, search]);

  const exportCsv = () => {
    const rows: unknown[][] = [
      ["Data", "Tipo (Receita/Despesa)", "Categoria", "Descrição", "Forma de Pagamento", "Valor (R$)", "Responsável"],
    ];
    let receitas = 0;
    let despesas = 0;
    filteredLancamentos.forEach((l) => {
      const v = Number(l.value) || 0;
      if (l.type === "receita") receitas += v;
      else despesas += v;
      rows.push([
        l.date.split("-").reverse().join("/"),
        l.type === "receita" ? "Receita" : "Despesa",
        l.category_name || "",
        l.description,
        PAYMENT_LABELS[l.payment_method] || l.payment_method,
        csvMoney(v),
        l.responsible_name || "Sistema",
      ]);
    });
    rows.push([]);
    rows.push(["", "", "", "", "Total de Receitas", csvMoney(receitas), ""]);
    rows.push(["", "", "", "", "Total de Despesas", csvMoney(despesas), ""]);
    rows.push(["", "", "", "", "Saldo Líquido", csvMoney(receitas - despesas), ""]);
    downloadCsv(`relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  // Dados para Gráfico de Fluxo de Caixa por Data
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; receitas: number; despesas: number }> = {};
    lancamentos.forEach((l) => {
      const d = l.date || "N/D";
      if (!map[d]) {
        map[d] = { date: d, receitas: 0, despesas: 0 };
      }
      const val = Number(l.value) || 0;
      if (l.type === "receita") {
        map[d].receitas += val;
      } else {
        map[d].despesas += val;
      }
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [lancamentos]);

  // Formatação
  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val) || 0;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Handlers
  const handleCreateLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numVal = parseFloat(formValue.replace(",", "."));
    if (isNaN(numVal) || numVal <= 0) {
      setErrorMessage("Informe um valor numérico válido e maior que zero.");
      return;
    }
    if (!formCategory) {
      setErrorMessage("Selecione uma categoria financeira.");
      return;
    }
    if (!formDescription.trim()) {
      setErrorMessage("A descrição é obrigatória.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/finance/lancamentos/", {
        type: formType,
        value: numVal.toFixed(2),
        description: formDescription.trim(),
        date: formDate,
        payment_method: formPaymentMethod,
        category: parseInt(formCategory),
      });

      setSuccessMessage("Lançamento cadastrado com sucesso!");
      setFormValue("");
      setFormDescription("");
      setShowNewModal(false);
      mutate(summaryUrl);
      mutate(lancamentosUrl);
    } catch (err: any) {
      const errData = err.response?.data;
      if (typeof errData === "object") {
        const firstKey = Object.keys(errData)[0];
        setErrorMessage(`${firstKey}: ${errData[firstKey]}`);
      } else {
        setErrorMessage("Erro ao salvar lançamento financeiro.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLancamento = async (id: number) => {
    if (!(await askConfirm("Tem certeza que deseja excluir este lançamento financeiro?"))) return;

    try {
      await api.delete(`/finance/lancamentos/${id}/`);
      mutate(summaryUrl);
      mutate(lancamentosUrl);
    } catch (err: any) {
      notify("Erro ao excluir lançamento: " + (err.response?.data?.detail || "Erro inesperado"));
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await api.post("/finance/categories/", {
        name: newCatName.trim(),
        type: newCatType,
        description: newCatDesc.trim(),
      });
      setNewCatName("");
      setNewCatDesc("");
      mutate("/finance/categories/");
    } catch (err: any) {
      notify("Erro ao cadastrar categoria: " + (err.response?.data?.name || "Já existe ou inválida"));
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!(await askConfirm("Excluir esta categoria financeira?"))) return;

    try {
      await api.delete(`/finance/categories/${id}/`);
      mutate("/finance/categories/");
    } catch (err: any) {
      notify(err.response?.data?.detail || "Não é possível excluir uma categoria que possui lançamentos.");
    }
  };

  const totalReceitas = Number(resumo?.total_receitas) || 0;
  const totalDespesas = Number(resumo?.total_despesas) || 0;
  const saldoLiquido = Number(resumo?.saldo) || 0;

  return (
    <div className="flex min-h-full w-full flex-col bg-zinc-950 p-6 text-zinc-100">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 font-bold text-zinc-950 shadow-lg shadow-yellow-400/20">
              <DollarSign className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Gestão Financeira
            </h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Controle completo de receitas, despesas, conciliação e fluxo de caixa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              mutate(summaryUrl);
              mutate(lancamentosUrl);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Layers className="h-3.5 w-3.5 text-yellow-400" />
            <span>Categorias</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-yellow-400/20 transition-all hover:bg-yellow-300"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Receita Total */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-950/40 bg-zinc-900/90 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Receitas Realizadas
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black tracking-tight text-emerald-400">
              {loadingResumo ? "..." : formatCurrency(totalReceitas)}
            </span>
          </div>
          <div className="mt-2 flex items-center text-xs text-zinc-500">
            <span>Entradas de pedidos e vendas</span>
          </div>
        </div>

        {/* Despesa Total */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-950/40 bg-zinc-900/90 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Despesas &amp; Custos
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black tracking-tight text-rose-400">
              {loadingResumo ? "..." : formatCurrency(totalDespesas)}
            </span>
          </div>
          <div className="mt-2 flex items-center text-xs text-zinc-500">
            <span>Insumos, compras e custos operacionais</span>
          </div>
        </div>

        {/* Saldo Líquido */}
        <div
          className={`relative overflow-hidden rounded-2xl border bg-zinc-900/90 p-5 shadow-xl ${
            saldoLiquido >= 0 ? "border-yellow-400/20" : "border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
              Saldo Líquido
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-black tracking-tight ${
                saldoLiquido >= 0 ? "text-yellow-400" : "text-rose-400"
              }`}
            >
              {loadingResumo ? "..." : formatCurrency(saldoLiquido)}
            </span>
          </div>
          <div className="mt-2 flex items-center text-xs text-zinc-500">
            <span>{saldoLiquido >= 0 ? "Resultado positivo no período" : "Déficit no período selecionado"}</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      {chartData.length > 0 && (
        <div className="mb-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Fluxo Diário: Receitas vs Despesas</h3>
              <p className="text-xs text-zinc-500">Evolução temporal das movimentações financeiras</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Receitas
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Despesas
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "12px",
                    color: "#f4f4f5",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => formatCurrency(val)}
                />
                <Bar dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
                <Bar dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="mb-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-4 shadow-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Abas Rápidas de Período */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "hoje", label: "Hoje" },
              { key: "7d", label: "7 Dias" },
              { key: "mes", label: "Mês Atual" },
              { key: "ano", label: "Ano" },
              { key: "todos", label: "Tudo" },
              { key: "custom", label: "Personalizado" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPeriodo(tab.key as any)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  periodo === tab.key
                    ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-400/20"
                    : "border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filtro por Tipo */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Tipo:</span>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as any)}
              className="h-8 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 focus:border-yellow-400 focus:outline-none"
            >
              <option value="todos">Todos os tipos</option>
              <option value="receita">Apenas Receitas</option>
              <option value="despesa">Apenas Despesas</option>
            </select>

            {/* Filtro por Categoria */}
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="h-8 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 focus:border-yellow-400 focus:outline-none"
            >
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha adicional se período personalizado */}
        {periodo === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-zinc-800/60 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">De:</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-8 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Até:</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-8 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Busca por Texto */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por descrição, categoria ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-4 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-yellow-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/80 shadow-xl">
        <div className="border-b border-zinc-800/80 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-100">
            Lançamentos ({filteredLancamentos.length})
          </h2>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-zinc-500">
              Exibindo dados sincronizados com o backend
            </span>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredLancamentos.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-yellow-400/60 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-950 transition-colors disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar Relatório (CSV)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800/60 bg-zinc-950/40 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Forma Pagto</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
              {loadingLancamentos ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : filteredLancamentos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLancamentos.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-zinc-800/40">
                    <td className="py-3 px-4 font-mono text-zinc-400">{formatDate(l.date)}</td>
                    <td className="py-3 px-4">
                      {l.type === "receita" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          <ArrowUpRight className="h-3 w-3" /> Receita
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/20">
                          <ArrowDownRight className="h-3 w-3" /> Despesa
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-100">
                      {l.description}
                      {l.pedido && (
                        <span className="ml-2 rounded-md bg-yellow-400/10 px-1.5 py-0.5 text-xs font-bold text-yellow-400">
                          Pedido #{l.pedido}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {l.category_name || (l.category_details ? l.category_details.name : `Cat #${l.category}`)}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {PAYMENT_LABELS[l.payment_method] || l.payment_method}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {l.responsible_name || "Sistema"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-100">
                      <span className={l.type === "receita" ? "text-emerald-400" : "text-rose-400"}>
                        {l.type === "receita" ? "+" : "-"} {formatCurrency(l.value)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteLancamento(l.id)}
                        className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Lançamento */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="mb-1 text-lg font-bold text-zinc-100">Registrar Novo Lançamento</h3>
            <p className="mb-4 text-xs text-zinc-400">
              Adicione uma receita ou despesa manual ao fluxo financeiro.
            </p>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateLancamento} className="space-y-4 text-xs">
              {/* Toggle Tipo */}
              <div>
                <label className="mb-1.5 block font-semibold text-zinc-300">Tipo de Movimentação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("receita");
                      setFormCategory("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition-all ${
                      formType === "receita"
                        ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                        : "border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" /> Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("despesa");
                      setFormCategory("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition-all ${
                      formType === "despesa"
                        ? "bg-rose-500 text-zinc-950 shadow-md shadow-rose-500/20"
                        : "border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    <ArrowDownRight className="h-4 w-4" /> Despesa
                  </button>
                </div>
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="f-appfinancepage-1" className="mb-1 block font-semibold text-zinc-300">Valor (R$)*</label>
                  <input id="f-appfinancepage-1"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="f-appfinancepage-2" className="mb-1 block font-semibold text-zinc-300">Data*</label>
                  <input id="f-appfinancepage-2"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-semibold text-zinc-300">Categoria Financeira*</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewModal(false);
                      setShowCatModal(true);
                    }}
                    className="text-xs text-yellow-400 hover:underline"
                  >
                    + Criar categoria
                  </button>
                </div>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories
                    .filter((c) => c.type === formType)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label htmlFor="f-appfinancepage-3" className="mb-1 block font-semibold text-zinc-300">Descrição*</label>
                <input id="f-appfinancepage-3"
                  type="text"
                  required
                  placeholder="Ex: Pagamento Fornecedor de Embalagens"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label htmlFor="f-appfinancepage-4" className="mb-1 block font-semibold text-zinc-300">Forma de Pagamento</label>
                <select id="f-appfinancepage-4"
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                >
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botões de Ação */}
              <div className="mt-6 flex justify-end gap-2 border-t border-zinc-800/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-yellow-400 px-5 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-yellow-400/20 hover:bg-yellow-300 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Categorias */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowCatModal(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="mb-1 text-lg font-bold text-zinc-100">Categorias Financeiras</h3>
            <p className="mb-4 text-xs text-zinc-400">
              Gerencie as categorias de receitas e despesas do estabelecimento.
            </p>

            {/* Formulário Nova Categoria */}
            <form
              onSubmit={handleCreateCategory}
              className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs space-y-3"
            >
              <h4 className="font-bold text-zinc-200">Adicionar Nova Categoria</h4>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome (ex: Marketing)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="col-span-2 h-9 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 focus:outline-none"
                />
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="h-9 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Descrição opcional..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="flex-1 h-9 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-xl bg-yellow-400 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-yellow-300"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
            </form>

            {/* Lista de Categorias */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Categorias Cadastradas ({categories.length})
              </h4>
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-200">{c.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                          c.type === "receita"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {c.type}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-zinc-500 mt-0.5">{c.description}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    title="Excluir categoria"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end border-t border-zinc-800/60 pt-3">
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
