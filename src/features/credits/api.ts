import type { Comprobante } from '@/features/credits/comprobantes'
import { http } from '@/lib/http'
import type { Rango } from '@/lib/periods'
import type {
  Checkout,
  CreditTransaction,
  DailyUsage,
  Paginated,
  PricingRule,
  TopUpPackage,
  TopUpRequest,
  TopUpRequestDetail,
  UsageSummary,
  Wallet,
} from '@/types/api'

/** Se filtra en el servidor: el libro viene paginado. */
export interface FiltrosDeMovimientos {
  search?: string
  kind?: string
  /** `AAAA-MM-DD`. Día entero, en la zona de quien mira. */
  from?: string
  to?: string
}

export interface FiltrosDeRecargas {
  status?: string
  from?: string
  to?: string
}

/** Dinero por organización; tarifas y paquetes, comunes a todas. */
export const clavesCreditos = {
  /** Saldo, uso y recargas de toda organización: cambian al recargar o
   *  al confirmar el correo. */
  todas: ['credits'] as const,
  saldo: (slug: string | null) => ['credits', slug] as const,
  uso: (slug: string | null) => ['credits', slug, 'usage'] as const,
  usoDelPeriodo: (slug: string | null, rango: Rango, pagina: number, porPagina: number) =>
    ['credits', slug, 'usage', rango, pagina, porPagina] as const,
  resumenDeUso: (slug: string | null, rango: Rango) =>
    ['credits', slug, 'usage', 'summary', rango] as const,
  movimientos: (
    slug: string | null,
    pagina: number,
    porPagina: number,
    filtros: FiltrosDeMovimientos = {},
  ) => ['credits', slug, 'transactions', pagina, porPagina, filtros] as const,
  recargas: (slug: string | null) => ['credits', slug, 'topups'] as const,
  recarga: (slug: string | null, id: string) =>
    ['credits', slug, 'topups', 'detalle', id] as const,
  comprobante: (slug: string | null, id: string) =>
    ['credits', slug, 'topups', 'detalle', id, 'receipt'] as const,
  recargasFiltradas: (
    slug: string | null,
    pagina: number,
    porPagina: number,
    filtros: FiltrosDeRecargas,
  ) => ['credits', slug, 'topups', pagina, porPagina, filtros] as const,
  tarifas: () => ['credit-pricing'] as const,
  paquetes: () => ['credit-packages'] as const,
}

/** Solo los días con uso tienen fila: un mes cabe en una página. */
const DIAS_CON_USO_POR_PAGINA = 31
export const MOVIMIENTOS_POR_PAGINA = 20

export async function fetchWallet(slug: string) {
  const { data } = await http.get<Wallet>('/credits', { params: { organization: slug } })
  return data
}

/** Último mes, para el gráfico del resumen. */
export async function fetchUsage(slug: string) {
  const { data } = await http.get<Paginated<DailyUsage>>('/credits/usage', {
    params: { organization: slug, page_size: DIAS_CON_USO_POR_PAGINA },
  })
  return data.results
}

export async function fetchUsageOfPeriod(
  slug: string,
  rango: Rango,
  pagina: number,
  porPagina: number,
) {
  const { data } = await http.get<Paginated<DailyUsage>>('/credits/usage', {
    params: {
      organization: slug,
      page: pagina,
      page_size: porPagina,
      ...sinVacios(rango),
    },
  })
  return data
}

/** Resumen del periodo con la serie completa, que el gráfico necesita. */
export async function fetchUsageSummary(slug: string, rango: Rango) {
  const { data } = await http.get<UsageSummary>('/credits/usage/summary', {
    params: { organization: slug, ...sinVacios(rango) },
  })
  return data
}

/** Excel del libro con los mismos filtros. */
export async function exportTransactions(slug: string, filtros: FiltrosDeMovimientos) {
  const { data } = await http.get<Blob>('/credits/transactions/export', {
    params: { organization: slug, ...filtros },
    responseType: 'blob',
  })
  return data
}

export async function fetchTransactions(
  slug: string,
  pagina: number,
  porPagina = MOVIMIENTOS_POR_PAGINA,
  filtros: FiltrosDeMovimientos = {},
) {
  const { data } = await http.get<Paginated<CreditTransaction>>('/credits/transactions', {
    params: { organization: slug, page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

/** Pedidas, o pagadas y sin confirmar. */
export async function fetchPendingTopUps(slug: string) {
  const { data } = await http.get<Paginated<TopUpRequest>>('/credits/topups', {
    params: { organization: slug, status: 'pending' },
  })
  return data.results
}

/** Con su historial; solo para la ficha, no para la lista. */
export async function fetchTopUp(slug: string, id: string) {
  const { data } = await http.get<TopUpRequestDetail>(`/credits/topups/${id}`, {
    params: { organization: slug },
  })
  return data
}

export function comprobanteDe(slug: string, recarga: TopUpRequest): Comprobante | null {
  if (!recarga.receipt_format) return null
  return {
    formato: recarga.receipt_format,
    clave: clavesCreditos.comprobante(slug, recarga.id),
    cargar: async () => {
      const { data } = await http.get<Blob>(`/credits/topups/${recarga.id}/receipt`, {
        params: { organization: slug },
        responseType: 'blob',
      })
      return data
    },
  }
}

export async function fetchTopUps(
  slug: string,
  pagina: number,
  porPagina: number,
  filtros: FiltrosDeRecargas,
) {
  const { data } = await http.get<Paginated<TopUpRequest>>('/credits/topups', {
    params: { organization: slug, page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

export async function fetchPricing() {
  const { data } = await http.get<PricingRule[]>('/credits/pricing')
  return data
}

export async function fetchPackages() {
  const { data } = await http.get<TopUpPackage[]>('/credits/packages')
  return data
}

export async function updateTopUpContact(slug: string, id: string, telefono: string) {
  const { data } = await http.patch<TopUpRequest>(
    `/credits/topups/${id}/contact`,
    { contact_phone: telefono },
    { params: { organization: slug } },
  )
  return data
}

export async function requestTopUp(slug: string, paquete: string, telefono = '') {
  const { data } = await http.post<TopUpRequest>(
    '/credits/topups',
    { package: paquete, contact_phone: telefono },
    { params: { organization: slug } },
  )
  return data
}

/** Datos para cobrar la recarga. Va aparte del alta: pedir deja constancia
 *  aunque se abandone el pago. */
export async function startCheckout(slug: string, recarga: string) {
  const { data } = await http.post<Checkout>(
    `/credits/topups/${recarga}/checkout`,
    null,
    { params: { organization: slug } },
  )
  return data
}

/** Cobra con el token de un solo uso del proveedor; la tarjeta no pasa
 *  por aquí. */
export async function payTopUp(slug: string, recarga: string, form: unknown) {
  const { data } = await http.post<TopUpRequest>(`/credits/topups/${recarga}/pay`, form, {
    params: { organization: slug },
  })
  return data
}

/** Omite los extremos vacíos: el servidor los tomaría por un día. */
function sinVacios(rango: Rango): Partial<Rango> {
  return Object.fromEntries(Object.entries(rango).filter(([, valor]) => valor !== ''))
}
