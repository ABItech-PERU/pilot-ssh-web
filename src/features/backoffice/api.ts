import type { QueryClient } from '@tanstack/react-query'

import type { Comprobante } from '@/features/credits/comprobantes'
import { http } from '@/lib/http'
import type { Rango } from '@/lib/periods'
import type {
  AuditFilterOption,
  AuditLogList,
  CorreosDeLaPlataforma,
  CreditGrantInput,
  CreditPrice,
  OperationsSummary,
  OrganizationNote,
  Paginated,
  PaymentNotice,
  PaymentNoticeDetail,
  PlatformAccount,
  PlatformAccountDetail,
  PlatformDiagnosis,
  PlatformMember,
  PlatformOrganization,
  PlatformOrganizationDetail,
  PlatformServerRef,
  PlatformPackage,
  PlatformPackageInput,
  PlatformPricingInput,
  PlatformPricingRule,
  PlatformSummary,
  PlatformTopUp,
  PlatformTopUpDetail,
  PlatformTransaction,
  PaymentMethod,
  ScheduledTask,
  StaffActivityEntry,
  StaffCapabilitiesInput,
  StaffMember,
  TaskRun,
} from '@/types/api'

/** API del personal: `/backoffice`, sin `organization`, sobre toda la
 *  plataforma. */

export interface FiltrosDeOrganizaciones {
  /** Nombre, dirección o correo de alguien de su equipo. */
  search?: string
  status?: string
  /** `true`: solo las que tienen recargas pendientes. */
  with_pending?: string
}

export interface FiltrosDeRecargasDePlataforma {
  /** Nombre o dirección de la organización. */
  search?: string
  /** Organización exacta, por su dirección. */
  organization?: string
  status?: string
  /** `gateway` (pagadas en la pasarela), `manual` (acreditadas por fuera)
   *  o `unpaid` (pedidas y sin cobrar). */
  charge?: string
  method?: string
  from?: string
  to?: string
}

export interface FiltrosDeMovimientosDePlataforma {
  search?: string
  organization?: string
  kind?: string
  from?: string
  to?: string
}

export const clavesPlataforma = {
  todas: ['platform'] as const,
  resumen: (rango: Rango) => ['platform', 'summary', rango] as const,
  organizaciones: (pagina: number, porPagina: number, filtros: FiltrosDeOrganizaciones) =>
    ['platform', 'organizations', pagina, porPagina, filtros] as const,
  organizacion: (slug: string) => ['platform', 'organizations', 'detalle', slug] as const,
  recargas: (pagina: number, porPagina: number, filtros: FiltrosDeRecargasDePlataforma) =>
    ['platform', 'topups', pagina, porPagina, filtros] as const,
  recarga: (id: string) => ['platform', 'topups', 'detalle', id] as const,
  comprobante: (id: string) => ['platform', 'topups', 'detalle', id, 'receipt'] as const,
  movimientos: (
    pagina: number,
    porPagina: number,
    filtros: FiltrosDeMovimientosDePlataforma,
  ) => ['platform', 'transactions', pagina, porPagina, filtros] as const,
  paquetes: () => ['platform', 'packages'] as const,
  tarifas: () => ['platform', 'pricing'] as const,
  valorDelCredito: () => ['platform', 'credit-price'] as const,
  cambios: (pagina: number, porPagina: number, filtros: Record<string, string>) =>
    ['platform', 'changes', pagina, porPagina, filtros] as const,
  equipo: (
    slug: string,
    pagina: number,
    porPagina: number,
    filtros: Record<string, string>,
  ) =>
    [
      'platform',
      'organizations',
      'detalle',
      slug,
      'members',
      pagina,
      porPagina,
      filtros,
    ] as const,
  servidores: (slug: string) =>
    ['platform', 'organizations', 'detalle', slug, 'servers'] as const,
  diagnostico: (slug: string, membresia: string, servidor: string) =>
    [
      'platform',
      'organizations',
      'detalle',
      slug,
      'diagnosis',
      membresia,
      servidor,
    ] as const,
  notas: (slug: string, pagina: number) =>
    ['platform', 'organizations', 'detalle', slug, 'notes', pagina] as const,
  cuentas: (pagina: number, porPagina: number, filtros: Record<string, string>) =>
    ['platform', 'accounts', pagina, porPagina, filtros] as const,
  cuenta: (id: string) => ['platform', 'accounts', 'detalle', id] as const,
  // Raíz de todas las páginas y filtros: se invalida al cambiar permisos
  todoElPersonal: () => ['platform', 'staff'] as const,
  personal: (pagina: number, porPagina: number, filtros: Record<string, string>) =>
    ['platform', 'staff', pagina, porPagina, filtros] as const,
  actividad: (pagina: number, porPagina: number, filtros: Record<string, string>) =>
    ['platform', 'activity', pagina, porPagina, filtros] as const,
  operaciones: () => ['platform', 'operations'] as const,
  resumenDeOperaciones: () => ['platform', 'operations', 'summary'] as const,
  avisosDePago: (pagina: number, porPagina: number, filtros: Record<string, string>) =>
    ['platform', 'operations', 'payment-notices', pagina, porPagina, filtros] as const,
  avisoDePago: (id: string) =>
    ['platform', 'operations', 'payment-notices', 'detalle', id] as const,
  correos: (pagina: number, porPagina: number, filtros: Record<string, string>) =>
    ['platform', 'operations', 'emails', pagina, porPagina, filtros] as const,
  tareas: () => ['platform', 'operations', 'tasks'] as const,
  corridas: (tarea: string, pagina: number) =>
    ['platform', 'operations', 'tasks', tarea, pagina] as const,
}

