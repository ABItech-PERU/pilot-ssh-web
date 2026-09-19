import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircleIcon,
  Loader2Icon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ChoiceCard } from '@/components/choice-card'
import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import * as platformApi from '@/features/backoffice/api'
import {
  CamposDelCobro,
  type ErroresDelCobro,
} from '@/features/backoffice/CamposDelCobro'
import { OrganizationPicker } from '@/features/backoffice/OrganizationPicker'
import {
  columnasDePaquetes,
  conListaDesplegable,
  seOfreceAhora,
} from '@/features/backoffice/paquetes'
import { OrganizationAvatar } from '@/features/organizations/OrganizationAvatar'
import { toApiError } from '@/lib/api-error'
import { formatCredits, formatPrice } from '@/lib/format'
import type { PaymentMethod, PlatformOrganization, PlatformTopUp } from '@/types/api'

type Elegible = Pick<PlatformOrganization, 'name' | 'slug'> &
  Partial<Pick<PlatformOrganization, 'color' | 'avatar_url'>>

export interface Venta {
  organizacion: Elegible | null
  /** Pedida y no pagada: se cancela al registrar el cobro. */
  sustituye: PlatformTopUp | null
}

interface Props {
  venta: Venta | null
  onClose: () => void
}

type Errores = ErroresDelCobro & { package?: string }

/** Recarga cobrada por fuera. Es una venta, no un ajuste: cuenta en lo
 *  cobrado. El paquete es el cobrado, no el pedido: si falló la tarjeta
 *  de S/ 100 y pagó S/ 50 por Yape, lo vendido son S/ 50. */
export function SellTopUpDialog({ venta, onClose }: Props) {
  const cliente = useQueryClient()
  const [elegida, setElegida] = useState<Elegible | null>(null)
  const [paquete, setPaquete] = useState('')
  const [metodo, setMetodo] = useState<PaymentMethod | ''>('')
  const [referencia, setReferencia] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [mostrada, setMostrada] = useState<Venta | null>(venta)

  const abierto = venta !== null
  const sustituye = mostrada?.sustituye ?? null

  useEffect(() => {
    if (!abierto) return
    setMostrada(venta)
    setElegida(venta?.organizacion ?? null)
    setPaquete('')
    setMetodo('')
    setReferencia('')
    setArchivo(null)
    setErrores({})
    setAviso(null)
  }, [abierto, venta])

  const paquetes = useQuery({
    queryKey: platformApi.clavesPlataforma.paquetes(),
    queryFn: platformApi.fetchPackages,
    enabled: abierto,
  })
  const ofertas = (paquetes.data ?? []).filter((oferta) => seOfreceAhora(oferta))

  const registrar = useMutation({
    mutationFn: () =>
      platformApi.sellTopUp({
        organization: elegida!.slug,
        package: paquete,
        method: metodo as PaymentMethod,
        reference: referencia.trim(),
        receipt: archivo,
        replaces: sustituye?.id ?? null,
      }),
    onSuccess: async (recarga) => {
      await platformApi.invalidarPlataforma(cliente)
      onClose()
      toast.success(
        `${formatCredits(recarga.credits)} créditos acreditados a ${recarga.organization.name}.`,
      )
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setErrores({
        package: fallo.fieldErrors.package?.[0],
        method: fallo.fieldErrors.method?.[0],
        reference: fallo.fieldErrors.reference?.[0],
        receipt: fallo.fieldErrors.receipt?.[0],
      })
      if (!fallo.hasFieldErrors) setAviso(fallo.message)
    },
  })

  const elegirPaquete = (id: string) => {
    setPaquete(id)
    setErrores((actuales) => ({ ...actuales, package: undefined }))
  }

  const listo = elegida !== null && paquete !== '' && metodo !== ''

  return (
    <Dialog open={abierto} onOpenChange={(sigue) => !sigue && onClose()}>
      <FormDialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Registrar un cobro</DialogTitle>
          <DialogDescription>
            Una recarga que ya se cobró por fuera. Entra acreditada, con su importe y su
            comprobante.
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        {!elegida ? (
          <OrganizationPicker onElegir={setElegida} />
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <OrganizationAvatar
                organization={{
                  name: elegida.name,
                  color: elegida.color ?? 'slate',
                  avatar_url: elegida.avatar_url ?? null,
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{elegida.name}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {elegida.slug}
                </span>
              </span>
              {!mostrada?.organizacion && (
                <Button variant="ghost" size="sm" onClick={() => setElegida(null)}>
                  <RefreshCwIcon />
                  Cambiar
                </Button>
              )}
            </div>

            {sustituye && (
              <Alert>
                <TriangleAlertIcon />
                <AlertDescription>
                  Se cancelará {sustituye.package_name} (
                  {formatPrice(sustituye.price_amount, sustituye.price_currency)}), que
                  pidió y no llegó a pagar.
                </AlertDescription>
              </Alert>
            )}

            {/* Paquetes a lo ancho para compararlos; debajo, el cobro en
                dos columnas */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Qué se cobró</legend>
              {paquetes.isPending ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map((hueso) => (
                    <Skeleton key={hueso} className="h-14 w-full" />
                  ))}
                </div>
              ) : conListaDesplegable(ofertas.length) ? (
                <Select value={paquete} onValueChange={elegirPaquete}>
                  <SelectTrigger id="paquete-cobrado" className="w-full">
                    <SelectValue placeholder="Elija el paquete cobrado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ofertas.map((oferta) => (
                      <SelectItem key={oferta.id} value={oferta.id}>
                        <span className="flex items-center gap-6">
                          <span className="truncate">{oferta.name}</span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {formatPrice(oferta.price_amount, oferta.price_currency)} ·{' '}
                            {formatCredits(oferta.total_credits)} créditos
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div
                  className={cn(
                    'grid gap-2',
                    columnasDePaquetes(ofertas.length) === 2
                      ? 'sm:grid-cols-2'
                      : 'sm:grid-cols-3',
                  )}
                  role="radiogroup"
                >
                  {ofertas.map((oferta) => (
                    <ChoiceCard
                      key={oferta.id}
                      tipo="radio"
                      elegida={paquete === oferta.id}
                      titulo={oferta.name}
                      pie={`${formatPrice(oferta.price_amount, oferta.price_currency)} · ${formatCredits(oferta.total_credits)} créditos`}
                      onClick={() => elegirPaquete(oferta.id)}
                    />
                  ))}
                </div>
              )}
              <FieldError message={errores.package} />
            </fieldset>

            <CamposDelCobro
              prefijo="registrar-cobro"
              reparto="dos-columnas"
              metodo={metodo}
              onMetodo={(valor) => {
                setMetodo(valor)
                setErrores((actuales) => ({ ...actuales, method: undefined }))
              }}
              referencia={referencia}
              onReferencia={(valor) => {
                setReferencia(valor)
                setErrores((actuales) => ({ ...actuales, reference: undefined }))
              }}
              archivo={archivo}
              onArchivo={(elegido) => {
                setArchivo(elegido)
                setErrores((actuales) => ({ ...actuales, receipt: undefined }))
              }}
              errores={errores}
            />
          </>
        )}

        <DialogFooter>
          <Button
            disabled={!listo || registrar.isPending}
            onClick={() => registrar.mutate()}
          >
            {registrar.isPending && <Loader2Icon className="animate-spin" />}
            Registrar y acreditar
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
