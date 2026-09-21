"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  ShieldCheck, 
  KeyRound, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Sliders, 
  Info,
  Lock,
  Sparkles,
  Users,
  Shield
} from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import api from "@/services/api";

interface RoleOption {
  key: string;
  label: string;
  readonly?: boolean;
}

interface PermissaoItem {
  id: number;
  codigo: string;
  descricao: string;
  roles: string[];
}

interface ModuloGroup {
  modulo: string;
  permissoes: PermissaoItem[];
}

interface MatrixResponse {
  roles: RoleOption[];
  modulos: ModuloGroup[];
}

export default function PermissoesPage() {
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.get<MatrixResponse>("/users/rbac/matrix/");
      setMatrixData(res.data);
    } catch (err: any) {
      console.error("Erro ao buscar matriz de permissões:", err);
      showToast("error", err.response?.data?.detail || "Erro ao carregar matriz de permissões.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleToggle = async (role: string, codigo: string, currentStatus: boolean) => {
    // Evita revogar GERENCIAR_USUARIOS do administrador
    if (role === "administrador" && codigo === "GERENCIAR_USUARIOS" && currentStatus) {
      showToast("error", "Não é permitido revogar a permissão de gerenciamento de usuários do administrador.");
      return;
    }

    const key = `${role}-${codigo}`;
    setUpdatingKey(key);
    const newStatus = !currentStatus;

    // Atualização otimista no estado local
    setMatrixData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modulos: prev.modulos.map((mod) => ({
          ...mod,
          permissoes: mod.permissoes.map((p) => {
            if (p.codigo !== codigo) return p;
            const updatedRoles = newStatus
              ? Array.from(new Set([...p.roles, role]))
              : p.roles.filter((r) => r !== role);
            return { ...p, roles: updatedRoles };
          }),
        })),
      };
    });

    try {
      const res = await api.post("/users/rbac/toggle/", {
        role,
        permissao_codigo: codigo,
        conceder: newStatus,
      });
      showToast("success", res.data?.message || `Permissão ${codigo} atualizada para ${role}.`);
    } catch (err: any) {
      // Reverter atualização otimista em caso de erro
      console.error("Erro ao salvar permissão:", err);
      setMatrixData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modulos: prev.modulos.map((mod) => ({
            ...mod,
            permissoes: mod.permissoes.map((p) => {
              if (p.codigo !== codigo) return p;
              const revertedRoles = currentStatus
                ? Array.from(new Set([...p.roles, role]))
                : p.roles.filter((r) => r !== role);
              return { ...p, roles: revertedRoles };
            }),
          })),
        };
      });
      showToast("error", err.response?.data?.detail || "Falha ao atualizar permissão no servidor.");
    } finally {
      setUpdatingKey(null);
    }
  };

  // Filtragem
  const filteredModulos = useMemo(() => {
    if (!matrixData || !Array.isArray(matrixData.modulos)) return [];
    if (!searchTerm.trim()) return matrixData.modulos;

    const term = searchTerm.toLowerCase();
    return matrixData.modulos
      .map((mod) => ({
        ...mod,
        permissoes: Array.isArray(mod.permissoes)
          ? mod.permissoes.filter(
              (p) =>
                p.codigo.toLowerCase().includes(term) ||
                p.descricao.toLowerCase().includes(term) ||
                mod.modulo.toLowerCase().includes(term)
            )
          : [],
      }))
      .filter((mod) => mod.permissoes.length > 0);
  }, [matrixData, searchTerm]);

  // Contadores
  const totalPermissoes = useMemo(() => {
    if (!matrixData || !Array.isArray(matrixData.modulos)) return 0;
    return matrixData.modulos.reduce(
      (acc, m) => acc + (Array.isArray(m.permissoes) ? m.permissoes.length : 0),
      0
    );
  }, [matrixData]);

  const roleColors: Record<string, string> = {
    administrador: "bg-red-500/10 text-red-400 border-red-500/30",
    atendente: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    cozinheiro: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    entregador: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    cliente: "bg-zinc-800 text-zinc-300 border-zinc-700",
  };

  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-zinc-950 p-6 text-zinc-100">
        <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400 shadow-lg shadow-yellow-400/10">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-zinc-50">
                    Matriz de Permissões (RBAC)
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                    <Sparkles className="h-3 w-3" /> Dinâmico
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Controle granular de acessos por perfil. As alterações entram em vigor instantaneamente em todo o ERP.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchMatrix}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-yellow-400" : ""}`} />
              Atualizar Matriz
            </button>
          </div>

          {/* Toast de Feedback */}
          {toastMessage && (
            <div
              className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-medium transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
                toastMessage.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          )}

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">Perfis Mapeados</span>
                <Users className="h-4 w-4 text-yellow-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-100">
                {matrixData?.roles.length || 0} <span className="text-xs font-normal text-zinc-500">roles</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">Admin, Atendente, Cozinheiro, Entregador e Cliente</p>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">Ações Granulares</span>
                <KeyRound className="h-4 w-4 text-yellow-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-100">
                {totalPermissoes} <span className="text-xs font-normal text-zinc-500">permissões</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">Distribuídas em módulos operacionais e administrativos</p>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">Segurança da API</span>
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-emerald-400">Guards Ativos (403)</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Bloqueio tanto no Frontend quanto nas Views do Backend</p>
            </div>
          </div>

          {/* Barra de Busca e Filtro */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar funcionalidade, código ou módulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              />
            </div>
          </div>

          {/* Tabela Matriz */}
          {loading && !matrixData ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-yellow-400" />
              <p className="mt-3 text-xs font-semibold text-zinc-400">Carregando matriz de permissões do sistema...</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 shadow-xl shadow-black/40">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/80">
                      <th className="min-w-[280px] p-4 font-semibold text-zinc-300">
                        Funcionalidade / Ação
                      </th>
                      {matrixData?.roles.map((r) => (
                        <th key={r.key} className="min-w-[120px] p-4 text-center font-semibold">
                          <span
                            className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-bold capitalize ${
                              roleColors[r.key] || "border-zinc-700 bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {r.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredModulos.map((mod) => (
                      <React.Fragment key={mod.modulo}>
                        {/* Header do Módulo */}
                        <tr className="bg-zinc-900/90">
                          <td
                            colSpan={(matrixData?.roles.length || 0) + 1}
                            className="p-3 text-[11px] font-black uppercase tracking-wider text-yellow-400"
                          >
                            <div className="flex items-center gap-2">
                              <Sliders className="h-3.5 w-3.5" />
                              Módulo: {mod.modulo}
                            </div>
                          </td>
                        </tr>

                        {/* Linhas de Permissões */}
                        {mod.permissoes.map((perm) => (
                          <tr
                            key={perm.codigo}
                            className="transition-colors hover:bg-zinc-800/30"
                          >
                            <td className="p-4 align-middle">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-zinc-100">
                                    {perm.codigo}
                                  </span>
                                </div>
                                <span className="text-[11px] text-zinc-400">
                                  {perm.descricao}
                                </span>
                              </div>
                            </td>

                            {/* Células de Roles com Switches */}
                            {matrixData?.roles.map((role) => {
                              const hasPerm = perm.roles.includes(role.key);
                              const isUpdating = updatingKey === `${role.key}-${perm.codigo}`;
                              const isLocked = role.key === "administrador" && perm.codigo === "GERENCIAR_USUARIOS";
                              const isReadonly = !!role.readonly;

                              return (
                                <td key={role.key} className="p-4 text-center align-middle">
                                  <div className="flex items-center justify-center">
                                    <button
                                      type="button"
                                      disabled={isUpdating || isLocked || isReadonly}
                                      onClick={() => handleToggle(role.key, perm.codigo, hasPerm)}
                                      title={
                                        isReadonly
                                          ? "Permissões do cliente são pré-definidas e não editáveis"
                                          : isLocked
                                          ? "Permissão essencial e obrigatória para o Administrador"
                                          : hasPerm
                                          ? `Revogar ${perm.codigo} de ${role.label}`
                                          : `Conceder ${perm.codigo} para ${role.label}`
                                      }
                                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
                                        isReadonly
                                          ? "cursor-not-allowed bg-zinc-800 opacity-50"
                                          : isLocked
                                          ? "cursor-not-allowed bg-yellow-400/40 opacity-70"
                                          : isUpdating
                                          ? "bg-zinc-700 opacity-60"
                                          : hasPerm
                                          ? "bg-yellow-400"
                                          : "bg-zinc-800 hover:bg-zinc-700"
                                      }`}
                                    >
                                      <span className="sr-only">Alternar permissão</span>
                                      <span
                                        className={`pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                                          hasPerm ? "translate-x-5" : "translate-x-0"
                                        }`}
                                      >
                                        {isLocked ? (
                                          <Lock className="h-2.5 w-2.5 text-yellow-400" />
                                        ) : isUpdating ? (
                                          <RefreshCw className="h-2.5 w-2.5 animate-spin text-zinc-400" />
                                        ) : hasPerm ? (
                                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                        ) : (
                                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                        )}
                                      </span>
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredModulos.length === 0 && (
                <div className="p-8 text-center text-xs text-zinc-500">
                  Nenhuma permissão encontrada com o termo &quot;{searchTerm}&quot;.
                </div>
              )}
            </div>
          )}

          {/* Dica de Boas Práticas */}
          <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs text-zinc-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <div className="space-y-1">
              <p className="font-semibold text-zinc-200">Como funciona o controle de RBAC no ERP:</p>
              <p>
                Quando você altera um botão nesta matriz, o vínculo é imediatamente persistido no banco de dados. 
                Os validadores de segurança no Backend rejeitarão qualquer chamada com código <strong>403 Forbidden</strong> caso o perfil não possua acesso. 
                No Frontend, botões sensíveis (como Cancelar Pedido e Fechar Caixa) desaparecem dinamicamente da tela do colaborador correspondente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
