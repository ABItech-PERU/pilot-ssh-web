/** Formulario de pago del proveedor. Su SDK se carga al abrir el pago, no
 *  en el arranque: la mayoría de visitas no lo necesita. */

import { formatPrice } from '@/lib/format'
import type { CheckoutForm } from '@/types/api'

const SDK = 'https://sdk.mercadopago.com/js/v2'

/** Texto de `index.html` que nginx sustituye por el nonce. */
export const MARCADOR_DE_NONCE = '__CSP_NONCE__'

interface OpcionesDelSdk {
  locale: string
  deviceProfileCspNonce?: string
}

interface Constructor {
  new (publicKey: string, opciones: OpcionesDelSdk): Instancia
}

interface Instancia {
  bricks: () => {
    create: (tipo: string, nodo: string, ajustes: object) => Promise<Brick>
  }
  yape: (opciones: { otp: string; phoneNumber: string }) => {
    create: () => Promise<{ id: string }>
  }
}

export interface Brick {
  unmount: () => void
}

declare global {
  interface Window {
    MercadoPago?: Constructor
  }
}

let cargando: Promise<Constructor> | null = null

/** Su antifraude inyecta un script en línea; la CSP lo admite con el
 *  nonce que nginx escribe en `index.html`. */
export function buildSdkOptions(locale: string): OpcionesDelSdk {
  const nonce = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content
  if (!nonce || nonce === MARCADOR_DE_NONCE) return { locale }
  return { locale, deviceProfileCspNonce: nonce }
}

/** Carga única: dos etiquetas del script dejan dos SDK compitiendo por
 *  el mismo iframe. */
function loadSdk(): Promise<Constructor> {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago)

  cargando ??= new Promise<Constructor>((resolver, rechazar) => {
    const etiqueta = document.createElement('script')
    etiqueta.src = SDK
    etiqueta.onload = () =>
      window.MercadoPago
        ? resolver(window.MercadoPago)
        : rechazar(new Error('El formulario de pago no se cargó.'))
    etiqueta.onerror = () => {
      cargando = null
      rechazar(new Error('No pudimos cargar el formulario de pago.'))
    }
    document.head.append(etiqueta)
  })

  return cargando
}

/** Un Brick por grupo: el módulo no cambia de medios una vez pintado. */
export type GrupoDeMedios = 'tarjeta' | 'efectivo'

const MEDIOS_POR_GRUPO: Record<GrupoDeMedios, Record<string, 'all' | number>> = {
  // Una recarga no se paga en cuotas: sin selector de cuotas
  tarjeta: {
    creditCard: 'all',
    debitCard: 'all',
    prepaidCard: 'all',
    maxInstallments: 1,
  },
  // Agentes, cajeros y banca por internet. Los confirma el aviso del
  // proveedor, no el pago
  efectivo: { ticket: 'all', bankTransfer: 'all', atm: 'all' },
}

interface Opciones {
  form: CheckoutForm
  contenedor: string
  grupo: GrupoDeMedios
  /** `dark` evita un bloque blanco sobre el panel oscuro. */
  tema: 'dark' | 'default'
  onPagar: (datos: unknown) => Promise<void>
  onError: (mensaje: string) => void
}

/** Pinta el formulario y devuelve con qué desmontarlo. `onSubmit` devuelve
 *  una promesa: mientras no resuelve, el Brick bloquea un segundo envío. */
export async function mountPaymentBrick({
  form,
  contenedor,
  grupo,
  tema,
  onPagar,
  onError,
}: Opciones): Promise<Brick> {
  const MercadoPago = await loadSdk()
  const sdk = new MercadoPago(form.public_key, buildSdkOptions(form.locale))

  return sdk.bricks().create('payment', contenedor, {
    initialization: {
      amount: Number(form.amount),
      payer: { email: form.payer_email },
    },
    customization: {
      visual: {
        // El tema decide claro u oscuro; colores, bordes y tamaños salen
        // de los tokens de la pantalla
        style: { theme: tema, customVariables: estiloDeLaPantalla() },
        // «Medios de pago» repetiría el selector de la izquierda
        hideFormTitle: true,
        hidePaymentButton: false,
        // Como en Yape, el importe se ve antes de pulsar
        texts: { formSubmit: `Pagar ${formatPrice(form.amount, form.currency)}` },
      },
      paymentMethods: MEDIOS_POR_GRUPO[grupo],
    },
    callbacks: {
      onReady: () => {},
      // `selectedPaymentMethod` distingue tarjeta de efectivo, que el
      // backend envía distinto
      onSubmit: ({
        selectedPaymentMethod,
        formData,
      }: {
        selectedPaymentMethod: string
        formData: Record<string, unknown>
      }) => onPagar({ ...formData, selected_payment_method: selectedPaymentMethod }),
      onError: () => onError('No pudimos procesar el pago. Inténtelo otra vez.'),
    },
  })
}

/** Tokens del tema leídos al montar, para seguir claro u oscuro. Sin fondo
 *  propio: el Brick se apoya en el diálogo. */
function estiloDeLaPantalla(): Record<string, string> {
  const estilos = getComputedStyle(document.documentElement)
  const token = (nombre: string) => estilos.getPropertyValue(nombre).trim()

  return {
    baseColor: token('--primary'),
    buttonTextColor: token('--primary-foreground'),
    textPrimaryColor: token('--foreground'),
    textSecondaryColor: token('--muted-foreground'),
    formBackgroundColor: 'transparent',
    inputBackgroundColor: token('--background'),
    outlinePrimaryColor: token('--border'),
    outlineSecondaryColor: token('--input'),
    errorColor: token('--destructive'),
    borderRadiusSmall: 'calc(' + token('--radius') + ' - 2px)',
    borderRadiusMedium: token('--radius'),
    borderRadiusLarge: 'calc(' + token('--radius') + ' + 2px)',
    fontSizeSmall: '0.75rem',
    fontSizeMedium: '0.875rem',
    fontSizeLarge: '1rem',
    // También separa las filas de su lista: en 0 los iconos pisan el
    // borde. En teléfono el espacio lo da el diálogo a pantalla completa
    formPadding: '1rem',
  }
}

/** Token de Yape, generado en el navegador con su SDK. Yape no tiene
 *  Brick: celular y código de seis dígitos se cambian por un token de un
 *  solo uso. Ni el código ni el celular se guardan. */
export async function createYapeToken(
  publicKey: string,
  celular: string,
  codigo: string,
): Promise<string> {
  const MercadoPago = await loadSdk()
  const sdk = new MercadoPago(publicKey, buildSdkOptions('es-PE'))
  const { id } = await sdk.yape({ otp: codigo, phoneNumber: celular }).create()
  return id
}
