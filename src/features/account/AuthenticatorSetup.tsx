import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  SmartphoneIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { CodeInput } from '@/components/code-input'
import { FieldError } from '@/components/field-error'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { CodigoQR } from '@/features/account/CodigoQR'
import { agruparClave } from '@/features/account/dos-pasos'
import { RecoveryCodes } from '@/features/account/RecoveryCodes'
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'

type Paso = 'clave' | 'escanear' | 'respaldo'

const NUMERO: Record<Paso, number> = { clave: 1, escanear: 2, respaldo: 3 }

interface Props {
  correo: string
  onVolver: () => void
  /** El diálogo no se cierra con los códigos sin guardar. */
  onBloquear: (bloqueado: boolean) => void
  onListo: () => void
}

/** Contraseña, QR y códigos de respaldo. Hasta el primer código correcto
 *  la cuenta sigue como estaba. */
export function AuthenticatorSetup({ correo, onVolver, onBloquear, onListo }: Props) {
  const cliente = useQueryClient()
  const [paso, setPaso] = useState<Paso>('clave')
  const [clave, setClave] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [alta, setAlta] = useState<{ secret: string; uri: string } | null>(null)
  const [respaldos, setRespaldos] = useState<string[]>([])
  const [guardados, setGuardados] = useState(false)

  const empezar = useMutation({
    mutationFn: () => authApi.startAuthenticatorSetup(clave),
    onSuccess: (datos) => {
      setAlta(datos)
      setError(undefined)
      setPaso('escanear')
    },
    onError: (fallo) => {
      const api = toApiError(fallo)
      setError(api.fieldErrors.current_password?.[0] ?? api.message)
    },
  })

  const confirmar = useMutation({
    mutationFn: (valor: string) => authApi.confirmAuthenticator(valor),
    onSuccess: async ({ recovery_codes }) => {
      setRespaldos(recovery_codes)
      setPaso('respaldo')
      onBloquear(true)
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
    },
    onError: (fallo) => {
      const api = toApiError(fallo)
      setError(api.fieldErrors.code?.[0] ?? api.message)
      setCodigo('')
    },
  })

  // Seis cifras: se comprueba solo
  const alTeclear = (valor: string) => {
    setCodigo(valor)
    setError(undefined)
    if (valor.length === 6 && !confirmar.isPending) confirmar.mutate(valor)
  }

  const terminar = () => {
    onBloquear(false)
    toast.success('App autenticadora activada.')
    onListo()
  }

  return (
    <>
      <DialogHeader className="space-y-3">
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <SmartphoneIcon className="size-5" />
        </span>
        <p className="text-muted-foreground text-xs font-medium">
          Paso {NUMERO[paso]} de 3
        </p>
        <DialogTitle>
          {paso === 'clave'
            ? 'Confirme que es usted'
            : paso === 'escanear'
              ? 'Escanee el código con su app'
              : 'Guarde sus códigos de respaldo'}
        </DialogTitle>
        <DialogDescription>
          {paso === 'clave'
            ? 'Escriba su contraseña para cambiar cómo se entra a su cuenta.'
            : paso === 'escanear'
              ? 'Sirve Google Authenticator, Microsoft Authenticator, 1Password u otra compatible.'
              : 'Si pierde el teléfono, cada código le deja entrar una vez. No se volverán a mostrar.'}
        </DialogDescription>
      </DialogHeader>

      {paso === 'clave' && (
        <form
          id="alta-app"
          className="space-y-2"
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault()
            empezar.mutate()
          }}
        >
          <Label htmlFor="clave-app">Contraseña actual</Label>
          <PasswordInput
            id="clave-app"
            autoComplete="current-password"
            autoFocus
            value={clave}
            aria-invalid={Boolean(error)}
            onChange={(evento) => {
              setClave(evento.target.value)
              setError(undefined)
            }}
          />
          <FieldError message={error} />
        </form>
      )}

      {paso === 'escanear' && alta && (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <CodigoQR valor={alta.uri} etiqueta="Código QR para su app autenticadora" />
            <ol className="text-muted-foreground space-y-2.5 text-sm">
              {[
                'Abra la app y toque «Añadir cuenta» o «+».',
                'Elija escanear y apunte a este código.',
                'Escriba abajo el código de seis dígitos que aparece.',
              ].map((texto, indice) => (
                <li key={texto} className="flex gap-2.5">
                  <span className="bg-muted text-foreground grid size-5 shrink-0 place-items-center rounded-full text-xs font-medium">
                    {indice + 1}
                  </span>
                  {texto}
                </li>
              ))}
            </ol>
          </div>

          {/* En el teléfono no se escanea la propia pantalla: se abre la app */}
          <Button asChild variant="outline" className="hidden w-full pointer-coarse:flex">
            <a href={alta.uri}>
              <ExternalLinkIcon />
              Abrir en mi app autenticadora
            </a>
          </Button>

          <ClaveManual clave={alta.secret} />

          <div className="space-y-2">
            <Label htmlFor="codigo-app">Código de la app</Label>
            <CodeInput
              id="codigo-app"
              autoFocus
              value={codigo}
              disabled={confirmar.isPending}
              aria-invalid={Boolean(error)}
              onValueChange={alTeclear}
            />
            <FieldError message={error} />
          </div>
        </div>
      )}

      {paso === 'respaldo' && (
        <RecoveryCodes
          codigos={respaldos}
          correo={correo}
          guardados={guardados}
          onGuardados={setGuardados}
        />
      )}

      <DialogFooter>
        {paso === 'clave' && (
          <Button
            type="submit"
            form="alta-app"
            disabled={clave.length === 0 || empezar.isPending}
          >
            {empezar.isPending && <Loader2Icon className="animate-spin" />}
            Continuar
          </Button>
        )}
        {paso === 'escanear' && (
          <Button
            disabled={codigo.length < 6 || confirmar.isPending}
            onClick={() => confirmar.mutate(codigo)}
          >
            {confirmar.isPending && <Loader2Icon className="animate-spin" />}
            Activar
          </Button>
        )}
        {paso === 'respaldo' ? (
          <Button disabled={!guardados} onClick={terminar}>
            <CheckIcon />
            Listo
          </Button>
        ) : (
          <Button variant="outline" onClick={onVolver}>
            Volver
          </Button>
        )}
      </DialogFooter>
    </>
  )
}

