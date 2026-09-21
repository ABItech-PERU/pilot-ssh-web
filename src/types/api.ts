/** Espejo de los serializers del backend. Cambiarlos aqui no cambia la API. */

export type OrganizationRole = 'owner' | 'admin' | 'member'
export type OrganizationStatus = 'active' | 'suspended'
/** Los permisos del personal. Se combinan: sin ninguno, es un cliente más. */
export type StaffCapability =
  'can_attend_customers' | 'can_manage_finances' | 'can_manage_staff'
export type AuthType = 'password' | 'key'
/** De menos a mas. */
export type AccessLevel = 'view' | 'connect' | 'manage'
export type AccessScope = 'organization' | 'label' | 'server' | 'credential'

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type PaletteColor =
  'teal' | 'blue' | 'indigo' | 'violet' | 'pink' | 'red' | 'amber' | 'green' | 'slate'

/** La que trae el login: sin saldo ni conteos. */
export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  color: PaletteColor
  /** Null: se pinta el color con la inicial. */
  avatar_url: string | null
  is_personal: boolean
  status: OrganizationStatus
  role: OrganizationRole | null
}

export interface Organization extends OrganizationSummary {
  members_count: number
  servers_count: number
  credit_balance: string
  created_at: string
}

export interface OnboardingStep {
  key: 'profile' | 'team'
  label: string
  hint: string
  required: boolean
  done: boolean
}

export interface OnboardingState {
  completed: boolean
  next_step: OnboardingStep['key'] | null
  steps: OnboardingStep[]
  account_status: OrganizationStatus
  account_message: string
}

export interface SocialAccount {
  id: string
  provider: string
  email: string
  avatar_url: string
  connected_at: string
}

export interface CurrentUser {
  id: string
  email: string
  full_name: string
  phone: string
  display_name: string
  can_attend_customers: boolean
  can_manage_finances: boolean
  can_manage_staff: boolean
  organizations: OrganizationSummary[]
  social_accounts: SocialAccount[]
  onboarding: OnboardingState
  two_factor_enabled: boolean
  /** Solo cuenta si `two_factor_enabled`. */
  two_factor_method: TwoFactorMethod
  /** Con la app; `null` con el correo o sin dos pasos. */
  recovery_codes_left: number | null
  avatar_url: string | null
  /** Sin confirmar no hay bono de bienvenida ni cuota gratuita diaria. */
  has_verified_email: boolean
  /** Hasta cuándo vale el código que ya tiene. Null si no hay uno vivo. */
  email_code_expires_at: string | null
  /** Donde se leen sus horas y se cortan sus días. En blanco hasta que
   *  la manda su navegador. */
  time_zone: string
  notify_time_zone_change: boolean
}

export interface SessionTokens {
  /** El dispositivo que abre este login, para reconocerlo en la lista. */
  session_id: string
  access: string
  refresh: string
  expires_at: string
  user: CurrentUser
}

export type TwoFactorMethod = 'email' | 'app'

/** Con dos pasos el login no entrega tokens: entrega un desafio de cinco
 *  minutos que solo sirve para canjear el segundo codigo. */
export interface TwoFactorChallenge {
  two_factor_required: true
  method: TwoFactorMethod
  challenge: string
  /** Enmascarado: confirma a donde fue el codigo sin publicarlo entero. */
  email: string
}

export type LoginResponse = SessionTokens | TwoFactorChallenge

export interface RefreshResponse {
  access: string
  refresh?: string
}

export type LinkKind = 'web' | 'panel' | 'database' | 'repo' | 'docs' | 'other'

/** Lo que depende de una etiqueta: uso de cada opción y accesos que
 *  reparte. Se consulta antes de quitarla. */
export interface LabelUsage {
  values: Record<string, { servers: number; credentials: number }>
  grants: number
}

/** Etiquetas que admite la organizacion. Se eligen, no se teclean: una
 *  errata crearia otra etiqueta. */
export interface LabelDefinition {
  id: string
  organization: string
  key: string
  values: string[]
  /** Mapa `opción: color`. Aparte, para que `values` siga siendo texto. */
  colors: Record<string, PaletteColor>
  usage: LabelUsage
  created_at: string
}

