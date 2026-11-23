/** Formatação no padrão brasileiro, usada em todas as telas. */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export function brl(value: number | string | null | undefined): string {
  return BRL.format(Number(value) || 0)
}

/** Duração legível: "agora", "12 min", "1 h 05 min", "2 d 3 h". */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) return "agora"
  const m = Math.floor(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h < 24) return rest ? `${h} h ${String(rest).padStart(2, "0")} min` : `${h} h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh ? `${d} d ${rh} h` : `${d} d`
}

/** Rótulo legível da forma de pagamento ("cartao_credito" -> "Cartão de crédito"). */
export const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
  pix: "Pix",
  outros: "Outros",
}

export function paymentLabel(method: string | null | undefined): string {
  if (!method) return "Outros"
  return PAYMENT_LABELS[method] ?? capitalizeCode(method)
}

/** Rótulo legível do status do pedido, com a mesma grafia em todas as telas. */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  criado: "Criado",
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  finalizado: "Finalizado",
  arquivado: "Arquivado",
  retornando_base: "Retornando à base",
  cancelado: "Cancelado",
}

export function orderStatusLabel(status: string | null | undefined): string {
  if (!status) return ""
  return ORDER_STATUS_LABELS[status] ?? capitalizeCode(status)
}

/** "em_preparo" -> "Em preparo": fallback para códigos sem rótulo cadastrado. */
function capitalizeCode(code: string): string {
  const text = code.replace(/_/g, " ").trim().toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const QTY = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 })

/** Quantidade no padrão brasileiro com unidade: "10 kg", "0,5 L", "12 un". */
export function formatQty(value: number | string | null | undefined, unit?: string | null): string {
  const n = QTY.format(Number(value) || 0)
  return unit ? `${n} ${formatUnit(unit)}` : n
}

export function formatUnit(unit: string): string {
  const u = unit.trim().toUpperCase()
  if (u === "L") return "L"
  if (u === "UN" || u === "UND" || u === "UNID") return "un"
  return u.toLowerCase()
}
