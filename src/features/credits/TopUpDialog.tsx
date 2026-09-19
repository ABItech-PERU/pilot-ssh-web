import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircleIcon,
  CalendarClockIcon,
  Loader2Icon,
  LockIcon,
  StarIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { cn } from 'cn'

import { ChoiceCard } from '@/components/choice-card'
import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PhoneField } from '@/components/phone-field'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import * as creditsApi from '@/features/credits/api'
import { PaymentStep } from '@/features/credits/PaymentStep'
import {
  etiquetaDelPaquete,
  explicarPaquete,
  mejorPrecio,
  paqueteRecomendado,
} from '@/features/credits/saldo'
import { usePaquetes } from '@/features/credits/use-creditos'
import { toApiError } from '@/lib/api-error'
import { telefonoValido } from '@/lib/telefonos'
import { formatCredits, formatPrice } from '@/lib/format'
import type { CheckoutForm, TopUpRequest } from '@/types/api'

const PANTALLA_ENTERA_EN_MOVIL =
  'max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 max-sm:p-4'

interface Props {
  slug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  gastoDiario: number
  /** Con pasarela se paga aquí; sin ella solo se pide y finanzas cobra. */
  enLinea: boolean
  /** Pendiente sin pagar: va directo al pago, sin pedir otra recarga. */
  retomar: TopUpRequest | null
}

/** Elegir paquete y pagarlo, en dos pasos. Pedir deja constancia: si se
 *  abandona el pago, queda una pendiente que finanzas puede acreditar a
 *  mano. Sin pasarela solo se pide y no hay paso de pago. */
export function TopUpDialog({
  slug,
  open,
  onOpenChange,
  gastoDiario,
  enLinea,
  retomar,
}: Props) {
  // El paso de pago va a dos columnas: necesita más ancho
  const [pagando, setPagando] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) setPagando(false)
        onOpenChange(abierto)
      }}
    >
      <FormDialogContent
        className={
          // En teléfono, pago a pantalla completa: el módulo del proveedor
          // necesita unos 275px más márgenes
          pagando ? cn('sm:max-w-3xl', PANTALLA_ENTERA_EN_MOVIL) : 'sm:max-w-md'
        }
      >
        {/* Dentro del contenido: se desmonta al cerrar y reabre limpio */}
        <FormularioDeRecarga
          slug={slug}
          gastoDiario={gastoDiario}
          enLinea={enLinea}
          retomar={retomar}
          onCerrar={() => onOpenChange(false)}
          onPagando={setPagando}
        />
      </FormDialogContent>
    </Dialog>
  )
}