/** Un enlace. En el servidor, lo de la maquina entera; en la
 *  credencial, lo que se abre con ese usuario. */
export interface ResourceLink {
  label: string
  url: string
  kind: LinkKind
}

/** La credencial de un servidor (root@10.0.0.5), no una persona. Trae el
 *  nombre y la IP de su servidor para poder listarse fuera de la ficha. */
export interface ServerUser {
  id: string
  server: string
  server_name: string
  server_ip: string
  username: string
  auth_type: AuthType
  has_password: boolean
  has_private_key: boolean
  /** Donde entra la terminal al abrir. Vacio: la carpeta de inicio. */
  working_directory: string
  links: ResourceLink[]
  /** El entorno suele vivir aqui: una maquina aloja UAT y produccion. */
  labels: Record<string, string>
  notes: string
  /** Ultima terminal abierta con ella. Null: nunca se uso. */
  last_used_at: string | null
  total_sessions: number
  /** Cuántas personas distintas la han usado. */
  people_count: number
  /** La media de las sesiones cerradas, ya contada. `N/A` sin ninguna. */
  average_session_time: string
  /** Null si no consta. */
  created_by_name: string | null
  created_at: string
  updated_at: string
  /** Lo que puede hacer quien pregunta con ella. `manage` solo si tambien
   *  gestiona su servidor: editarla o borrarla pide la maquina entera. */
  access_level: AccessLevel
}

export interface Server {
  id: string
  organization: string
  organization_name: string
  organization_slug: string
  name: string
  ip: string
  port: number
  /** Enlaces de la maquina entera: el panel, el monitoreo. */
  links: ResourceLink[]
  /** Mapa `clave: valor`. Conceder por etiqueta alcanza a lo etiquetado. */
  labels: Record<string, string>
  created_at: string
  created_by_name: string | null
  users: ServerUser[]
  last_used_at: string | null
  total_sessions: number
  average_session_time: string
  has_host_key: boolean
  /** Lo que puede hacer quien pregunta. Lo decide el backend; aqui solo
   *  evita ofrecer lo que respondera 403. */
  access_level: AccessLevel
}

/** `active` mientras la terminal esta abierta; `error` si la conexion se
 *  cayo o nunca llego a abrirse. */
export type SessionStatus = 'active' | 'closed' | 'error'

export interface TerminalSession {
  id: string
  server: string
  user: string | null
  /** La credencial con la que se entro, no la persona. */
  username: string | null
  opened_by_name: string | null
  started_at: string
  ended_at: string | null
  status: SessionStatus
  duration: string
  client_ip: string | null
}

/** Como se usa una maquina o una credencial en una ventana de dias. */
export interface UsageStats {
  range_days: number
  /** El rango que se miró, en `AAAA-MM-DD`. */
  from: string
  to: string
  sessions: { total: number; active: number; closed: number; error: number }
  people: number
  connected_seconds: number
  /** Media de las sesiones cerradas: una abierta aún no terminó. */
  average_seconds: number
  daily: { date: string; sessions: number }[]
  top_people: { name: string; sessions: number }[]
}

export interface ServerStats extends UsageStats {
  /** Intentos que el backend rechazo: el registro de lo denegado. */
  denied: number
  top_credentials: { username: string; sessions: number }[]
  /** Por nombre de usuario: una llave que no usa nadie es una que sobra. */
  unused_credentials: string[]
}

/** Las direcciones son de la credencial: una IP que no se reconoce entrando
 *  con el usuario de producción es lo que se viene a buscar. */
export interface CredentialStats extends UsageStats {
  top_addresses: { ip: string; sessions: number }[]
}

/** A quien se da que, con que nivel y hasta cuando. Es la unica pieza de
 *  acceso: equipo entero, externo puntual y control fino usan la misma. */
