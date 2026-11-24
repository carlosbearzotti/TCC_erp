"use client"

import { useEffect, useState } from "react"
import { ChevronRight, KeyRound, MapPin, UserRound } from "lucide-react"
import api from "@/services/api"
import { notify } from "@/components/ui/feedback"
import { useAuth } from "@/hooks/useAuth"

type Secao = null | "dados" | "endereco" | "senha"

const input =
  "h-12 w-full rounded-lg border border-line-strong bg-canvas px-3.5 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none"

/** Primeira mensagem de erro de uma resposta de validação do DRF. */
function erroApi(err: any, padrao: string): string {
  const data = err?.response?.data
  if (!data) return padrao
  if (typeof data.detail === "string") return data.detail
  const primeiro = Object.values(data)[0]
  return Array.isArray(primeiro) ? String(primeiro[0]) : padrao
}

/** "Minha conta" do cliente: dados pessoais, endereço padrão e troca de senha. */
export function MinhaConta() {
  const { user, refreshUser } = useAuth()
  const [aberta, setAberta] = useState<Secao>(null)
  const [salvando, setSalvando] = useState(false)

  const [dados, setDados] = useState({ first_name: "", last_name: "", email: "", telefone: "" })
  const [end, setEnd] = useState({ cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" })
  const [senha, setSenha] = useState({ senha_atual: "", nova_senha: "", confirmar: "" })

  useEffect(() => {
    if (!user) return
    setDados({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      telefone: user.telefone || "",
    })
    if (user.endereco) setEnd({ ...user.endereco })
  }, [user])

  const alternar = (s: Secao) => setAberta(aberta === s ? null : s)

  const salvar = async (payload: Record<string, string>, ok: string) => {
    setSalvando(true)
    try {
      await api.patch("/users/me/", payload)
      await refreshUser()
      notify(ok)
      setAberta(null)
    } catch (err) {
      notify(erroApi(err, "Não foi possível salvar."))
    } finally {
      setSalvando(false)
    }
  }

  const buscarCep = async (valor: string) => {
    setEnd((e) => ({ ...e, cep: valor }))
    const raw = valor.replace(/\D/g, "")
    if (raw.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const d = await res.json()
      if (!d.erro) {
        setEnd((e) => ({ ...e, logradouro: d.logradouro || e.logradouro, bairro: d.bairro || e.bairro, cidade: d.localidade || e.cidade, uf: d.uf || e.uf }))
      }
    } catch {
      // sem internet: o cliente preenche à mão
    }
  }

  const trocarSenha = async () => {
    if (senha.nova_senha !== senha.confirmar) {
      notify("A confirmação não confere com a nova senha.")
      return
    }
    setSalvando(true)
    try {
      await api.post("/users/me/senha/", { senha_atual: senha.senha_atual, nova_senha: senha.nova_senha })
      notify("Senha alterada com sucesso.")
      setSenha({ senha_atual: "", nova_senha: "", confirmar: "" })
      setAberta(null)
    } catch (err) {
      notify(erroApi(err, "Não foi possível alterar a senha."))
    } finally {
      setSalvando(false)
    }
  }

  if (!user) return null

  const enderecoResumo = user.endereco?.logradouro
    ? `${user.endereco.logradouro}, ${user.endereco.numero} - ${user.endereco.bairro}, ${user.endereco.cidade}/${user.endereco.uf}`
    : "Nenhum endereço salvo"
  const membroDesde = user.date_joined ? new Date(user.date_joined).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : null

  const Cabecalho = ({ secao, icone: Icone, titulo, resumo }: { secao: Secao; icone: any; titulo: string; resumo: string }) => (
    <button
      type="button"
      onClick={() => alternar(secao)}
      aria-expanded={aberta === secao}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      <Icone className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink">{titulo}</span>
        <span className="block truncate text-sm text-muted">{resumo}</span>
      </span>
      <ChevronRight className={`h-5 w-5 shrink-0 text-faint transition-transform ${aberta === secao ? "rotate-90" : ""}`} aria-hidden />
    </button>
  )

  const Botao = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={salvando}
      className="h-12 w-full rounded-lg bg-accent text-base font-bold text-accent-ink hover:bg-accent-hover disabled:opacity-60"
    >
      {salvando ? "Salvando..." : children}
    </button>
  )

  return (
    <div className="divide-y divide-line border-y border-line">
      {/* Dados pessoais */}
      <div>
        <Cabecalho
          secao="dados"
          icone={UserRound}
          titulo="Meus dados"
          resumo={[user.email, user.telefone].filter(Boolean).join(" · ") || "Nome, e-mail e telefone"}
        />
        {aberta === "dados" && (
          <div className="space-y-3 pb-4">
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Nome" placeholder="Nome" autoComplete="given-name" value={dados.first_name} onChange={(e) => setDados({ ...dados, first_name: e.target.value })} className={input} />
              <input aria-label="Sobrenome" placeholder="Sobrenome" autoComplete="family-name" value={dados.last_name} onChange={(e) => setDados({ ...dados, last_name: e.target.value })} className={input} />
            </div>
            <input aria-label="E-mail" type="email" placeholder="E-mail" autoComplete="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} className={input} />
            <input aria-label="Telefone" type="tel" inputMode="tel" placeholder="Telefone / WhatsApp" autoComplete="tel" value={dados.telefone} onChange={(e) => setDados({ ...dados, telefone: e.target.value })} className={input} />
            <p className="text-xs text-muted">Usuário de acesso: <span className="font-semibold text-ink">{user.username}</span>{membroDesde && <> · cliente desde {membroDesde}</>}</p>
            <Botao onClick={() => salvar(dados, "Dados atualizados.")}>Salvar dados</Botao>
          </div>
        )}
      </div>

      {/* Endereço padrão */}
      <div>
        <Cabecalho secao="endereco" icone={MapPin} titulo="Endereço de entrega" resumo={enderecoResumo} />
        {aberta === "endereco" && (
          <div className="space-y-3 pb-4">
            <input aria-label="CEP" inputMode="numeric" autoComplete="postal-code" placeholder="CEP" value={end.cep} onChange={(e) => buscarCep(e.target.value)} className={input} />
            <input aria-label="Rua" placeholder="Rua / Avenida" autoComplete="address-line1" value={end.logradouro} onChange={(e) => setEnd({ ...end, logradouro: e.target.value })} className={input} />
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <input aria-label="Número" placeholder="Número" value={end.numero} onChange={(e) => setEnd({ ...end, numero: e.target.value })} className={input} />
              <input aria-label="Complemento" placeholder="Complemento" value={end.complemento} onChange={(e) => setEnd({ ...end, complemento: e.target.value })} className={input} />
            </div>
            <input aria-label="Bairro" placeholder="Bairro" value={end.bairro} onChange={(e) => setEnd({ ...end, bairro: e.target.value })} className={input} />
            <div className="grid grid-cols-[3fr_1fr] gap-2">
              <input aria-label="Cidade" placeholder="Cidade" autoComplete="address-level2" value={end.cidade} onChange={(e) => setEnd({ ...end, cidade: e.target.value })} className={input} />
              <input aria-label="UF" placeholder="UF" maxLength={2} autoComplete="address-level1" value={end.uf} onChange={(e) => setEnd({ ...end, uf: e.target.value.toUpperCase() })} className={input} />
            </div>
            <p className="text-xs text-muted">Usado para preencher o endereço automaticamente nos seus pedidos de entrega.</p>
            <Botao onClick={() => salvar(end, "Endereço salvo.")}>Salvar endereço</Botao>
          </div>
        )}
      </div>

      {/* Senha */}
      <div>
        <Cabecalho secao="senha" icone={KeyRound} titulo="Alterar senha" resumo="Mínimo de 8 caracteres" />
        {aberta === "senha" && (
          <div className="space-y-3 pb-4">
            <input aria-label="Senha atual" type="password" placeholder="Senha atual" autoComplete="current-password" value={senha.senha_atual} onChange={(e) => setSenha({ ...senha, senha_atual: e.target.value })} className={input} />
            <input aria-label="Nova senha" type="password" placeholder="Nova senha" autoComplete="new-password" value={senha.nova_senha} onChange={(e) => setSenha({ ...senha, nova_senha: e.target.value })} className={input} />
            <input aria-label="Confirmar nova senha" type="password" placeholder="Confirmar nova senha" autoComplete="new-password" value={senha.confirmar} onChange={(e) => setSenha({ ...senha, confirmar: e.target.value })} className={input} />
            <Botao onClick={trocarSenha}>Alterar senha</Botao>
          </div>
        )}
      </div>
    </div>
  )
}

export default MinhaConta
