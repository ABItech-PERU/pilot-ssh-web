import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  Loader2Icon,
  ReceiptTextIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { cn } from 'cn'

import pagoEfectivo from '@/assets/pagoefectivo.webp'
import visaMastercard from '@/assets/visa-mastercard.webp'
import yape from '@/assets/yape.webp'
import { ChoiceCard } from '@/components/choice-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/components/theme-provider'
import * as creditsApi from '@/features/credits/api'
import {
  mountPaymentBrick,
  type Brick,
  type GrupoDeMedios,
} from '@/features/credits/brick'
import { describirFalloDelPago } from '@/features/credits/recargas'
import { YapeForm } from '@/features/credits/YapeForm'
import { toApiError } from '@/lib/api-error'
import { formatCredits, formatPrice } from '@/lib/format'
import type { CheckoutForm, TopUpRequest } from '@/types/api'

type Medio = GrupoDeMedios | 'yape'

/** En teléfono, mismo margen que el relleno del Brick: una sola columna.
 *  Ancho automático para que un aviso no se salga por la derecha. */
const ALINEADO_CON_EL_BRICK = 'max-sm:mx-4 max-sm:w-auto'

const CONTENEDORES: Record<GrupoDeMedios, string> = {
  tarjeta: 'brick-de-tarjeta',
  efectivo: 'brick-de-efectivo',
}

/** Un medio por ficha, con su logo. Yape, el más usado en Perú, va más
 *  grande. */
const MEDIOS: { clave: Medio; titulo: string; pie: React.ReactNode }[] = [
  {
    clave: 'tarjeta',
    titulo: 'Tarjeta de crédito o débito',
    pie: (
      <Logos>
        <img src={visaMastercard} alt="Visa y Mastercard" className="h-7" />
      </Logos>
    ),
  },
  {
    clave: 'efectivo',
    titulo: 'PagoEfectivo',
    pie: (
      <Logos>
        <img src={pagoEfectivo} alt="" className="h-7 rounded-sm" />
        <span>Agentes, cajeros y banca por internet</span>
      </Logos>
    ),
  },
  {
    clave: 'yape',
    titulo: 'Yape',
    pie: (
      <Logos>
        <img src={yape} alt="" className="size-10 rounded-md" />
        <span>Celular y código de la app</span>
      </Logos>
    ),
  },
]

function Logos({ children }: { children: React.ReactNode }) {
  return <span className="mt-1.5 flex flex-wrap items-center gap-2">{children}</span>
}

interface Props {
  slug: string
  recarga: TopUpRequest
  form: CheckoutForm
  onVolver: () => void
  onPagada: () => void
  /** Efectivo no cobra aquí: muestra el código en una pantalla estrecha. */
  onVoucher?: () => void
}

/** Formulario del proveedor en la pantalla. La tarjeta va en su iframe;
 *  aquí llega un token de un solo uso. Yape y PagoEfectivo quedan
 *  pendientes hasta el aviso del proveedor: el mensaje no promete créditos. */