export interface AccessGrant {
  id: string
  organization: string
  group: string | null
  user: string | null
  /** Dada a quien todavía no ha aceptado: la recibe al entrar. */
  invitation: string | null
  subject_type: 'group' | 'user' | 'invitation'
  subject_name: string
  /** Solo cuando el sujeto es una persona o una invitación. */
  subject_email: string | null
  /** Todavía no da acceso: espera a que acepte la invitación. */
  is_pending: boolean
  server: string | null
  server_name: string | null
  server_user: string | null
  label_key: string
  label_value: string
  scope: AccessScope
  /** El alcance ya escrito: «Web PRD», «deploy @ Web PRD», «entorno=prod». */
  scope_label: string
  level: AccessLevel
  expires_at: string | null
  is_expired: boolean
  created_at: string
}

export interface AccessGroupMember {
  id: string
  membership: string
  display_name: string
  email: string
  avatar_url: string | null
  role: OrganizationRole
}

/** Conjunto de miembros al que se concede. Los crea el equipo con el nombre
 *  de su funcion: ninguno nace con la organizacion. */
export interface AccessGroup {
  id: string
  organization: string
  name: string
  description: string
  members: AccessGroupMember[]
  created_at: string
}

/** Una maquina a la que alguien entra, y por que entra. `reasons` vacio con
 *  `by_role` es quien administra la organizacion: entra sin concesion. */
export interface ReachableServer {
  id: string
  name: string
  ip: string
  level: AccessLevel
  by_role: boolean
  reasons: AccessGrant[]
}

/** A que entra una persona. Explicacion calculada, no un permiso. */
export interface MemberAccess {
  membership: string
  display_name: string
  role: OrganizationRole
  servers: ReachableServer[]
}

/** Quien entra a una maquina: lo concedido, y quien administra la
 *  organizacion, que entra sin que nadie le conceda nada. */
export interface ServerAccess {
  managers: Membership[]
  grants: AccessGrant[]
}

/** En qué punto está el saldo: con él, a una semana de acabarse, en el
 *  margen tras acabarse, agotado, o sin créditos desde siempre. */
export type WalletState = 'ok' | 'low' | 'grace' | 'exhausted' | 'empty'

export interface Wallet {
  organization: string
  balance: string
  state: WalletState
  /** Media diaria del último mes, desde el primer día con uso. */
  daily_burn: string
  /** Null sin gasto: dividir entre cero no da un número. */
  days_left: number | null
  /** Hasta cuándo siguen abriéndose las terminales tras acabarse. */
  grace_ends_at: string | null
  /** La cuenta propietaria confirmó su correo: sin eso no hay nada gratis. */
  has_free_allowance: boolean
  /** Con pasarela se paga aquí; sin ella, finanzas cobra por fuera. */
  online_payment: boolean
  /** Donde se corta el día de uso: la zona del propietario, la misma en todas
   *  sus organizaciones. */
  billing_time_zone: string
}

/** Un día con uso. Los días sin terminales no tienen fila. */
export interface DailyUsage {
  usage_date: string
  members_used: number
  servers_used: number
  members_billed: number
  servers_billed: number
  credits_charged: string
}

export type CreditKind =
  'grant' | 'topup' | 'bonus' | 'referral' | 'consumption' | 'refund' | 'adjustment'

/** Un periodo de uso de un vistazo. Las medias son por día con uso. */
export interface UsageSummary {
  days_used: number
  credits: string
  members_avg: string
  servers_avg: string
  members_billed: number
  servers_billed: number
  /** El día que más costó. Null sin uso. */
  peak: DailyUsage | null
  /** Los días con uso del periodo, del más antiguo al más reciente. */
  series: DailyUsage[]
}

export interface CreditTransaction {
  id: string
  /** Positivo entra; negativo sale. */
  amount: string
  balance_after: string
  kind: CreditKind
  kind_label: string
  description: string
  actor: string | null
  created_at: string
}

/** Lo que se cobra: cada persona y cada servidor, el día que se usan. */
export type PricedResource = 'member' | 'server'

export interface PricingRule {
  resource: PricedResource
  resource_label: string
  credits_per_day: string
  free_allowance: number
}

export interface TopUpPackage {
  id: string
  name: string
  price_amount: string
  price_currency: string
  credits: string
  bonus_credits: string
  total_credits: string
  /** El que sale elegido y con la insignia: lo decide finanzas. */
  is_recommended: boolean
  /** Fin de la oferta. Null: se ofrece sin prisa. */
  available_until: string | null
}

