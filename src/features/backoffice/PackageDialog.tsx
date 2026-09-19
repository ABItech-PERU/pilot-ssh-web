import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircleIcon,
  CalculatorIcon,
  CalendarClockIcon,
  Loader2Icon,
  PencilIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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
import { NumberInput } from '@/components/number-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import * as platformApi from '@/features/backoffice/api'
import { toApiError } from '@/lib/api-error'
import {
  creditosPorPrecio,
  describirPrecioPorCredito,
  diaAInstante,
  instanteADia,
  regaloEnCreditos,
  regaloEnPorcentaje,
} from '@/features/backoffice/paquetes'
import { formatCredits } from '@/lib/format'
import { formatearDia } from '@/lib/periods'
import type { PlatformPackage, PlatformPackageInput } from '@/types/api'

interface Props {
  /** Null: se crea uno. */
  paquete: PlatformPackage | null
  /** Valor vigente del crédito. Null mientras carga. */
  unitario: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Campo = 'name' | 'price_amount' | 'credits' | 'bonus_credits' | 'sort_order'

const MONEDA = 'PEN'

/** Lo que ve el cliente al recargar sale de aquí tal cual. */
export function PackageDialog({ paquete, unitario, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [creditos, setCreditos] = useState('')
  const [regalo, setRegalo] = useState('0')
  const [orden, setOrden] = useState('0')
  const [recomendado, setRecomendado] = useState(false)
  const [activo, setActivo] = useState(true)
  const [aMano, setAMano] = useState(false)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNombre(paquete?.name ?? '')
    setPrecio(paquete ? String(Number(paquete.price_amount)) : '')
    setCreditos(paquete ? String(Number(paquete.credits)) : '')
    setRegalo(paquete ? String(Number(paquete.bonus_credits)) : '0')
    setOrden(String(paquete?.sort_order ?? 0))
    setRecomendado(paquete?.is_recommended ?? false)
    setActivo(paquete?.is_active ?? true)
    // Si ya se aparta del valor, abre desbloqueado para no corregirlo solo
    setAMano(paquete ? !paquete.follows_policy : false)
    setDesde(instanteADia(paquete?.available_from ?? null))
    setHasta(instanteADia(paquete?.available_until ?? null))
    setErrores({})
    setAviso(null)
  }, [open, paquete])

  const guardar = useMutation({
    mutationFn: () => {
      const entrada: PlatformPackageInput = {
        name: nombre.trim(),
        price_amount: precio.trim(),
        price_currency: paquete?.price_currency ?? MONEDA,
        credits: base.trim(),
        bonus_credits: regalo.trim() || '0',
        is_recommended: recomendado,
        is_active: activo,
        available_from: diaAInstante(desde, 'inicio'),
        available_until: diaAInstante(hasta, 'fin'),
        sort_order: Number(orden) || 0,
      }
      return paquete
        ? platformApi.updatePackage(paquete.id, entrada)
        : platformApi.createPackage(entrada)
    },
    onSuccess: async (guardado) => {
      await platformApi.invalidarPlataforma(cliente)
      onOpenChange(false)
      toast.success(paquete ? `${guardado.name} guardado.` : `${guardado.name} añadido.`)
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setErrores({
        name: fallo.fieldErrors.name?.[0],
        price_amount: fallo.fieldErrors.price_amount?.[0],
        credits: fallo.fieldErrors.credits?.[0],
        bonus_credits: fallo.fieldErrors.bonus_credits?.[0],
        sort_order: fallo.fieldErrors.sort_order?.[0],
      })
      if (!fallo.hasFieldErrors) setAviso(fallo.message)
    },
  })