export function PaymentStep({
  slug,
  recarga,
  form,
  onVolver,
  onPagada,
  onVoucher,
}: Props) {
  const cliente = useQueryClient()
  const { resolvedTheme } = useTheme()
  const [aviso, setAviso] = useState<string | null>(null)
  const [listos, setListos] = useState<Partial<Record<GrupoDeMedios, boolean>>>({})
  const [medio, setMedio] = useState<Medio>('tarjeta')
  const [voucher, setVoucher] = useState<string | null>(null)
  const bricks = useRef(new Map<GrupoDeMedios, Brick>())
  const montando = useRef(new Set<GrupoDeMedios>())
  const vivo = useRef(true)
  const alerta = useRef<HTMLDivElement | null>(null)
  const procesando = useRef<HTMLDivElement | null>(null)

  // El fallo sale arriba de un formulario largo: se trae a la vista
  const avisar = (mensaje: string) => {
    setAviso(mensaje)
    requestAnimationFrame(() =>
      alerta.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  // El aviso es del medio anterior: se limpia al cambiar
  const cambiarMedio = (siguiente: Medio) => {
    setAviso(null)
    setMedio(siguiente)
  }

  const pagar = useMutation({
    mutationFn: (datos: unknown) => creditsApi.payTopUp(slug, recarga.id, datos),
    onSuccess: async (actualizada) => {
      await cliente.invalidateQueries({ queryKey: ['credits'] })

      // Efectivo: aún no se cobró; se muestra el código para el agente
      if (actualizada.voucher_url) {
        setVoucher(actualizada.voucher_url)
        onVoucher?.()
        return
      }

      toast.success(
        actualizada.status === 'completed'
          ? `${formatCredits(actualizada.credits)} créditos acreditados.`
          : 'Pago recibido. Los créditos entran al confirmarse.',
      )
      onPagada()
    },
    onError: (error) => avisar(describirFalloDelPago(toApiError(error))),
  })

  // Mientras se cobra, el aviso sigue a la vista: en móvil el botón queda
  // abajo, lejos del aviso
  useEffect(() => {
    if (!pagar.isPending) return
    requestAnimationFrame(() =>
      procesando.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }, [pagar.isPending])

  // Cada grupo se pinta al elegirse y se conserva: `unmount` se lleva los
  // estilos que el SDK inyecta una sola vez. Diferido un tick y cancelable:
  // StrictMode monta, limpia y remonta en el mismo tick
  useEffect(() => {
    if (medio === 'yape') return

    const apertura = window.setTimeout(() => {
      if (bricks.current.has(medio) || montando.current.has(medio)) return
      montando.current.add(medio)

      mountPaymentBrick({
        form,
        contenedor: CONTENEDORES[medio],
        grupo: medio,
        tema: resolvedTheme === 'dark' ? 'dark' : 'default',
        onPagar: (datos) => pagar.mutateAsync(datos).then(() => undefined),
        onError: avisar,
      })
        .then((montado) => {
          // Desmontado antes de resolver: se descarta, sin iframe huérfano
          if (!vivo.current) return montado.unmount()
          bricks.current.set(medio, montado)
          setListos((previos) => ({ ...previos, [medio]: true }))
        })
        .catch((error: Error) => avisar(error.message))
        .finally(() => montando.current.delete(medio))
    }, 0)

    return () => window.clearTimeout(apertura)
    // Una vez por medio: recrearlo al teclear perdería lo escrito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medio])

  useEffect(() => {
    vivo.current = true
    const pintados = bricks.current
    return () => {
      vivo.current = false
      pintados.forEach((brick) => brick.unmount())
      pintados.clear()
    }
  }, [])

  if (voucher) {
    return <VoucherPendiente recarga={recarga} url={voucher} onCerrar={onPagada} />
  }

  const cargando = medio !== 'yape' && !listos[medio] && !aviso

  return (
    <>
      {/* A la izquierda también en teléfono, alineado con las fichas */}
      <DialogHeader className={cn(ALINEADO_CON_EL_BRICK, 'text-left')}>
        <DialogTitle>Pagar la recarga</DialogTitle>
        <DialogDescription>
          {formatPrice(recarga.price_amount, recarga.price_currency)} ·{' '}
          {formatCredits(recarga.credits)} créditos
        </DialogDescription>
      </DialogHeader>

      {/* Portátil: medio a la izquierda y formulario a la derecha, con el
          aviso junto a lo que se corrige. Móvil: apilados, medio primero */}
      <div className="grid gap-4 sm:grid-cols-[15rem_minmax(0,1fr)] sm:gap-6">
        <div
          role="radiogroup"
          aria-label="Medio de pago"
          className={cn('grid content-start gap-2', ALINEADO_CON_EL_BRICK)}
        >
          {MEDIOS.map(({ clave, titulo, pie }) => (
            <ChoiceCard
              key={clave}
              tipo="radio"
              elegida={medio === clave}
              apagada={pagar.isPending}
              titulo={titulo}
              pie={pie}
              onClick={() => cambiarMedio(clave)}
            />
          ))}
        </div>

        <div className="min-w-0 space-y-4">
          {/* Si el modo prueba llega a producción, se nota al primer pago */}
          {form.test_mode && (
            <Alert
              className={cn('border-warning/40 bg-warning/10', ALINEADO_CON_EL_BRICK)}
            >
              <FlaskConicalIcon />
              <AlertDescription>Modo de prueba: no se cobrará dinero.</AlertDescription>
            </Alert>
          )}

          {aviso && (
            <Alert ref={alerta} variant="destructive" className={ALINEADO_CON_EL_BRICK}>
              <AlertCircleIcon />
              <AlertDescription>{aviso}</AlertDescription>
            </Alert>
          )}

          {pagar.isPending && (
            <div
              ref={procesando}
              role="status"
              className={cn(
                'border-primary/30 bg-primary/10 flex items-center gap-3 rounded-lg border p-4',
                ALINEADO_CON_EL_BRICK,
              )}
            >
              <Loader2Icon className="text-primary size-5 shrink-0 animate-spin" />
              <div>
                <p className="text-sm font-semibold">Procesando el pago</p>
                <p className="text-muted-foreground text-xs">
                  No cierre esta ventana. Tarda unos segundos.
                </p>
              </div>
            </div>
          )}

          {/* Se ocultan, no se desmontan (ver el efecto). Atenuados
              mientras se cobra */}
          {Object.entries(CONTENEDORES).map(([grupo, contenedor]) => (
            <div
              key={grupo}
              id={contenedor}
              hidden={medio !== grupo}
              className={cn(
                'min-h-2',
                pagar.isPending && 'pointer-events-none opacity-50',
              )}
            />
          ))}

          {cargando && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          )}

          {medio === 'yape' && (
            <div
              className={cn(
                ALINEADO_CON_EL_BRICK,
                pagar.isPending && 'pointer-events-none opacity-50',
              )}
            >
              <YapeForm
                recarga={recarga}
                form={form}
                pendiente={pagar.isPending}
                onPagar={(datos) => pagar.mutate(datos)}
                onLimpiarAviso={() => setAviso(null)}
              />
            </div>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start"
        disabled={pagar.isPending}
        onClick={onVolver}
      >
        <ArrowLeftIcon />
        Elegir otro paquete
      </Button>
    </>
  )
}

/** Código para pagar en un agente, en tres pasos y con botón grande. */
function VoucherPendiente({
  recarga,
  url,
  onCerrar,
}: {
  recarga: TopUpRequest
  url: string
  onCerrar: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Ya puede pagar</DialogTitle>
        <DialogDescription>
          {formatPrice(recarga.price_amount, recarga.price_currency)} ·{' '}
          {formatCredits(recarga.credits)} créditos
        </DialogDescription>
      </DialogHeader>

      <div className="border-warning/40 bg-warning/10 flex items-center gap-4 rounded-lg border p-4">
        <span className="bg-background grid size-12 shrink-0 place-items-center rounded-md">
          <img src={pagoEfectivo} alt="PagoEfectivo" className="h-6 rounded-sm" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Su código de pago está listo</p>
          <p className="text-muted-foreground text-xs">
            Pague en un agente y los créditos entran solos.
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {PASOS_DEL_AGENTE.map((paso, indice) => (
          <li key={paso} className="flex items-start gap-3 text-sm">
            <span className="bg-primary/15 text-primary grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
              {indice + 1}
            </span>
            <span className="pt-0.5">{paso}</span>
          </li>
        ))}
      </ol>

      <div className="space-y-2">
        <Button asChild size="lg" className="w-full">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ReceiptTextIcon />
            Ver el código de pago
            <ExternalLinkIcon className="opacity-70" />
          </a>
        </Button>
        <Button variant="ghost" className="w-full" onClick={onCerrar}>
          Cerrar
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          Puede cerrar esta ventana: el botón «Ver el código» seguirá en la lista de
          recargas pendientes hasta que la pague.
        </p>
      </div>
    </>
  )
}

const PASOS_DEL_AGENTE = [
  'Abra el código y guárdelo o anótelo.',
  'Páguelo en BCP, BBVA, Interbank, Scotiabank o en un agente Tambo.',
  'Los créditos entran cuando el pago se confirme, hasta seis horas después.',
]
