import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { PasswordInput } from '@/components/password-input'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/field-error'
import * as serversApi from '@/features/servers/api'
import { LabelsField } from '@/features/servers/LabelsField'
import { esquemaEnlace, LinksField } from '@/features/servers/LinksField'
import { OptionalSection } from '@/features/servers/OptionalSection'
import { useCurrentOrganization } from '@/features/organizations/current'
import { useServerOptions } from '@/features/servers/use-server-options'
import { puedeGestionar } from '@/features/access/levels'
import { applyFieldErrors } from '@/lib/form'
import type { Server, ServerUser } from '@/types/api'

/** Secreto obligatorio en el alta; en edicion, vacio conserva el actual.
 *  Desde Credenciales, sin servidor de partida, hay que elegirlo. */
function buildEsquema(esEdicion: boolean, pideServidor: boolean) {
  return z
    .object({
      server: z.string(),
      username: z.string().trim().min(1, 'Indique el usuario de acceso.'),
      auth_type: z.enum(['password', 'key']),
      password: z.string(),
      private_key: z.string(),
      working_directory: z.string().trim(),
      links: z.array(esquemaEnlace),
      labels: z.record(z.string(), z.string()),
      notes: z.string().trim(),
    })
    .superRefine((valores, contexto) => {
      if (pideServidor && !valores.server) {
        contexto.addIssue({
          code: 'custom',
          path: ['server'],
          message: 'Seleccione el servidor.',
        })
      }
      if (esEdicion) return
      if (valores.auth_type === 'password' && !valores.password) {
        contexto.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Indique la contraseña de ese usuario.',
        })
      }
      if (valores.auth_type === 'key' && !valores.private_key.trim()) {
        contexto.addIssue({
          code: 'custom',
          path: ['private_key'],
          message: 'Pegue la llave privada.',
        })
      }
    })
}

type Esquema = ReturnType<typeof buildEsquema>
type Formulario = z.input<Esquema>
type Validado = z.output<Esquema>

const CAMPOS = [
  'server',
  'username',
  'auth_type',
  'password',
  'private_key',
  'working_directory',
  'links',
  'labels',
  'notes',
] as const

const VACIO: Formulario = {
  server: '',
  username: '',
  auth_type: 'password',
  password: '',
  private_key: '',
  working_directory: '',
  links: [],
  labels: {},
  notes: '',
}

/** Solo viaja el secreto escrito: en edicion, vacio conserva el actual. */
function pickSecret(
  valores: Validado,
): Pick<serversApi.CredentialInput, 'password' | 'private_key'> {
  if (valores.auth_type === 'password') {
    return valores.password ? { password: valores.password } : {}
  }
  return valores.private_key.trim() ? { private_key: valores.private_key } : {}
}

interface Props {
  server: Pick<Server, 'id' | 'name'> | null
  /** Con credencial edita; sin ella, da de alta. */
  credential?: ServerUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tras crear el servidor: el texto explica por que se pide ahora. */
  primeraVez?: boolean
}

/** Enlaces solo en el alta, varios de golpe; despues, uno a uno en su
 *  panel lateral. El secreto viaja una vez y no vuelve. */