export type TopUpStatus =
  'pending' | 'completed' | 'cancelled' | 'refunded' | 'disputed' | 'charged_back'

/** Con qué se pagó, normalizado: la pasarela lo dice de cada pago y
 *  finanzas lo elige al cobrar por fuera. */
export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'yape'
  | 'plin'
  | 'pagoefectivo'
  | 'transfer'
  | 'deposit'
  | 'cash'
  | 'other'

/** La extensión con que se guardó, sacada del contenido real del archivo. */
export type ReceiptFormat = 'pdf' | 'jpg' | 'png' | 'webp'

export interface TopUpRequest {
  id: string
  package_name: string
  /** Por dónde coordinar el cobro cuando no se paga en línea. */
  contact_phone: string
  credits: string
  /** Lo vendido y lo regalado; `credits` los trae sumados. */
  base_credits: string
  bonus_credits: string
  price_amount: string
  price_currency: string
  status: TopUpStatus
  requested_by: string | null
  /** Quién la cerró a mano. Null: la cerró el aviso del proveedor. */
  completed_by: string | null
  cancelled_by: string | null
  created_at: string
  completed_at: string | null
  /** Puesto: ya se pagó y falta que el proveedor lo confirme. */
  external_id: string
  /** Donde está el código para pagar en un agente. Solo el efectivo. */
  voucher_url: string
  /** Cómo se cobró por fuera: el número de operación y su comprobante.
   *  En blanco y `null` en las pagadas en línea. */
  manual_reference: string
  /** El archivo no tiene enlace: se pide a `/receipt` con la sesión. */
  receipt_format: ReceiptFormat | null
  /** En blanco si no consta. `payment_brand` es la marca o el id del
   *  proveedor: `visa`, `master`, `pagoefectivo_atm`. */
  payment_method: PaymentMethod | ''
  payment_method_label: string
  payment_brand: string
  /** Lo devuelto por el proveedor. Con parte devuelta sigue acreditada. */
  refunded_amount: string
  refunded_credits: string
  /** Cuándo pasó cada cosa. `refunded_at` es la última devolución. */
  cancelled_at: string | null
  refunded_at: string | null
  disputed_at: string | null
  charged_back_at: string | null
}

/** Con sus devoluciones: una parcial en dos veces son dos entradas. */
export interface TopUpRequestDetail extends TopUpRequest {
  refunds: { at: string; credits: string }[]
}

/** Lo que la pantalla necesita para cobrar. Nada de esto es secreto: la
 *  clave publica esta pensada para ir en el navegador. */
export interface CheckoutForm {
  gateway: string
  public_key: string
  locale: string
  amount: string
  currency: string
  description: string
  /** Ya resuelto por el backend: el formulario no lo vuelve a pedir. */
  payer_email: string
  /** Servidor de pruebas: se paga con tarjetas de prueba y no se cobra. */
  test_mode: boolean
}

/** O una direccion a la que ir, o el formulario que se pinta en casa. */
export interface Checkout {
  url: string
  form: CheckoutForm | Record<string, never>
}

