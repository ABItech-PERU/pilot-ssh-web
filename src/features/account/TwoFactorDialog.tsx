import {
  ChevronRightIcon,
  KeyRoundIcon,
  MailIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useState } from 'react'

import { cn } from 'cn'
import { FormDialogContent } from '@/components/form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AuthenticatorSetup } from '@/features/account/AuthenticatorSetup'
import { describirDosPasos, quedanPocosRespaldos } from '@/features/account/dos-pasos'
import {
  EmailTwoFactorSetup,
  RecoveryCodesRenewal,
  TwoFactorDisable,
} from '@/features/account/TwoFactorFlows'
import { esPersonal } from '@/features/backoffice/permisos'
import type { CurrentUser } from '@/types/api'

type Vista = 'elegir' | 'app' | 'correo' | 'gestionar' | 'respaldos' | 'desactivar'

interface Props {
  user: CurrentUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Activar, cambiar de método y desactivar sin salir del diálogo. */
export function TwoFactorDialog({ user, open, onOpenChange }: Props) {
  // Con códigos de respaldo en pantalla sin guardar, no se cierra de un clic
  const [bloqueado, setBloqueado] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => (abierto || !bloqueado) && onOpenChange(abierto)}
    >
      <FormDialogContent
        className="sm:max-w-md"
        onInteractOutside={(evento) => bloqueado && evento.preventDefault()}
        onEscapeKeyDown={(evento) => bloqueado && evento.preventDefault()}
      >
        {/* Se monta en cada apertura: empieza por el principio */}
        <Vistas
          user={user}
          onBloquear={setBloqueado}
          onCerrar={() => onOpenChange(false)}
        />
      </FormDialogContent>
    </Dialog>
  )
}

function Vistas({
  user,
  onBloquear,
  onCerrar,
}: {
  user: CurrentUser
  onBloquear: (bloqueado: boolean) => void
  onCerrar: () => void
}) {
  const estado = describirDosPasos(user)
  // Fija al abrir: activar cambia `user` sin sacar del paso en curso
  const [inicial] = useState<Vista>(estado === 'desactivada' ? 'elegir' : 'gestionar')
  const [vista, setVista] = useState<Vista>(inicial)

  return (
    <>
      {vista === 'elegir' && <Elegir correo={user.email} onElegir={setVista} />}
      {vista === 'app' && (
        <AuthenticatorSetup
          correo={user.email}
          onVolver={() => setVista(inicial)}
          onBloquear={onBloquear}
          onListo={onCerrar}
        />
      )}
      {vista === 'correo' && (
        <EmailTwoFactorSetup
          correo={user.email}
          onVolver={() => setVista('elegir')}
          onListo={onCerrar}
        />
      )}
      {vista === 'gestionar' && (
        <Gestionar user={user} onIr={setVista} onCerrar={onCerrar} />
      )}
      {vista === 'respaldos' && (
        <RecoveryCodesRenewal
          correo={user.email}
          onVolver={() => setVista('gestionar')}
          onBloquear={onBloquear}
          onListo={() => setVista('gestionar')}
        />
      )}
      {vista === 'desactivar' && (
        <TwoFactorDisable
          conApp={estado === 'app'}
          esPersonal={esPersonal(user)}
          onVolver={() => setVista('gestionar')}
          onListo={onCerrar}
        />
      )}
    </>
  )
}

function Elegir({
  correo,
  onElegir,
}: {
  correo: string
  onElegir: (vista: Vista) => void
}) {
  return (
    <>
      <DialogHeader className="space-y-3">
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <ShieldCheckIcon className="size-5" />
        </span>
        <DialogTitle>Verificación en dos pasos</DialogTitle>
        <DialogDescription>
          Además de la contraseña, cada inicio de sesión pedirá un código. Elija de dónde
          sale.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <Metodo
          icono={SmartphoneIcon}
          titulo="App autenticadora"
          recomendada
          descripcion="Google Authenticator, Microsoft Authenticator o 1Password. Funciona sin conexión."
          onClick={() => onElegir('app')}
        />
        <Metodo
          icono={MailIcon}
          titulo="Código por correo"
          descripcion={`Llega a ${correo} en cada inicio de sesión.`}
          onClick={() => onElegir('correo')}
        />
      </div>
    </>
  )
}

function Metodo({
  icono: Icono,
  titulo,
  descripcion,
  recomendada = false,
  onClick,
}: {
  icono: React.ElementType
  titulo: string
  descripcion: string
  recomendada?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'hover:border-ring focus-visible:outline-ring group flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1',
        recomendada && 'border-primary/40 bg-primary/5',
      )}
    >
      <span className="bg-muted text-foreground grid size-10 shrink-0 place-items-center rounded-lg">
        <Icono className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {titulo}
          {recomendada && (
            <Badge className="bg-primary/15 text-primary border-transparent font-normal">
              Recomendada
            </Badge>
          )}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs text-pretty">
          {descripcion}
        </span>
      </span>
      <ChevronRightIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

function Gestionar({
  user,
  onIr,
  onCerrar,
}: {
  user: CurrentUser
  onIr: (vista: Vista) => void
  onCerrar: () => void
}) {
  const conApp = describirDosPasos(user) === 'app'
  const quedan = user.recovery_codes_left
  const pocos = quedanPocosRespaldos(quedan)

  return (
    <>
      <DialogHeader className="space-y-3">
        <span className="bg-success/10 text-success flex size-11 items-center justify-center rounded-full">
          <ShieldCheckIcon className="size-5" />
        </span>
        <DialogTitle>Verificación en dos pasos activada</DialogTitle>
        <DialogDescription>
          {conApp
            ? 'Cada inicio de sesión pide el código de su app autenticadora.'
            : `Cada inicio de sesión pide un código enviado a ${user.email}.`}
        </DialogDescription>
      </DialogHeader>

      <div className="divide-y rounded-lg border">
        <div className="flex items-center gap-3 p-4">
          {conApp ? (
            <SmartphoneIcon className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <MailIcon className="text-muted-foreground size-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1 text-sm font-medium">
            {conApp ? 'App autenticadora' : 'Código por correo'}
          </span>
          <Badge className="bg-success/15 text-success border-transparent font-normal">
            Activa
          </Badge>
        </div>

        {conApp && (
          <div className="flex flex-wrap items-center gap-3 p-4">
            <KeyRoundIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Códigos de respaldo</span>
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  pocos ? 'text-warning' : 'text-muted-foreground',
                )}
              >
                {pocos && <TriangleAlertIcon className="size-3.5" />}
                {quedan === 1 ? 'Queda 1 sin usar' : `Quedan ${quedan ?? 0} sin usar`}
              </span>
            </span>
            <Button variant="outline" size="sm" onClick={() => onIr('respaldos')}>
              Generar nuevos
            </Button>
          </div>
        )}
      </div>

      {!conApp && (
        <div className="border-primary/30 bg-primary/5 space-y-3 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Más segura con una app</p>
            <p className="text-muted-foreground text-xs text-pretty">
              Si alguien entra a su correo, tendría las dos llaves. Con la app, el código
              solo está en su teléfono.
            </p>
          </div>
          <Button size="sm" onClick={() => onIr('app')}>
            <SmartphoneIcon />
            Cambiar a app autenticadora
          </Button>
        </div>
      )}

      <DialogFooter className="sm:justify-between">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => onIr('desactivar')}
        >
          Desactivar
        </Button>
        <Button variant="outline" onClick={onCerrar}>
          Cerrar
        </Button>
      </DialogFooter>
    </>
  )
}
