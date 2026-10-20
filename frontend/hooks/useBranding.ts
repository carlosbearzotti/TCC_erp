"use client"

import { useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "../services/api"

export const DEFAULT_BRAND = "PL Lanchonete & Pastelaria"

/** Nome do estabelecimento (white-label), vindo do banco via API pública. */
export function useBranding() {
  const { data, mutate } = useSWR<{ nome: string }>("/core/estabelecimento/", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  return { nome: data?.nome || DEFAULT_BRAND, refresh: mutate }
}

/** Mantém o título da aba sincronizado com o nome do estabelecimento. */
export function BrandingTitle() {
  const { nome } = useBranding()
  useEffect(() => {
    document.title = `${nome} — ERP & Automação`
  }, [nome])
  return null
}
