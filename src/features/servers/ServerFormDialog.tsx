import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormDialogContent } from '@/components/form-dialog'
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
import { FieldError } from '@/components/field-error'
import { useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'
import { LabelsField } from '@/features/servers/LabelsField'
import { esquemaEnlace, LinksField } from '@/features/servers/LinksField'
import { OptionalSection } from '@/features/servers/OptionalSection'
import { applyFieldErrors } from '@/lib/form'
import type { Server } from '@/types/api'

const esquema = z.object({
  name: z.string().trim().min(1, 'Indique un nombre que reconozca.'),
  ip: z.string().trim().min(1, 'Indique la dirección del servidor.'),
  port: z.coerce
    .number()
    .int('El puerto es un número entero.')
    .min(1, 'El puerto va entre 1 y 65535.')
    .max(65535, 'El puerto va entre 1 y 65535.'),
  links: z.array(esquemaEnlace),
  labels: z.record(z.string(), z.string()),
})

type Formulario = z.input<typeof esquema>
type Validado = z.output<typeof esquema>

const CAMPOS = ['name', 'ip', 'port', 'links', 'labels'] as const

const VACIO: Formulario = { name: '', ip: '', port: 22, links: [], labels: {} }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null`: alta. */
  server: Server | null
  /** Quien abre el dialogo decide el paso siguiente al alta. */
  onCreated?: (server: Server) => void
}

/** Enlaces solo en el alta, varios de golpe; despues, uno a uno en su
 *  panel lateral. */
export function ServerFormDialog({ open, onOpenChange, server, onCreated }: Props) {
  // Se anuncia al desmontar, no al guardar: el siguiente dialogo no se
  // solapa con el cierre de este
  const creado = useRef<Server | null>(null)
  const anunciarCreado = () => {
    if (!creado.current) return
    const server = creado.current
    creado.current = null
    onCreated?.(server)
  }
  const cliente = useQueryClient()
  const { slug, organization } = useCurrentOrganization()
  const [avisoGeneral, setAvisoGeneral] = useState<string | null>(null)
  const [enlacesAbiertos, setEnlacesAbiertos] = useState(false)
  const [etiquetasAbiertas, setEtiquetasAbiertas] = useState(false)

  const formulario = useForm<Formulario, unknown, Validado>({
    resolver: zodResolver(esquema),
    defaultValues: VACIO,
  })
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = formulario

  // Dialogo reutilizado entre alta y edicion: se reinicia en cada apertura
  useEffect(() => {
    if (!open) return
    setAvisoGeneral(null)
    setEnlacesAbiertos(false)
    // Con etiquetas puestas la seccion abre desplegada
    setEtiquetasAbiertas(Object.keys(server?.labels ?? {}).length > 0)
    reset(
      server
        ? {
            name: server.name,
            ip: server.ip,
            port: server.port,
            links: [],
            labels: server.labels,
          }
        : VACIO,
    )
  }, [open, server, reset])

  const guardar = useMutation({
    mutationFn: (valores: Validado) => {
      const datos = {
        name: valores.name,
        ip: valores.ip,
        port: valores.port,
        // Sin valor es «sin definir»: no viaja y el backend la quita
        labels: Object.fromEntries(
          Object.entries(valores.labels).filter(([, valor]) => valor !== ''),
        ),
      }
      return server
        ? serversApi.updateServer(server.id, datos)
        : serversApi.createServer({
            ...datos,
            links: valores.links,
            organization: organization?.id,
          })
    },
    onSuccess: async (guardado) => {
      // Todas las variantes de la lista (busqueda, orden, pagina) caducan
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      toast.success(server ? 'Servidor actualizado.' : 'Servidor añadido.')
      if (!server) creado.current = guardado
      onOpenChange(false)
    },
    onError: (error) => setAvisoGeneral(applyFieldErrors(error, setError, CAMPOS)),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent onCloseAutoFocus={anunciarCreado}>
        <DialogHeader>
          <DialogTitle>{server ? 'Editar servidor' : 'Añadir servidor'}</DialogTitle>
          <DialogDescription>
            {server
              ? 'Nombre, dirección y puerto.'
              : 'A continuación se añade la credencial de acceso.'}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...formulario}>
          <form
            id="formulario-servidor"
            onSubmit={handleSubmit((valores) => guardar.mutate(valores))}
            className="space-y-5"
            noValidate
          >
            {avisoGeneral && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{avisoGeneral}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                autoComplete="off"
                autoFocus
                aria-invalid={Boolean(errors.name)}
                aria-describedby="pista-nombre-servidor"
                {...register('name')}
              />
              {errors.name?.message ? (
                <FieldError message={errors.name.message} />
              ) : (
                <p id="pista-nombre-servidor" className="text-muted-foreground text-xs">
                  Por ejemplo, Producción web.
                </p>
              )}
            </div>

            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <div className="space-y-2">
                <Label htmlFor="ip">Dirección</Label>
                <Input
                  id="ip"
                  autoComplete="off"
                  className="font-machine"
                  placeholder="10.0.0.5"
                  aria-invalid={Boolean(errors.ip)}
                  {...register('ip')}
                />
                <FieldError message={errors.ip?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">Puerto</Label>
                <NumberInput
                  id="port"
                  autoComplete="off"
                  inputMode="numeric"
                  className="font-machine"
                  aria-invalid={Boolean(errors.port)}
                  {...register('port')}
                />
                <FieldError message={errors.port?.message} />
              </div>
            </div>

            {!server && (
              <OptionalSection
                id="servidor-enlaces"
                titulo="Enlaces del servidor"
                ayuda="El panel, el monitoreo y todo lo del servidor entero."
                abierta={enlacesAbiertos}
                onToggle={() => setEnlacesAbiertos((actual) => !actual)}
              >
                <LinksField primerTipo="panel" />
              </OptionalSection>
            )}

            <OptionalSection
              id="servidor-etiquetas"
              titulo="Etiquetas"
              ayuda="Clasifican el servidor. Por ejemplo, Cliente: Acme."
              abierta={etiquetasAbiertas}
              onToggle={() => setEtiquetasAbiertas((actual) => !actual)}
            >
              <LabelsField slug={slug ?? server?.organization_slug ?? ''} />
            </OptionalSection>
          </form>
        </FormProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="formulario-servidor" disabled={guardar.isPending}>
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            {server ? 'Guardar cambios' : 'Añadir servidor'}
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