/** Incluye las opciones de filtro, sacadas de toda la actividad. */
export interface ActividadDelPersonal extends Paginated<StaffActivityEntry> {
  categories: AuditFilterOption[]
  people: AuditFilterOption[]
}

/** Invalida la plataforma y la caché del cliente que depende de ella:
 *  saldo, tarifas y paquetes. */
export async function invalidarPlataforma(cliente: QueryClient) {
  await Promise.all([
    cliente.invalidateQueries({ queryKey: clavesPlataforma.todas }),
    cliente.invalidateQueries({ queryKey: ['credits'] }),
    cliente.invalidateQueries({ queryKey: ['credit-pricing'] }),
    cliente.invalidateQueries({ queryKey: ['credit-packages'] }),
  ])
}

export async function fetchSummary(rango: Rango) {
  const { data } = await http.get<PlatformSummary>('/backoffice/summary', {
    params: sinVacios(rango),
  })
  return data
}

export async function fetchOrganizations(
  pagina: number,
  porPagina: number,
  filtros: FiltrosDeOrganizaciones,
) {
  const { data } = await http.get<Paginated<PlatformOrganization>>(
    '/backoffice/organizations',
    { params: { page: pagina, page_size: porPagina, ordering: 'name', ...filtros } },
  )
  return data
}

/** Incluye la billetera entera; solo para la ficha, no para la lista. */
export async function fetchOrganization(slug: string) {
  const { data } = await http.get<PlatformOrganizationDetail>(
    `/backoffice/organizations/${slug}`,
  )
  return data
}

/** Créditos a mano, con motivo. Queda en el libro mayor y en la auditoría
 *  de la organización, con su autor. */
export async function grantCredits(slug: string, entrada: CreditGrantInput) {
  const { data } = await http.post<PlatformTransaction>(
    `/backoffice/organizations/${slug}/credits`,
    entrada,
  )
  return data
}