  const limpiar = (campo: Campo) =>
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }))
  const porPolitica = creditosPorPrecio(precio, unitario)
  const calculados = !aMano && porPolitica !== null
  const base = calculados ? String(porPolitica) : creditos
  const total = Number(base || 0) + Number(regalo || 0)
  const porCredito = describirPrecioPorCredito(precio, total)
  // Sobre `base`: con el cálculo activo, los créditos salen del precio y
  // el campo queda vacío
  const listo = nombre.trim() !== '' && precio.trim() !== '' && base.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>{paquete ? 'Editar el paquete' : 'Añadir un paquete'}</DialogTitle>
          <DialogDescription>
            El cliente lo ve tal cual al recargar: precio, créditos y regalo.
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="nombre-del-paquete">Nombre</Label>
          <Input
            id="nombre-del-paquete"
            autoComplete="off"
            autoFocus
            placeholder="Recarga S/ 50"
            value={nombre}
            aria-invalid={Boolean(errores.name)}
            onChange={(evento) => {
              setNombre(evento.target.value)
              limpiar('name')
            }}
          />
          <FieldError message={errores.name} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="precio-del-paquete">Precio (S/)</Label>
            <NumberInput
              id="precio-del-paquete"
              inputMode="decimal"
              min={0}
              step="1"
              value={precio}
              aria-invalid={Boolean(errores.price_amount)}
              onChange={(evento) => {
                setPrecio(evento.target.value)
                limpiar('price_amount')
              }}
            />
            <FieldError message={errores.price_amount} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditos-del-paquete">Créditos</Label>
            {/* Candado dentro del campo, como el ojo de la contraseña,
                para no descuadrar la fila */}
            <div className="relative">
              <NumberInput
                id="creditos-del-paquete"
                inputMode="numeric"
                min={0}
                step="1"
                readOnly={calculados}
                className={cn('pr-11', calculados && 'text-muted-foreground')}
                value={base}
                aria-invalid={Boolean(errores.credits)}
                onChange={(evento) => {
                  setCreditos(evento.target.value)
                  limpiar('credits')
                }}
              />
              {unitario && (
                <button
                  type="button"
                  aria-label={
                    aMano
                      ? 'Calcular del valor del crédito'
                      : 'Escribir los créditos a mano'
                  }
                  aria-pressed={aMano}
                  onClick={() => {
                    if (!aMano) setCreditos(base)
                    setAMano(!aMano)
                    limpiar('credits')
                  }}
                  className="text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-ring absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1"
                >
                  {aMano ? (
                    <CalculatorIcon className="size-4" />
                  ) : (
                    <PencilIcon className="size-4" />
                  )}
                </button>
              )}
            </div>
            <FieldError message={errores.credits} />
          </div>
        </div>

        {/* El regalo va aparte: es la palanca comercial. Acepta créditos o
            porcentaje */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">De regalo</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label
                htmlFor="regalo-del-paquete"
                className="text-muted-foreground text-xs"
              >
                En créditos
              </Label>
              <NumberInput
                id="regalo-del-paquete"
                inputMode="numeric"
                min={0}
                step="1"
                value={regalo}
                aria-invalid={Boolean(errores.bonus_credits)}
                onChange={(evento) => {
                  setRegalo(evento.target.value)
                  limpiar('bonus_credits')
                }}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="regalo-en-porcentaje"
                className="text-muted-foreground text-xs"
              >
                En porcentaje
              </Label>
              <NumberInput
                id="regalo-en-porcentaje"
                inputMode="decimal"
                min={0}
                step="1"
                value={regalo.trim() === '' ? '' : regaloEnPorcentaje(regalo, base)}
                onChange={(evento) => {
                  const escrito = evento.target.value
                  setRegalo(escrito === '' ? '' : regaloEnCreditos(escrito, base))
                  limpiar('bonus_credits')
                }}
              />
            </div>
          </div>
          <FieldError message={errores.bonus_credits} />
        </fieldset>

        <p className="text-muted-foreground text-xs">
          {formatCredits(total)} créditos en total
          {porCredito && ` · ${porCredito}`}
        </p>

        <VentanaDeOferta
          desde={desde}
          hasta={hasta}
          onDesde={setDesde}
          onHasta={setHasta}
        />

        <div className="space-y-2">
          <Label htmlFor="orden-del-paquete">Orden en la lista</Label>
          <NumberInput
            id="orden-del-paquete"
            inputMode="numeric"
            min={0}
            step="1"
            className="sm:w-32"
            value={orden}
            aria-invalid={Boolean(errores.sort_order)}
            onChange={(evento) => {
              setOrden(evento.target.value)
              limpiar('sort_order')
            }}
          />
          {errores.sort_order ? (
            <FieldError message={errores.sort_order} />
          ) : (
            <p className="text-muted-foreground text-xs">
              De menor a mayor; a igual orden, por precio.
            </p>
          )}
        </div>

        <div className="divide-y rounded-lg border">
          <Interruptor
            id="paquete-recomendado"
            etiqueta="Recomendado"
            pista="Sale elegido al recargar, con su insignia."
            activado={recomendado}
            onCambiar={setRecomendado}
          />
          <Interruptor
            id="paquete-activo"
            etiqueta="Se ofrece"
            pista="Apagado, deja de verse al recargar; lo ya vendido no cambia."
            activado={activo}
            onCambiar={setActivo}
          />
        </div>

        <DialogFooter>
          <Button disabled={!listo || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            {paquete ? 'Guardar cambios' : 'Añadir paquete'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

function Interruptor({
  id,
  etiqueta,
  pista,
  activado,
  onCambiar,
}: {
  id: string
  etiqueta: string
  pista: string
  activado: boolean
  onCambiar: (activado: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <span className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium">
          {etiqueta}
        </label>
        <span className="text-muted-foreground block text-xs">{pista}</span>
      </span>
      <Switch id={id} checked={activado} onCheckedChange={onCambiar} />
    </div>
  )
}

/** No ocupa sitio hasta que finanzas programa una promoción: lo normal es
 *  que no caduque. */
function VentanaDeOferta({
  desde,
  hasta,
  onDesde,
  onHasta,
}: {
  desde: string
  hasta: string
  onDesde: (dia: string) => void
  onHasta: (dia: string) => void
}) {
  const programada = desde !== '' || hasta !== ''

  if (!programada) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onHasta(formatearDia(new Date()))}
      >
        <CalendarClockIcon />
        Programar la oferta
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Vigencia de la oferta</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onDesde('')
            onHasta('')
          }}
        >
          Quitar
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="oferta-desde">Desde</Label>
          <Input
            id="oferta-desde"
            type="date"
            value={desde}
            onChange={(evento) => onDesde(evento.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="oferta-hasta">Hasta</Label>
          <Input
            id="oferta-hasta"
            type="date"
            min={desde || undefined}
            value={hasta}
            onChange={(evento) => onHasta(evento.target.value)}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Fuera de esas fechas no se ofrece. Vacías, se ofrece siempre.
      </p>
    </div>
  )
}