export interface Membership {
  id: string
  organization: string
  user: string
  display_name: string
  email: string
  avatar_url: string | null
  role: OrganizationRole
  role_label: string
  created_at: string
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface Invitation {
  id: string
  organization: string
  organization_name: string
  email: string
  role: OrganizationRole
  role_label: string
  status: InvitationStatus
  expires_at: string
  invited_by_name: string
  created_at: string
}

/** Lo que dice una invitación antes de aceptarla, sin necesidad de cuenta. */
export interface InvitationPreview {
  organization_name: string
  organization_slug: string
  email: string
  role: OrganizationRole
  role_label: string
  invited_by_name: string
  expires_at: string
  can_be_accepted: boolean
  /** Si ese correo ya tiene cuenta: decide entre entrar y crearla. */
  has_account: boolean
}

/** Una entrada de la auditoría, ya contada: la frase la arma el servidor,
 *  que es quien la dice también en el Excel. */
export interface AuditEntry {
  id: string
  action: string
  category: string
  description: string
  detail: string
  /** Lo que guardó el registro: los nombres, y cómo entra una credencial. */
  metadata: Record<string, unknown>
  /** El id de lo que tocó: en un inicio de sesión, su sesión. */
  target_id: string
  /** `null` si la cuenta se borró: el registro sobrevive a quien actuó. */
  actor: string | null
  actor_email: string | null
  ip_address: string | null
  /** «Chrome en Windows». En blanco si lo hizo el sistema o no consta. */
  device: string
  created_at: string
}

export interface AuditFilterOption {
  value: string
  label: string
}

/** Con las opciones de los filtros, sacadas del registro entero: elegir un
 *  tipo no hace desaparecer a las personas. */
export interface AuditLogList extends Paginated<AuditEntry> {
  categories: AuditFilterOption[]
  people: AuditFilterOption[]
}

/** Con las opciones de sus filtros, sacadas de toda la actividad: elegir un
 *  tipo no esconde los equipos. */
export interface AccountActivityList extends Paginated<AuditEntry> {
  categories: AuditFilterOption[]
  devices: AuditFilterOption[]
}

/* ------------------------------------------------------------------ */
/* Plataforma: lo que ve el personal de Pilot SSH sobre todas las      */
/* organizaciones. Mismas formas que las del cliente, más de quién es. */
/* ------------------------------------------------------------------ */

export interface OrganizationRef {
  name: string
  slug: string
}

export interface PlatformOrganization {
  id: string
  name: string
  slug: string
  color: PaletteColor
  avatar_url: string | null
  status: OrganizationStatus
  is_personal: boolean
  created_at: string
  balance: string
  members_count: number
  servers_count: number
  /** Pedidas y sin acreditar. */
  pending_topups: number
  /** Cuándo entró dinero por última vez. Null si nunca. */
  last_topup_at: string | null
  /** Quien mira es miembro: no puede actuar sobre ella. */
  is_own: boolean
  /** Null si nadie la lleva: una cuenta borrada a medias. */
  owner: { name: string; email: string } | null
}

/** La cuenta a hoy: dinero, uso y quién la lleva. */
export interface OrganizationActivity {
  charged: PlatformSold
  refunded: PlatformAmount
  granted_credits: string
  consumed_credits: string
  disputed: number
  charged_back: number
  /** Días con uso en los últimos 30. */
  days_used_recently: number
  last_session_at: string | null
  owners: number
  admins: number
  members: number
  /** Sin correo confirmado no hay nada gratis. */
  owner_email_verified: boolean
}

/** La suspensión vigente. Su historia entera vive en la auditoría. */
export interface OrganizationSuspension {
  at: string
  /** En blanco si la cuenta que suspendió se borró. */
  by: string
  reason: string
}

/** Con la billetera como la ve el cliente: cuánto le dura y su estado. */
export interface PlatformOrganizationDetail extends PlatformOrganization {
  wallet: Wallet
  activity: OrganizationActivity
  /** Null mientras está activa. */
  suspension: OrganizationSuspension | null
}

/** Una persona vista por el personal: quién es y cómo protege su cuenta. */
export interface PlatformPerson {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  is_active: boolean
  has_verified_email: boolean
  two_factor_enabled: boolean
  two_factor_method: TwoFactorMethod
  is_platform_staff: boolean
}

export interface PlatformMember {
  id: string
  role: OrganizationRole
  role_label: string
  created_at: string
  user: PlatformPerson
}

/** Del servidor, solo el nombre: dónde está y cómo se entra es del cliente. */
export interface PlatformServerRef {
  id: string
  name: string
}

export type DiagnosisCode =
  | 'en_orden'
  | 'sin_credenciales'
  | 'cuenta_desactivada'
  | 'sin_acceso'
  | 'organizacion_suspendida'
  | 'sin_creditos'

/** Por qué alguien no abre una terminal: el motivo y lo que lo resuelve. */
export interface DiagnosisVerdict {
  code: DiagnosisCode
  message: string
  solution: string
}

/** Para quien administra la organización: credencial por credencial. */
export interface AccessDiagnosis extends DiagnosisVerdict {
  credentials: { id: string; username: string; code: DiagnosisCode; label: string }[]
}

/** Para el personal: cuántas credenciales abren, no cuáles. */
export interface PlatformDiagnosis extends DiagnosisVerdict {
  credentials_total: number
  credentials_open: number
}

export interface OrganizationNote {
  id: string
  body: string
  /** En blanco si la cuenta que la escribió se borró. */
  author: string
  created_at: string
}

export interface PlatformAccount extends PlatformPerson {
  full_name: string
  organizations_count: number
  /** La última vez que usó la aplicación. Null si nunca. */
  last_seen_at: string | null
  date_joined: string
}

export interface PlatformAccountDetail extends PlatformAccount {
  /** Los nombres de sus permisos del personal, si los tiene. */
  capabilities: string[]
  /** La zona que corta el día de cobro de todas sus organizaciones. */
  billing_time_zone: string
  /** Falso mientras sigue su zona personal: aún no se le cobró ningún día. */
  is_billing_zone_fixed: boolean
  memberships: {
    id: string
    role: OrganizationRole
    role_label: string
    organization: OrganizationRef
    organization_status: OrganizationStatus
  }[]
}

export interface StaffMember extends PlatformPerson, Record<StaffCapability, boolean> {
  last_seen_at: string | null
  date_joined: string
}

export type StaffCapabilitiesInput = Record<StaffCapability, boolean>

/** Lo que hizo el personal, con la organización sobre la que actuó. */
export interface StaffActivityEntry extends AuditEntry {
  /** Null en lo que no es de ninguna: el catálogo, los permisos, una cuenta. */
  organization: OrganizationRef | null
}

/** Lo que se mueve a mano: una asignación suma; un ajuste corrige en
 *  cualquier sentido. */
export type CreditGrantKind = 'grant' | 'adjustment'

export interface CreditGrantInput {
  amount: string
  kind: CreditGrantKind
  /** Obligatorio: es lo que explica un saldo cuando no cuadra. */
  description: string
}

export interface PlatformTopUp extends TopUpRequest {
  organization: OrganizationRef
  /** Vacío: se cobra por fuera y finanzas la cierra a mano. */
  gateway: string
  /** Quien mira es miembro de esa organización: no la resuelve. */
  is_own: boolean
}

export interface PlatformTopUpDetail extends TopUpRequestDetail {
  organization: OrganizationRef
  gateway: string
  is_own: boolean
}

export interface PlatformTransaction extends CreditTransaction {
  /** El id del pago en el proveedor, cuando lo hay. */
  reference: string
  organization: OrganizationRef
  /** La recarga que acreditó este movimiento. Null en el uso diario, los
   *  bonos y lo que asigna finanzas; una devolución la encuentra por
   *  `reference`. */
  topup: { id: string; package_name: string } | null
}

/** El valor del crédito: de él salen los créditos de cada paquete nuevo. */
export interface CreditPrice {
  credit_unit_price: string
  updated_at: string
}

export interface PlatformPackage extends TopUpPackage {
  /** Apagado, deja de ofrecerse; lo ya vendido lo sigue nombrando. */
  is_active: boolean
  /** Ventana de la oferta. Null las dos: se ofrece siempre. */
  available_from: string | null
  /** Si sus créditos salen del valor vigente del crédito. */
  follows_policy: boolean
  /** Lo que nunca se vendió se borra; lo vendido solo se apaga. */
  can_delete: boolean
  sort_order: number
}

export interface PlatformPackageInput {
  name: string
  /** Ventana de la oferta. Null: sin límite por ese lado. */
  available_from: string | null
  available_until: string | null
  price_amount: string
  price_currency: string
  credits: string
  bonus_credits: string
  is_recommended: boolean
  is_active: boolean
  sort_order: number
}

export interface PlatformPricingRule extends PricingRule {
  is_active: boolean
}

export interface PlatformPricingInput {
  credits_per_day: string
  free_allowance: number
}

export interface PlatformAmount {
  count: number
  amount: string
  credits: string
}

/** Lo cobrado con el bono aparte: `credits` los trae sumados. */
export interface PlatformSold extends PlatformAmount {
  base_credits: string
  bonus_credits: string
}

/** Lo cobrado por un medio de pago en el periodo. */
export interface MethodShare {
  method: PaymentMethod | ''
  label: string
  count: number
  amount: string
  credits: string
}

/** El periodo de un vistazo. Lo que no es de un periodo —disputas,
 *  pendientes, saldo vivo— se cuenta a hoy. */
export interface PlatformSummary {
  currency: string
  charged: PlatformSold
  /** De más a menos dinero: por dónde se mueve la gente. */
  methods: MethodShare[]
  refunded: PlatformAmount
  granted_credits: string
  consumed_credits: string
  active_organizations: number
  disputed: number
  /** Pedidas y sin pago en línea: las que se cierran a mano. */
  pending_manual: number
  organizations: number
  balance_total: string
}

/** Cómo acabó un aviso del proveedor de pago. `pending` incluye los que
 *  esperan su reintento. */
export type PaymentNoticeStatus = 'pending' | 'processed' | 'ignored' | 'failed'

export interface PaymentNotice {
  id: string
  created_at: string
  gateway: string
  /** `reconciliation`: lo encontró la conciliación, no llegó aviso. */
  source: 'webhook' | 'reconciliation'
  source_label: string
  /** En palabras del proveedor: `order.processed`. */
  event: string
  resource_type: string
  resource_id: string
  status: PaymentNoticeStatus
  attempts: number
  next_attempt_at: string | null
  last_error: string
  /** Qué cambió, en una frase: «Acreditó 5 500 créditos.» */
  result: string
  processed_at: string | null
  topup: { id: string; package_name: string; organization: OrganizationRef } | null
}

export interface PaymentNoticeDetail extends PaymentNotice {
  /** Lo que llegó tal cual: ids y tipo de evento, nunca datos de pago. */
  payload: Record<string, unknown>
}

export type EmailStatus = 'pendiente' | 'enviada' | 'fallida'

/** Un correo que salió, o no. Sin su cuerpo: lleva códigos y enlaces. */
export interface EmailDelivery {
  id: string
  created_at: string
  sent_at: string | null
  kind: string
  kind_label: string
  channel: string
  destination: string
  subject: string
  status: EmailStatus
  attempts: number
  /** El último fallo, aunque un reintento después lo entregara. */
  error: string
  person: { id: string; name: string; email: string } | null
}

export interface CorreosDeLaPlataforma extends Paginated<EmailDelivery> {
  kinds: { value: string; label: string }[]
}

export type TaskRunStatus = 'running' | 'succeeded' | 'failed'

export interface TaskRun {
  id: string
  task: string
  status: TaskRunStatus
  created_at: string
  finished_at: string | null
  duration_seconds: number | null
  /** Lo que hizo, o el error si falló. */
  description: string
  error: string
}

/** `late`: debió repetirse y no lo hizo, que es como se ve que beat cayó.
 *  `interrupted`: sigue «en curso» horas después, murió con el worker. */
export type TaskHealth = 'ok' | 'late' | 'failed' | 'running' | 'interrupted' | 'never'

export interface ScheduledTask {
  task: string
  name: string
  frequency: string
  health: TaskHealth
  last_run: TaskRun | null
  next_run_at: string
}

/** Lo que pide atención, para las pestañas. `null`: no es de quien mira. */
export interface OperationsSummary {
  payment_notices_failed: number | null
  /** Solo a finanzas: los pagos de este servidor no mueven dinero. */
  payments_test_mode: boolean | null
  emails_failed: number | null
  tasks_needing_attention: number
}

export interface SiteInfo {
  support: { email: string; phone: string; whatsapp: string }
  company: { name: string; legal_name: string; ruc: string; address: string }
  social: { facebook: string; linkedin: string; github: string }
}

export interface PublicPricing {
  credit_price: string
  currency: string
  welcome_bonus: string
  rules: PricingRule[]
  packages: TopUpPackage[]
}
