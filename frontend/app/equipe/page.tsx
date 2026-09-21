"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, fetcher } from "@/services/api";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  Users,
  ShieldCheck,
  Clock,
  History,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Search,
  Filter,
  Eye,
  Lock,
  UserPlus,
  RefreshCw,
} from "lucide-react";

interface Funcionario {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "administrador" | "atendente" | "cozinheiro" | "entregador" | "cliente";
  is_online: boolean;
  is_active: boolean;
  date_joined: string;
}

interface Turno {
  id: number;
  user: number;
  username: string;
  user_nome: string;
  user_role: string;
  inicio: string;
  fim: string | null;
  saldo_dinheiro: string | number;
  acerto_confirmado: boolean;
  duracao_minutos: number;
}

interface AuditoriaItem {
  id: number;
  user: number;
  username: string;
  acao: string;
  entidade: string;
  entidade_id: number;
  detalhes: string;
  data: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  administrador: { label: "Administrador", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  atendente: { label: "Atendente", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  cozinheiro: { label: "Cozinheiro", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  entregador: { label: "Entregador", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  cliente: { label: "Cliente", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

export default function EquipePage() {
  const [activeTab, setActiveTab] = useState<"equipe" | "turnos" | "auditoria">("equipe");
  const [search, setSearch] = useState("");

  // Modal Funcionário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<string>("atendente");
  const [submitting, setSubmitting] = useState(false);

  // SWR Fetching
  const { data: funcionarios, mutate: mutateFuncionarios } = useSWR<Funcionario[]>(
    "/users/funcionarios/",
    fetcher
  );
  const { data: turnos, mutate: mutateTurnos } = useSWR<Turno[]>(
    "/core/turnos/",
    fetcher,
    { refreshInterval: 10000 }
  );
  const { data: auditoria } = useSWR<AuditoriaItem[]>(
    "/core/auditoria/",
    fetcher,
    { refreshInterval: 10000 }
  );

  const openCreateModal = () => {
    setEditingFuncionario(null);
    setFormUsername("");
    setFormFirstName("");
    setFormLastName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("atendente");
    setIsModalOpen(true);
  };

  const openEditModal = (func: Funcionario) => {
    setEditingFuncionario(func);
    setFormUsername(func.username);
    setFormFirstName(func.first_name);
    setFormLastName(func.last_name);
    setFormEmail(func.email);
    setFormPassword("");
    setFormRole(func.role);
    setIsModalOpen(true);
  };

  const handleSaveFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        username: formUsername,
        first_name: formFirstName,
        last_name: formLastName,
        email: formEmail,
        role: formRole,
      };
      if (formPassword) payload.password = formPassword;

      if (editingFuncionario) {
        await api.patch(`/users/funcionarios/${editingFuncionario.id}/`, payload);
      } else {
        await api.post("/users/funcionarios/", payload);
      }

      await mutateFuncionarios();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao salvar funcionário.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (func: Funcionario) => {
    try {
      await api.patch(`/users/funcionarios/${func.id}/`, {
        is_active: !func.is_active,
      });
      await mutateFuncionarios();
    } catch (err: any) {
      alert("Erro ao alterar status do funcionário.");
    }
  };

  const handleConfirmarAcerto = async (turnoId: number) => {
    if (!confirm("Confirmar o recebimento do dinheiro deste entregador?")) return;
    try {
      await api.post(`/core/turnos/${turnoId}/confirmar-acerto/`);
      await mutateTurnos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao confirmar acerto.");
    }
  };

  return (
    <AuthGuard allowedRoles={["administrador"]}>
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-yellow-400" />
            Gestão de Equipe &amp; Auditoria
          </h1>
          <p className="text-sm text-zinc-400">
            Controle de funcionários, registro de turnos/ponto e histórico de ações críticas.
          </p>
        </div>

        {activeTab === "equipe" && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-lg shadow-yellow-400/20 hover:bg-yellow-300 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>Novo Funcionário</span>
          </button>
        )}
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("equipe")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "equipe"
              ? "border-yellow-400 text-yellow-400 bg-yellow-400/5"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Equipe &amp; Acessos ({funcionarios?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("turnos")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "turnos"
              ? "border-yellow-400 text-yellow-400 bg-yellow-400/5"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Turnos &amp; Ponto ({turnos?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("auditoria")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "auditoria"
              ? "border-yellow-400 text-yellow-400 bg-yellow-400/5"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Trilha de Auditoria ({auditoria?.length || 0})</span>
        </button>
      </div>

      {/* ABA 1: EQUIPE & ACESSOS */}
      {activeTab === "equipe" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(Array.isArray(funcionarios) ? funcionarios : []).map((func) => {
            const roleInfo = ROLE_LABELS[func.role] || { label: func.role, color: "bg-zinc-800 text-zinc-300" };
            return (
              <div
                key={func.id}
                className={`rounded-2xl border bg-zinc-900/60 p-5 shadow-sm transition-all hover:border-zinc-700 ${
                  func.is_active ? "border-zinc-800" : "border-red-950/40 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-zinc-200 font-bold">
                      {func.first_name?.[0]?.toUpperCase() || func.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100">
                        {func.first_name ? `${func.first_name} ${func.last_name}` : func.username}
                      </h3>
                      <p className="text-xs text-zinc-400">@{func.username}</p>
                    </div>
                  </div>

                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>

                <div className="mt-4 space-y-2 border-t border-zinc-800/60 pt-3 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>E-mail:</span>
                    <span className="text-zinc-200 font-medium">{func.email || "Não informado"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Disponibilidade:</span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-medium ${
                        func.is_online ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${func.is_online ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}
                      />
                      {func.is_online ? "Disponível (Online)" : "Indisponível"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3">
                  <button
                    onClick={() => handleToggleActive(func)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      func.is_active
                        ? "border-red-500/30 text-red-400 hover:bg-red-950/30"
                        : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30"
                    }`}
                  >
                    {func.is_active ? "Desativar" : "Reativar"}
                  </button>

                  <button
                    onClick={() => openEditModal(func)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ABA 2: TURNOS & PONTO */}
      {activeTab === "turnos" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-sm">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-5 py-3.5">Funcionário</th>
                  <th className="px-5 py-3.5">Início</th>
                  <th className="px-5 py-3.5">Fim / Duração</th>
                  <th className="px-5 py-3.5">Saldo Dinheiro</th>
                  <th className="px-5 py-3.5">Acerto de Caixa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {(Array.isArray(turnos) ? turnos : []).map((turno) => {
                  const isAberto = !turno.fim;
                  return (
                    <tr key={turno.id} className="hover:bg-zinc-800/20">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-zinc-100">{turno.user_nome}</div>
                        <div className="text-xs text-zinc-500">@{turno.username} • {turno.user_role}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-zinc-200 font-medium">
                          {new Date(turno.inicio).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {new Date(turno.inicio).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {isAberto ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Em Turno ({turno.duracao_minutos} min)
                          </span>
                        ) : (
                          <div>
                            <span className="text-zinc-300">
                              {new Date(turno.fim!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="ml-2 text-xs text-zinc-500">({turno.duracao_minutos} min)</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-zinc-100">
                        R$ {Number(turno.saldo_dinheiro).toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        {Number(turno.saldo_dinheiro) > 0 ? (
                          turno.acerto_confirmado ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" /> Confirmado
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConfirmarAcerto(turno.id)}
                              className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-950 transition-colors"
                            >
                              Confirmar Acerto
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-zinc-500">Sem pendências</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: TRILHA DE AUDITORIA */}
      {activeTab === "auditoria" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-sm">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-5 py-3.5">Data / Hora</th>
                  <th className="px-5 py-3.5">Usuário</th>
                  <th className="px-5 py-3.5">Ação Realizada</th>
                  <th className="px-5 py-3.5">Entidade Afetada</th>
                  <th className="px-5 py-3.5">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {(Array.isArray(auditoria) ? auditoria : []).map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/20">
                    <td className="px-5 py-4 text-xs font-mono text-zinc-400">
                      {new Date(log.data).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-semibold text-zinc-200">
                      @{log.username}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-bold font-mono text-yellow-400 border border-zinc-700">
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-zinc-400">
                      {log.entidade} #{log.entidade_id}
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-300 max-w-md">
                      {log.detalhes || "Nenhum detalhe adicional"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR FUNCIONÁRIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-400" />
              {editingFuncionario ? "Editar Funcionário" : "Cadastrar Novo Funcionário"}
            </h2>

            <form onSubmit={handleSaveFuncionario} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Username (Login)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingFuncionario}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Primeiro Nome</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Sobrenome</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Cargo / Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="atendente">Atendente</option>
                  <option value="cozinheiro">Cozinheiro</option>
                  <option value="entregador">Entregador</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Senha {editingFuncionario && "(Deixe em branco para não alterar)"}
                </label>
                <input
                  type="password"
                  required={!editingFuncionario}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingFuncionario ? "••••••••" : "Mínimo 8 caracteres"}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-yellow-300 transition-colors"
                >
                  {submitting ? "Salvando..." : "Salvar Funcionário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}