function FormularioDeRecarga({
  slug,
  gastoDiario,
  enLinea,
  retomar,
  onCerrar,
  onPagando,
}: Omit<Props, 'open' | 'onOpenChange'> & {
  onCerrar: () => void
  onPagando: (activo: boolean) => void
}) {
  const cliente = useQueryClient()
  const paquetes = usePaquetes()
  const [elegido, setElegido] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const { user } = useSession()
  // Prellenado con el del perfil
  const [telefono, setTelefono] = useState(user?.phone ?? '')
  const [pidiendoContacto, setPidiendoContacto] = useState(false)
  // Fija la que se retoma: al guardar, `retomar` se vacía y el resumen
  // mostraría otro importe mientras el diálogo se cierra
  const [pendiente, setPendiente] = useState<TopUpRequest | null>(null)
  const [errorDelContacto, setErrorDelContacto] = useState<string | undefined>()
  const [pagando, setPagando] = useState<{
    recarga: TopUpRequest
    form: CheckoutForm
  } | null>(null)

  // Sin elegir, el recomendado: pedir no cobra y el botón dice qué hará
  const recomendado = paquetes.data && paqueteRecomendado(paquetes.data)
  const paquete = paquetes.data?.find((fila) => fila.id === elegido) ?? recomendado
  const conMejorPrecio = paquetes.data ? mejorPrecio(paquetes.data) : null

  // A una pendiente solo le falta el contacto; una nueva se pide
  const guardarContacto = useMutation({
    mutationFn: () => creditsApi.updateTopUpContact(slug, pendiente!.id, telefono.trim()),
    onSuccess: async () => {
      await cliente.invalidateQueries({
        queryKey: creditsApi.clavesCreditos.recargas(slug),
      })
      toast.success('Contacto guardado. Le escribiremos para completar el pago.')
      onCerrar()
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setErrorDelContacto(fallo.fieldErrors.contact_phone?.[0])
      if (!fallo.fieldErrors.contact_phone) setAviso(fallo.message)
    },
  })

  const pedir = useMutation({
    mutationFn: async (id: string) => {
      const recarga = await creditsApi.requestTopUp(slug, id, telefono.trim())
      // Si falla la pasarela, la recarga pedida sigue pendiente para
      // finanzas
      const checkout = await creditsApi.startCheckout(slug, recarga.id).catch(() => null)
      return { recarga, checkout }
    },
    onSuccess: async ({ recarga, checkout }) => {
      await cliente.invalidateQueries({
        queryKey: creditsApi.clavesCreditos.recargas(slug),
      })

      const form = checkout?.form as CheckoutForm | undefined
      if (form?.public_key) {
        setPagando({ recarga, form })
        onPagando(true)
        return
      }

      toast.success('Recarga solicitada. Le escribiremos para completar el pago.')
      onCerrar()
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setErrorDelContacto(fallo.fieldErrors.contact_phone?.[0])
      if (!fallo.fieldErrors.contact_phone) setAviso(fallo.message)
    },
  })

  // Retomar paga la misma recarga, sin pedir otra. Si el cobro no arranca,
  // vuelve al formulario con el aviso
  const continuar = useMutation({
    mutationFn: (recarga: TopUpRequest) => creditsApi.startCheckout(slug, recarga.id),
    onSuccess: (checkout, recarga) => {
      const form = checkout.form as CheckoutForm | undefined
      if (form?.public_key) {
        setPagando({ recarga, form })
        onPagando(true)
      } else {
        setAviso(
          'El pago en línea no está disponible ahora. Le escribiremos para completarlo.',
        )
      }
    },
    // El aviso del proveedor puede haber cambiado la lista: se refresca
    onError: async (error) => {
      setAviso(toApiError(error).message)
      await cliente.invalidateQueries({
        queryKey: creditsApi.clavesCreditos.recargas(slug),
      })
    },
  })

  useEffect(() => {
    // Sin pasarela no hay pago que retomar: solo falta el contacto
    if (retomar && !enLinea) {
      setPendiente(retomar)
      setTelefono(retomar.contact_phone || user?.phone || '')
      setPidiendoContacto(true)
      return
    }
    if (retomar) continuar.mutate(retomar)
    // Solo al abrir: el diálogo se desmonta al cerrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enCurso = pedir.isPending || guardarContacto.isPending

  if (pidiendoContacto && (paquete || pendiente)) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Datos de contacto</DialogTitle>
          <DialogDescription>
            {pendiente
              ? 'Por aquí le escribiremos para completar el pago.'
              : 'Nos comunicaremos con usted para completar el pago.'}
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/40 space-y-1 rounded-lg border p-3 text-sm">
          <p className="flex items-center justify-between gap-3">
            <span className="truncate">
              {pendiente ? pendiente.package_name : etiquetaDelPaquete(paquete!)}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatPrice(
                (pendiente ?? paquete!).price_amount,
                (pendiente ?? paquete!).price_currency,
              )}
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            {formatCredits(pendiente ? pendiente.credits : paquete!.total_credits)}{' '}
            créditos al confirmarse el pago
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contacto-de-la-recarga">Teléfono o WhatsApp</Label>
          <PhoneField
            id="contacto-de-la-recarga"
            valor={telefono}
            invalido={Boolean(errorDelContacto)}
            autoFocus
            onChange={(valor) => {
              setTelefono(valor)
              setErrorDelContacto(undefined)
            }}
          />
          {errorDelContacto ? (
            <FieldError message={errorDelContacto} />
          ) : (
            <p className="text-muted-foreground text-xs">
              Los créditos entran en cuanto se confirme el pago.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={!telefonoValido(telefono) || enCurso}
            onClick={() =>
              pendiente ? guardarContacto.mutate() : pedir.mutate(paquete!.id)
            }
          >
            {enCurso && <Loader2Icon className="animate-spin" />}
            {pendiente ? 'Guardar el contacto' : 'Solicitar la recarga'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (pendiente) {
                onCerrar()
                return
              }
              setPidiendoContacto(false)
              setAviso(null)
            }}
          >
            {pendiente ? 'Cancelar' : 'Volver'}
          </Button>
        </DialogFooter>
      </>
    )
  }

  if (continuar.isPending) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Pagar la recarga</DialogTitle>
          <DialogDescription>Preparando el pago.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </>
    )
  }

  if (pagando) {
    return (
      <PaymentStep
        slug={slug}
        recarga={pagando.recarga}
        form={pagando.form}
        onVolver={() => {
          setPagando(null)
          onPagando(false)
        }}
        onPagada={onCerrar}
        onVoucher={() => onPagando(false)}
      />
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Recargar créditos</DialogTitle>
        <DialogDescription>
          Cuanto más recarga, más regalo. Los créditos no caducan.
        </DialogDescription>
      </DialogHeader>

      {aviso && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      <div role="radiogroup" aria-label="Paquetes de recarga" className="grid gap-2">
        {paquetes.isPending &&
          Array.from({ length: 3 }, (_, indice) => (
            <Skeleton key={indice} className="h-16 w-full" />
          ))}
        {paquetes.isError && (
          <p className="text-destructive text-sm">{toApiError(paquetes.error).message}</p>
        )}
        {paquetes.data?.map((fila) => (
          <ChoiceCard
            key={fila.id}
            tipo="radio"
            elegida={fila.id === paquete?.id}
            titulo={etiquetaDelPaquete(fila)}
            extremo={formatPrice(fila.price_amount, fila.price_currency)}
            pie={
              <Paquete
                {...explicarPaquete(fila, gastoDiario)}
                recomendado={fila.id === recomendado?.id}
                mejorPrecio={fila.id === conMejorPrecio}
              />
            }
            onClick={() => setElegido(fila.id)}
          />
        ))}
      </div>

      {enLinea && (
        // La garantía va junto al botón que decide el pago
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <LockIcon className="size-3.5 shrink-0" />
          Pago seguro con tarjeta, Yape o PagoEfectivo.
        </p>
      )}

      <DialogFooter>
        <Button
          disabled={!paquete || pedir.isPending}
          onClick={() => {
            if (!paquete) return
            // Sin pasarela, antes de pedir se confirma el contacto
            if (enLinea) pedir.mutate(paquete.id)
            else setPidiendoContacto(true)
          }}
        >
          {pedir.isPending && <Loader2Icon className="animate-spin" />}
          {!enLinea
            ? 'Continuar'
            : paquete
              ? `Pagar ${formatPrice(paquete.price_amount, paquete.price_currency)}`
              : 'Continuar al pago'}
        </Button>
        <Button variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
      </DialogFooter>
    </>
  )
}

/** Total con regalo en grande, su desglose y su duración. */
function Paquete({
  total,
  desglose,
  regalo,
  duracion,
  hasta,
  recomendado,
  mejorPrecio,
}: ReturnType<typeof explicarPaquete> & {
  recomendado: boolean
  mejorPrecio: boolean
}) {
  return (
    <span className="mt-0.5 block space-y-1">
      {/* Misma estructura en todos para compararlos: total con su sello
          y regalo debajo */}
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-foreground text-sm font-semibold">{total}</span>
        {recomendado && (
          <span className="bg-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide text-zinc-900 uppercase">
            <StarIcon className="size-3 fill-current" aria-hidden />
            Recomendado
          </span>
        )}
        {mejorPrecio && (
          <Badge className="bg-primary/15 text-primary border-transparent">
            Mejor precio
          </Badge>
        )}
      </span>
      {regalo && (
        <span className="block">
          <Badge className="bg-success/15 text-success border-transparent">
            {regalo}
          </Badge>
        </span>
      )}
      {desglose && <span className="block">{desglose}</span>}
      {duracion && <span className="block">{duracion}</span>}
      {hasta && (
        <span className="text-warning flex items-center gap-1">
          <CalendarClockIcon className="size-3.5 shrink-0" aria-hidden />
          {hasta}
        </span>
      )}
    </span>
  )
}