export async function fetchTopUps(
  pagina: number,
  porPagina: number,
  filtros: FiltrosDeRecargasDePlataforma,
) {
  const { data } = await http.get<Paginated<PlatformTopUp>>('/backoffice/topups', {
    params: { page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

export async function fetchTopUp(id: string) {
  const { data } = await http.get<PlatformTopUpDetail>(`/backoffice/topups/${id}`)
  return data
}

export function comprobanteDe(recarga: PlatformTopUp): Comprobante | null {
  if (!recarga.receipt_format) return null
  return {
    formato: recarga.receipt_format,
    clave: clavesPlataforma.comprobante(recarga.id),
    cargar: async () => {
      const { data } = await http.get<Blob>(`/backoffice/topups/${recarga.id}/receipt`, {
        responseType: 'blob',
      })
      return data
    },
  }
}

/** Recarga de un pago, por su referencia. Enlaza una devolución del libro
 *  mayor con su recarga. */
export async function fetchTopUpByReference(referencia: string) {
  const { data } = await http.get<Paginated<PlatformTopUp>>('/backoffice/topups', {
    params: { search: referencia, page_size: 1 },
  })
  return data.results[0] ?? null
}

/** Registra una recarga cobrada por fuera; nace acreditada. El paquete es
 *  el cobrado, no necesariamente el pedido. `replaces` cancela la pedida. */
export async function sellTopUp(entrada: {
  organization: string
  package: string
  method: PaymentMethod
  reference: string
  receipt: File | null
  replaces: string | null
}) {
  const cuerpo = new FormData()
  cuerpo.append('organization', entrada.organization)
  cuerpo.append('package', entrada.package)
  cuerpo.append('method', entrada.method)
  if (entrada.reference) cuerpo.append('reference', entrada.reference)
  if (entrada.receipt) cuerpo.append('receipt', entrada.receipt, entrada.receipt.name)
  if (entrada.replaces) cuerpo.append('replaces', entrada.replaces)

  const { data } = await http.post<PlatformTopUpDetail>('/backoffice/topups', cuerpo, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

/** Acredita una recarga cobrada por fuera. Las pagadas en línea las cierra
 *  el aviso del proveedor; el servidor rechaza cerrarlas a mano. */
export async function completeTopUp(
  id: string,
  entrada: { method: PaymentMethod; reference: string; receipt: File | null },
) {
  const cuerpo = new FormData()
  cuerpo.append('method', entrada.method)
  if (entrada.reference) cuerpo.append('reference', entrada.reference)
  if (entrada.receipt) cuerpo.append('receipt', entrada.receipt, entrada.receipt.name)
  // Sin Content-Type propio: el navegador pone multipart con su boundary
  const { data } = await http.post<PlatformTopUpDetail>(
    `/backoffice/topups/${id}/complete`,
    cuerpo,
    { headers: { 'Content-Type': undefined } },
  )
  return data
}

/** Completa o corrige el respaldo de un cobro por fuera. Lo no enviado se
 *  conserva; el importe nunca cambia. */
export async function updateCharge(
  id: string,
  entrada: { method: PaymentMethod | null; reference: string; receipt: File | null },
) {
  const cuerpo = new FormData()
  if (entrada.method) cuerpo.append('method', entrada.method)
  if (entrada.reference) cuerpo.append('reference', entrada.reference)
  if (entrada.receipt) cuerpo.append('receipt', entrada.receipt, entrada.receipt.name)

  const { data } = await http.post<PlatformTopUpDetail>(
    `/backoffice/topups/${id}/charge`,
    cuerpo,
    { headers: { 'Content-Type': undefined } },
  )
  return data
}

export async function cancelTopUp(id: string) {
  const { data } = await http.post<PlatformTopUpDetail>(`/backoffice/topups/${id}/cancel`)
  return data
}

export async function fetchTransactions(
  pagina: number,
  porPagina: number,
  filtros: FiltrosDeMovimientosDePlataforma,
) {
  const { data } = await http.get<Paginated<PlatformTransaction>>(
    '/backoffice/transactions',
    { params: { page: pagina, page_size: porPagina, ...filtros } },
  )
  return data
}

/** Excel del libro con los mismos filtros. Sin organización fija, añade
 *  una columna con la dueña de cada fila. */
export async function exportTransactions(filtros: FiltrosDeMovimientosDePlataforma) {
  const { data } = await http.get<Blob>('/backoffice/transactions/export', {
    params: filtros,
    responseType: 'blob',
  })
  return data
}

export async function fetchPackages() {
  const { data } = await http.get<PlatformPackage[]>('/backoffice/packages')
  return data
}

export async function createPackage(entrada: PlatformPackageInput) {
  const { data } = await http.post<PlatformPackage>('/backoffice/packages', entrada)
  return data
}

export async function updatePackage(id: string, entrada: Partial<PlatformPackageInput>) {
  const { data } = await http.patch<PlatformPackage>(
    `/backoffice/packages/${id}`,
    entrada,
  )
  return data
}

export async function fetchChanges(
  pagina: number,
  porPagina: number,
  filtros: Record<string, string>,
) {
  const { data } = await http.get<AuditLogList>('/backoffice/changes', {
    params: { page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

export async function exportChanges(filtros: Record<string, string>) {
  const { data } = await http.get<Blob>('/backoffice/changes/export', {
    params: filtros,
    responseType: 'blob',
  })
  return data
}

export async function fetchCreditPrice() {
  const { data } = await http.get<CreditPrice>('/backoffice/credit-price')
  return data
}

export async function updateCreditPrice(credit_unit_price: string) {
  const { data } = await http.patch<CreditPrice>('/backoffice/credit-price', {
    credit_unit_price,
  })
  return data
}

export async function deletePackage(id: string) {
  await http.delete(`/backoffice/packages/${id}`)
}

export async function fetchPricing() {
  const { data } = await http.get<PlatformPricingRule[]>('/backoffice/pricing')
  return data
}

export async function updatePricing(resource: string, entrada: PlatformPricingInput) {
  const { data } = await http.patch<PlatformPricingRule>(
    `/backoffice/pricing/${resource}`,
    entrada,
  )
  return data
}

/** Corta sus terminales al instante. El motivo queda en la auditoría del
 *  cliente. */
export async function suspendOrganization(slug: string, reason: string) {
  const { data } = await http.post<PlatformOrganizationDetail>(
    `/backoffice/organizations/${slug}/suspension`,
    { reason },
  )
  return data
}

export async function liftSuspension(slug: string, reason: string) {
  const { data } = await http.delete<PlatformOrganizationDetail>(
    `/backoffice/organizations/${slug}/suspension`,
    { data: { reason } },
  )
  return data
}

/** Nombra propietario a alguien del equipo; no quita a nadie. */
export async function recoverOwnership(slug: string, membership: string, reason: string) {
  const { data } = await http.post<PlatformMember>(
    `/backoffice/organizations/${slug}/ownership`,
    { membership, reason },
  )
  return data
}

export async function fetchOrganizationMembers(
  slug: string,
  pagina: number,
  porPagina: number,
  filtros: Record<string, string> = {},
) {
  const { data } = await http.get<Paginated<PlatformMember>>(
    `/backoffice/organizations/${slug}/members`,
    { params: { page: pagina, page_size: porPagina, ...filtros } },
  )
  return data
}

/** Solo nombres de servidor, para elegir dónde diagnosticar. */
export async function fetchOrganizationServers(slug: string) {
  const { data } = await http.get<Paginated<PlatformServerRef>>(
    `/backoffice/organizations/${slug}/servers`,
    { params: { page_size: 100 } },
  )
  return data
}

export async function fetchDiagnosis(slug: string, membership: string, server: string) {
  const { data } = await http.get<PlatformDiagnosis>(
    `/backoffice/organizations/${slug}/diagnosis`,
    { params: { membership, server } },
  )
  return data
}

export async function fetchNotes(slug: string, pagina: number) {
  const { data } = await http.get<Paginated<OrganizationNote>>(
    `/backoffice/organizations/${slug}/notes`,
    { params: { page: pagina, page_size: 10 } },
  )
  return data
}

export async function addNote(slug: string, body: string) {
  const { data } = await http.post<OrganizationNote>(
    `/backoffice/organizations/${slug}/notes`,
    { body },
  )
  return data
}

export async function fetchAccounts(
  pagina: number,
  porPagina: number,
  filtros: Record<string, string>,
) {
  const { data } = await http.get<Paginated<PlatformAccount>>('/backoffice/accounts', {
    params: { page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

export async function fetchAccount(id: string) {
  const { data } = await http.get<PlatformAccountDetail>(`/backoffice/accounts/${id}`)
  return data
}

export async function resendVerification(id: string) {
  const { data } = await http.post<PlatformAccountDetail>(
    `/backoffice/accounts/${id}/verification`,
  )
  return data
}

/** El enlace va a su correo; el personal no ve la contraseña nueva. */
export async function sendPasswordReset(id: string) {
  const { data } = await http.post<PlatformAccountDetail>(
    `/backoffice/accounts/${id}/password-reset`,
  )
  return data
}

export async function resetTwoFactor(id: string, reason: string) {
  const { data } = await http.delete<PlatformAccountDetail>(
    `/backoffice/accounts/${id}/two-factor`,
    { data: { reason } },
  )
  return data
}

export async function deactivateAccount(id: string, reason: string) {
  const { data } = await http.post<PlatformAccountDetail>(
    `/backoffice/accounts/${id}/deactivation`,
    { reason },
  )
  return data
}

/** Zona que corta su día de cobro en todas sus organizaciones. */
export async function changeBillingZone(id: string, timeZone: string, reason: string) {
  const { data } = await http.put<PlatformAccountDetail>(
    `/backoffice/accounts/${id}/billing-zone`,
    { time_zone: timeZone, reason },
  )
  return data
}

export async function reactivateAccount(id: string, reason: string) {
  const { data } = await http.delete<PlatformAccountDetail>(
    `/backoffice/accounts/${id}/deactivation`,
    { data: { reason } },
  )
  return data
}

export async function fetchStaff(
  pagina: number,
  porPagina: number,
  filtros: Record<string, string>,
) {
  const { data } = await http.get<Paginated<StaffMember>>('/backoffice/staff', {
    params: { page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

export async function addStaff(email: string, permisos: StaffCapabilitiesInput) {
  const { data } = await http.post<StaffMember>('/backoffice/staff', {
    email,
    ...permisos,
  })
  return data
}

export async function updateStaff(id: string, permisos: StaffCapabilitiesInput) {
  const { data } = await http.patch<StaffMember>(`/backoffice/staff/${id}`, permisos)
  return data
}

/** Quita sus permisos de personal; la cuenta se conserva. */
export async function removeStaff(id: string) {
  await http.delete(`/backoffice/staff/${id}`)
}

export async function fetchActivity(
  pagina: number,
  porPagina: number,
  filtros: Record<string, string>,
) {
  const { data } = await http.get<ActividadDelPersonal>('/backoffice/activity', {
    params: { page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

export async function exportActivity(filtros: Record<string, string>) {
  const { data } = await http.get<Blob>('/backoffice/activity/export', {
    params: filtros,
    responseType: 'blob',
  })
  return data
}

/** Omite los extremos vacíos: el servidor los tomaría por un día. */
function sinVacios(rango: Rango): Partial<Rango> {
  return Object.fromEntries(Object.entries(rango).filter(([, valor]) => valor !== ''))
}

export async function fetchOperationsSummary() {
  const { data } = await http.get<OperationsSummary>('/backoffice/operations/summary')
  return data
}

export async function fetchPaymentNotices(
  pagina: number,
  porPagina: number,
  filtros: Record<string, string>,
) {
  const { data } = await http.get<Paginated<PaymentNotice>>(
    '/backoffice/payment-notices',
    {
      params: { page: pagina, page_size: porPagina, ...filtros },
    },
  )
  return data
}

export async function fetchPaymentNotice(id: string) {
  const { data } = await http.get<PaymentNoticeDetail>(
    `/backoffice/payment-notices/${id}`,
  )
  return data
}

/** Otra ronda de intentos. Sin cola en segundo plano vuelve procesado;
 *  con cola, pendiente. */
export async function retryPaymentNotice(id: string) {
  const { data } = await http.post<PaymentNoticeDetail>(
    `/backoffice/payment-notices/${id}/retry`,
  )
  return data
}

export async function fetchEmails(
  pagina: number,
  porPagina: number,
  filtros: Record<string, string>,
) {
  const { data } = await http.get<CorreosDeLaPlataforma>('/backoffice/emails', {
    params: { page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

export async function fetchScheduledTasks() {
  const { data } = await http.get<ScheduledTask[]>('/backoffice/scheduled-tasks')
  return data
}

export async function fetchTaskRuns(tarea: string, pagina: number, porPagina: number) {
  const { data } = await http.get<Paginated<TaskRun>>(
    `/backoffice/scheduled-tasks/${tarea}/runs`,
    { params: { page: pagina, page_size: porPagina } },
  )
  return data
}
