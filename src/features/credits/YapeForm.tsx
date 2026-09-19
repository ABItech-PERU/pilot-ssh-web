import { ChevronDownIcon, CircleHelpIcon, Loader2Icon } from 'lucide-react'
import { useId, useState } from 'react'

import aprobarCompras from '@/assets/yape-aprobar-compras.webp'
import codigoDeAprobacion from '@/assets/yape-codigo-aprobacion.webp'
import { cn } from 'cn'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createYapeToken } from '@/features/credits/brick'
import { formatPrice } from '@/lib/format'
import type { CheckoutForm, TopUpRequest } from '@/types/api'

// Nueve dígitos en Perú, pero sus datos de prueba usan doce; el número lo
// valida Yape
const CELULAR = /^\d{9,15}$/
const CODIGO = /^\d{6}$/

interface Props {
  recarga: TopUpRequest
  form: CheckoutForm
  pendiente: boolean
  onPagar: (datos: Record<string, unknown>) => void
  /** Al corregir, se borra el fallo de arriba. */
  onLimpiarAviso: () => void
}

/** Yape no tiene Brick: celular y código de seis dígitos van al SDK y
 *  vuelven como token de un solo uso. Ninguno se guarda ni llega al
 *  backend. */
export function YapeForm({ recarga, form, pendiente, onPagar, onLimpiarAviso }: Props) {
  const [celular, setCelular] = useState('')
  const [codigo, setCodigo] = useState('')
  const [errores, setErrores] = useState<{ celular?: string; codigo?: string }>({})
  const [tokenizando, setTokenizando] = useState(false)

  const enviar = async () => {
    const fallos: typeof errores = {}
    if (!CELULAR.test(celular)) fallos.celular = 'Al menos nueve dígitos.'
    if (!CODIGO.test(codigo)) fallos.codigo = 'Son seis dígitos.'
    setErrores(fallos)
    if (Object.keys(fallos).length > 0) return

    setTokenizando(true)
    try {
      const token = await createYapeToken(form.public_key, celular, codigo)
      onPagar({ token, payment_method_id: 'yape', installments: 1 })
    } catch {
      // El SDK no da el motivo: casi siempre el código caducó
      setErrores({ codigo: 'No pudimos validar el código. Genere uno nuevo.' })
    } finally {
      setTokenizando(false)
    }
  }

  const trabajando = tokenizando || pendiente

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="yape-celular">Número de celular</Label>
        <Input
          id="yape-celular"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="987654321"
          maxLength={15}
          value={celular}
          onChange={(evento) => {
            onLimpiarAviso()
            setCelular(evento.target.value.replace(/\D/g, ''))
          }}
          aria-invalid={Boolean(errores.celular)}
        />
        <FieldError message={errores.celular} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="yape-codigo">Código de aprobación</Label>
        <Input
          id="yape-codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          value={codigo}
          onChange={(evento) => {
            onLimpiarAviso()
            setCodigo(evento.target.value.replace(/\D/g, ''))
          }}
          aria-invalid={Boolean(errores.codigo)}
        />
        <FieldError message={errores.codigo} />
        <GuiaDelCodigo />
      </div>

      <Button className="w-full" disabled={trabajando} onClick={() => void enviar()}>
        {trabajando ? (
          <>
            <Loader2Icon className="animate-spin" />
            Procesando…
          </>
        ) : (
          `Pagar ${formatPrice(recarga.price_amount, recarga.price_currency)}`
        )}
      </Button>
    </div>
  )
}

const PASOS = [
  {
    imagen: aprobarCompras,
    texto: 'Entre a Yape y toque «Aprobar compras».',
  },
  {
    imagen: codigoDeAprobacion,
    texto: 'Copie el código de aprobación de 6 dígitos. Dura un minuto.',
  },
]

/** Dónde sale el código, con dos pantallas de Yape. Plegada; se abre sin
 *  salir del formulario ni perder lo escrito. */
function GuiaDelCodigo() {
  const [abierta, setAbierta] = useState(false)
  const id = useId()

  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={id}
        onClick={() => setAbierta((previa) => !previa)}
        className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex items-center gap-1 rounded-sm text-xs focus-visible:outline-1 focus-visible:outline-offset-2"
      >
        <CircleHelpIcon className="size-3.5" aria-hidden />
        ¿Dónde está el código?
        <ChevronDownIcon
          className={cn('size-3.5 transition-transform', abierta && 'rotate-180')}
          aria-hidden
        />
      </button>

      {abierta && (
        <ol id={id} className="grid grid-cols-2 gap-3">
          {PASOS.map(({ imagen, texto }, indice) => (
            <li key={imagen} className="space-y-1.5">
              <img
                src={imagen}
                alt=""
                className="bg-muted w-full rounded-md border"
                width={322}
                height={500}
              />
              <p className="text-muted-foreground text-xs">
                <span className="text-foreground font-medium">{indice + 1}.</span> {texto}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