/** Sin cámara: la clave a mano. */
function ClaveManual({ clave }: { clave: string }) {
  const [abierta, setAbierta] = useState(false)
  const [copiada, setCopiada] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(clave)
      setCopiada(true)
      window.setTimeout(() => setCopiada(false), 1600)
    } catch {
      // Sin portapapeles: la clave sigue a la vista
    }
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta((actual) => !actual)}
        className="focus-visible:outline-ring flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:-outline-offset-2 focus-visible:outline-1"
      >
        ¿No puede escanearlo?
        <ChevronDownIcon
          className={cn(
            'text-muted-foreground size-4 transition-transform',
            abierta && 'rotate-180',
          )}
        />
      </button>
      {abierta && (
        <div className="space-y-3 border-t px-3 py-3">
          <p className="text-muted-foreground text-xs">
            En la app, elija «Introducir clave» y escriba esta, basada en el tiempo.
          </p>
          <div className="flex items-center gap-2">
            <code className="font-machine bg-muted/60 min-w-0 flex-1 rounded-md px-3 py-2 text-sm break-words">
              {agruparClave(clave)}
            </code>
            <Button type="button" variant="outline" size="icon" onClick={copiar}>
              {copiada ? <CheckIcon className="text-success" /> : <CopyIcon />}
              <span className="sr-only">{copiada ? 'Copiada' : 'Copiar la clave'}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