export function CredentialFormDialog({
  server,
  credential = null,
  open,
  onOpenChange,
  primeraVez = false,
}: Props) {
  const cliente = useQueryClient()
  const [avisoGeneral, setAvisoGeneral] = useState<string | null>(null)
  const [extrasAbiertos, setExtrasAbiertos] = useState(false)
  const [etiquetasAbiertas, setEtiquetasAbiertas] = useState(false)
  const esEdicion = Boolean(credential)
  // Sin servidor de partida (desde Credenciales) el formulario lo pide
  const pideServidor = !esEdicion && !server
  const { servidores } = useServerOptions(open && pideServidor)
  const { slug } = useCurrentOrganization()
  const resolver = useMemo(
    () => zodResolver(buildEsquema(esEdicion, pideServidor)),
    [esEdicion, pideServidor],
  )

  const formulario = useForm<Formulario, unknown, Validado>({
    resolver,
    defaultValues: VACIO,
  })
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = formulario

  const tipo = watch('auth_type')

  useEffect(() => {
    if (!open) return
    setAvisoGeneral(null)
    reset(
      credential
        ? {
            // No se edita, pero el esquema lo exige
            server: credential.server,
            username: credential.username,
            auth_type: credential.auth_type,
            password: '',
            private_key: '',
            working_directory: credential.working_directory,
            links: [],
            labels: credential.labels,
            notes: credential.notes,
          }
        : VACIO,
    )
    // Lo opcional se abre solo si ya tiene contenido
    setExtrasAbiertos(
      Boolean(credential && (credential.working_directory || credential.notes)),
    )
    setEtiquetasAbiertas(Object.keys(credential?.labels ?? {}).length > 0)
  }, [open, credential, reset])

  const guardar = useMutation({
    mutationFn: (valores: Validado) => {
      const datos: serversApi.CredentialInput = {
        server: server?.id ?? valores.server,
        username: valores.username,
        auth_type: valores.auth_type,
        working_directory: valores.working_directory,
        // Sin valor es «sin definir»: no viaja y se quita
        labels: Object.fromEntries(
          Object.entries(valores.labels).filter(([, valor]) => valor !== ''),
        ),
        notes: valores.notes,
        ...pickSecret(valores),
      }
      // En edicion los enlaces no viajan: vacios los borrarian
      return credential
        ? serversApi.updateCredential(credential.id, datos)
        : serversApi.createCredential({ ...datos, links: valores.links })
    },
    onSuccess: async () => {
      // Afecta lista, detalle, filtro "sin credencial" y lista de credenciales
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      await cliente.invalidateQueries({ queryKey: ['credentials'] })
      toast.success(credential ? 'Credencial actualizada.' : 'Credencial añadida.')
      onOpenChange(false)
    },
    onError: (error) => setAvisoGeneral(applyFieldErrors(error, setError, CAMPOS)),
  })

  const nombreServidor = (
    <span className="text-foreground font-medium">{server?.name}</span>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>
            {credential
              ? 'Editar credencial'
              : primeraVez
                ? 'Ahora, la credencial'
                : 'Añadir credencial'}
          </DialogTitle>
          <DialogDescription>
            {credential ? (
              <>
                <span className="font-machine text-foreground">
                  {credential.username}
                </span>{' '}
                en {nombreServidor}.
              </>
            ) : primeraVez ? (
              <>
                Servidor registrado. Ahora, el usuario con el que se accede a{' '}
                {nombreServidor}.
              </>
            ) : pideServidor ? (
              <>Usuario con el que se accede a un servidor.</>
            ) : (
              <>Usuario con el que se accede a {nombreServidor}.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...formulario}>
          <form
            id="formulario-credencial"
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

            {pideServidor && (
              <div className="space-y-2">
                <Label htmlFor="server">Servidor</Label>
                <Select
                  value={watch('server')}
                  onValueChange={(valor) =>
                    setValue('server', valor, { shouldValidate: true })
                  }
                >
                  <SelectTrigger
                    id="server"
                    className="w-full"
                    aria-invalid={Boolean(errors.server)}
                  >
                    <SelectValue placeholder="Seleccione el servidor" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Solo servidores gestionables: el resto daria 403 */}
                    {servidores.filter(puedeGestionar).map((servidor) => (
                      <SelectItem key={servidor.id} value={servidor.id}>
                        {servidor.name}
                        <span className="text-muted-foreground font-machine text-xs">
                          {servidor.ip}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.server?.message && <FieldError message={errors.server.message} />}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                className="font-machine"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={!pideServidor}
                aria-invalid={Boolean(errors.username)}
                aria-describedby="pista-usuario"
                {...register('username')}
              />
              {errors.username?.message ? (
                <FieldError message={errors.username.message} />
              ) : (
                <p id="pista-usuario" className="text-muted-foreground text-xs">
                  Por ejemplo, root o deploy.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth_type">Cómo entra</Label>
              <Select
                value={tipo}
                onValueChange={(valor) =>
                  setValue('auth_type', valor as Formulario['auth_type'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="auth_type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">Con contraseña</SelectItem>
                  <SelectItem value="key">Con llave privada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipo === 'password' ? (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput
                  id="password"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="pista-contrasena"
                  {...register('password')}
                />
                {errors.password?.message ? (
                  <FieldError message={errors.password.message} />
                ) : (
                  <p id="pista-contrasena" className="text-muted-foreground text-xs">
                    {esEdicion
                      ? 'Déjela vacía para conservar la actual.'
                      : 'Se guarda protegida y no se vuelve a mostrar.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="private_key">Llave privada</Label>
                <Textarea
                  id="private_key"
                  rows={6}
                  className="font-machine text-xs"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.private_key)}
                  aria-describedby="pista-llave"
                  {...register('private_key')}
                />
                {errors.private_key?.message ? (
                  <FieldError message={errors.private_key.message} />
                ) : (
                  <p id="pista-llave" className="text-muted-foreground text-xs">
                    {esEdicion
                      ? 'Déjela vacía para conservar la actual.'
                      : 'Pegue el archivo completo.'}
                  </p>
                )}
              </div>
            )}

            <OptionalSection
              id="credencial-extras"
              titulo={esEdicion ? 'Carpeta y notas' : 'Enlaces y carpeta'}
              abierta={extrasAbiertos}
              onToggle={() => setExtrasAbiertos((actual) => !actual)}
            >
              {!esEdicion && (
                <LinksField
                  etiqueta="Enlaces"
                  ayuda="Su web, su base de datos, su repositorio."
                  primerTipo="web"
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="working_directory">Carpeta de trabajo</Label>
                <Input
                  id="working_directory"
                  className="font-machine"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="/home/usuario/htdocs/mi-web"
                  aria-invalid={Boolean(errors.working_directory)}
                  aria-describedby="pista-carpeta"
                  {...register('working_directory')}
                />
                {errors.working_directory?.message ? (
                  <FieldError message={errors.working_directory.message} />
                ) : (
                  <p id="pista-carpeta" className="text-muted-foreground text-xs">
                    La terminal entra aquí al abrir.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" rows={3} {...register('notes')} />
              </div>
            </OptionalSection>

            {/* Solo en el alta; despues se cambian desde «Etiquetas», en el
                menu de su fila */}
            {!credential && (
              <OptionalSection
                id="credencial-etiquetas"
                titulo="Etiquetas"
                ayuda="Clasifican la credencial. Por ejemplo, Entorno: Producción."
                abierta={etiquetasAbiertas}
                onToggle={() => setEtiquetasAbiertas((actual) => !actual)}
              >
                <LabelsField slug={slug ?? ''} />
              </OptionalSection>
            )}
          </form>
        </FormProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="formulario-credencial" disabled={guardar.isPending}>
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            {credential ? 'Guardar cambios' : 'Añadir credencial'}
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
