import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react'
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
import { NumberInput } from '@/components/number-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import * as platformApi from '@/features/backoffice/api'
import { OrganizationPicker } from '@/features/backoffice/OrganizationPicker'
import { OrganizationAvatar } from '@/features/organizations/OrganizationAvatar'
import { toApiError } from '@/lib/api-error'
import { formatCredits } from '@/lib/format'
import type { CreditGrantKind, PlatformOrganization } from '@/types/api'

/** Color e imagen solo vienen de la lista; desde una recarga basta con
 *  nombre y dirección. */
type Elegible = Pick<PlatformOrganization, 'name' | 'slug'> &
  Partial<Pick<PlatformOrganization, 'color' | 'avatar_url'>>

interface Props {
  /** Null: se busca en el diálogo, como desde Recargas. */
  organizacion: Elegible | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TIPOS: { valor: CreditGrantKind; titulo: string; ayuda: string }[] = [
  {
    valor: 'grant',
    titulo: 'Asignación',
    ayuda:
      'Suma créditos sin cobrar nada: una cortesía, una compensación, una prueba. Lo que sí se cobró se registra en «Registrar cobro».',
  },
  {
    valor: 'adjustment',
    titulo: 'Ajuste',
    ayuda: 'Corrige el saldo en cualquier sentido. Con signo menos, resta.',
  },
]

interface Errores {
  amount?: string
  description?: string
}

/** Créditos a mano, siempre con motivo: el cliente lo lee en sus
 *  movimientos. */
export function CreditGrantDialog({ organizacion, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [elegida, setElegida] = useState<Elegible | null>(organizacion)
  const [tipo, setTipo] = useState<CreditGrantKind>('grant')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setElegida(organizacion)
    setTipo('grant')
    setCantidad('')
    setMotivo('')
    setErrores({})
    setAviso(null)
  }, [open, organizacion])

  const asignar = useMutation({
    mutationFn: () =>
      platformApi.grantCredits(elegida!.slug, {
        amount: cantidad.trim(),
        kind: tipo,
        description: motivo.trim(),
      }),
    onSuccess: async (movimiento) => {
      await platformApi.invalidarPlataforma(cliente)
      onOpenChange(false)
      toast.success(
        tipo === 'grant'
          ? `${formatCredits(movimiento.amount)} créditos asignados a ${elegida?.name}.`
          : `Saldo de ${elegida?.name} ajustado en ${formatCredits(movimiento.amount)} créditos.`,
      )
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setErrores({
        amount: fallo.fieldErrors.amount?.[0],
        description: fallo.fieldErrors.description?.[0],
      })
      if (!fallo.hasFieldErrors) setAviso(fallo.message)
    },
  })

  const listo = elegida !== null && cantidad.trim() !== '' && motivo.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>Asignar créditos</DialogTitle>
          <DialogDescription>
            {elegida
              ? `A ${elegida.name}. Queda en su libro mayor y en su auditoría, con su nombre.`
              : 'Elija a quién. Queda en su libro mayor y en su auditoría, con su nombre.'}
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        {/* Primero a quién */}
        {!elegida ? (
          <OrganizationPicker onElegir={setElegida} />
        ) : (
          <>
            {/* Elegida aquí: a la vista y con vuelta atrás, porque un error
                de organización no se deshace solo */}
            {organizacion === null && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <OrganizationAvatar
                  organization={{
                    name: elegida.name,
                    color: elegida.color ?? 'slate',
                    avatar_url: elegida.avatar_url ?? null,
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {elegida.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {elegida.slug}
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setElegida(null)}>
                  <RefreshCwIcon />
                  Cambiar
                </Button>
              </div>
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Qué es</legend>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                {TIPOS.map((opcion) => (
                  <ChoiceCard
                    key={opcion.valor}
                    tipo="radio"
                    elegida={tipo === opcion.valor}
                    titulo={opcion.titulo}
                    ayuda={opcion.ayuda}
                    onClick={() => setTipo(opcion.valor)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="creditos-a-mano">Créditos</Label>
              <NumberInput
                id="creditos-a-mano"
                inputMode="decimal"
                step="1"
                min={tipo === 'grant' ? 1 : undefined}
                autoComplete="off"
                autoFocus
                placeholder={tipo === 'grant' ? '500' : '-500'}
                value={cantidad}
                aria-invalid={Boolean(errores.amount)}
                onChange={(evento) => {
                  setCantidad(evento.target.value)
                  setErrores((actuales) => ({ ...actuales, amount: undefined }))
                }}
              />
              <FieldError message={errores.amount} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo-de-los-creditos">Motivo</Label>
              <Textarea
                id="motivo-de-los-creditos"
                rows={2}
                maxLength={255}
                placeholder="Compensación por la caída del 3 de septiembre"
                value={motivo}
                aria-invalid={Boolean(errores.description)}
                onChange={(evento) => {
                  setMotivo(evento.target.value)
                  setErrores((actuales) => ({ ...actuales, description: undefined }))
                }}
              />
              {errores.description ? (
                <FieldError message={errores.description} />
              ) : (
                <p className="text-muted-foreground text-xs">
                  Lo lee el cliente en sus movimientos.
                </p>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button disabled={!listo || asignar.isPending} onClick={() => asignar.mutate()}>
            {asignar.isPending && <Loader2Icon className="animate-spin" />}
            {tipo === 'grant' ? 'Asignar créditos' : 'Ajustar el saldo'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
