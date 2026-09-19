import {
  BuildingIcon,
  LockKeyholeIcon,
  MailIcon,
  PhoneIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { SettingsRow, SettingsSection } from '@/components/settings-section'
import { PageHeader } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountActivity } from '@/features/account/AccountActivity'
import { AccountAvatar } from '@/features/account/AccountAvatar'
import { AccountEmailDialog } from '@/features/account/AccountEmailDialog'
import {
  AccountNameDialog,
  AccountPasswordDialog,
  AccountPhoneDialog,
} from '@/features/account/AccountFieldDialog'
import { OpenSessions } from '@/features/account/OpenSessions'
import { TimeZoneSettings } from '@/features/account/TimeZoneSettings'
import {
  TwoFactorDisableDialog,
  TwoFactorEnableDialog,
} from '@/features/account/TwoFactorDialog'
import { useSession } from '@/features/auth/session'
import { formatearTelefono } from '@/lib/telefonos'

type Ajustable = 'nombre' | 'telefono' | 'correo' | 'clave' | 'dos-pasos'

/** Datos de la cuenta y forma de acceso; cada dato se cambia por separado. */
export function AccountPage() {
  const { user } = useSession()
  const [parametros] = useSearchParams()
  // `?editar=dos-pasos`: la plataforma envía aquí a quien le faltan los dos
  // pasos, con el diálogo ya abierto
  const [editando, setEditando] = useState<Ajustable | null>(
    parametros.get('editar') === 'dos-pasos' ? 'dos-pasos' : null,
  )
  if (!user) return <Esqueleto />

  const alCerrar = (clave: Ajustable) => (abierto: boolean) =>
    setEditando(abierto ? clave : null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuenta"
        description="Sus datos, su zona horaria y cómo accede a Pilot SSH."
      />

      <section className="bg-muted/40 flex flex-col items-start gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
        <AccountAvatar user={user} />
        <div className="w-full min-w-0 flex-1 space-y-1.5">
          <p className="truncate text-xl font-semibold">{user.display_name}</p>
          {/* Sin truncar: en móvil el correo es lo que se viene a leer */}
          <p className="text-muted-foreground font-machine text-sm break-all">
            {user.email}
          </p>
          <span className="flex flex-wrap items-center gap-2 pt-1">
            {user.two_factor_enabled ? (
              <Badge variant="secondary" className="gap-1.5 font-normal">
                <ShieldCheckIcon className="text-success size-3.5" />
                Dos pasos activada
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditando('dos-pasos')}
              >
                <ShieldCheckIcon />
                Activar dos pasos
              </Button>
            )}
            <Badge variant="outline" className="gap-1.5 font-normal">
              <BuildingIcon className="size-3.5" />
              {user.organizations.length === 1
                ? '1 organización'
                : `${user.organizations.length} organizaciones`}
            </Badge>
          </span>
        </div>
      </section>

      <SettingsSection titulo="Datos personales">
        <SettingsRow
          icono={UserIcon}
          etiqueta="Nombre"
          onEditar={() => setEditando('nombre')}
        >
          {user.full_name || 'Sin registrar'}
        </SettingsRow>
        <SettingsRow
          icono={PhoneIcon}
          etiqueta="Teléfono o WhatsApp"
          onEditar={() => setEditando('telefono')}
        >
          {formatearTelefono(user.phone) || 'Sin registrar'}
        </SettingsRow>
      </SettingsSection>

      <TimeZoneSettings user={user} />

      <SettingsSection titulo="Acceso">
        <SettingsRow
          icono={MailIcon}
          etiqueta="Correo"
          pista="Con él se inicia sesión."
          onEditar={() => setEditando('correo')}
        >
          <span className="font-machine">{user.email}</span>
        </SettingsRow>
        <SettingsRow
          icono={LockKeyholeIcon}
          etiqueta="Contraseña"
          onEditar={() => setEditando('clave')}
        >
          <span className="font-machine tracking-widest">••••••••</span>
        </SettingsRow>
        <SettingsRow
          icono={ShieldCheckIcon}
          etiqueta="Verificación en dos pasos"
          pista="Un código al correo en cada inicio de sesión."
          accion={user.two_factor_enabled ? 'Desactivar' : 'Activar'}
          onEditar={() => setEditando('dos-pasos')}
        >
          {user.two_factor_enabled ? (
            <span className="text-success inline-flex items-center gap-1.5">
              <ShieldCheckIcon className="size-4" />
              Activada
            </span>
          ) : (
            <span className="text-warning inline-flex items-center gap-1.5">
              <ShieldAlertIcon className="size-4" />
              Desactivada
            </span>
          )}
        </SettingsRow>
        {user.social_accounts.length > 0 && (
          <SettingsRow icono={MailIcon} etiqueta="Cuentas conectadas">
            <span className="flex flex-wrap justify-end gap-1.5">
              {user.social_accounts.map((cuenta) => (
                <Badge key={cuenta.provider} variant="secondary" className="font-normal">
                  {cuenta.email}
                </Badge>
              ))}
            </span>
          </SettingsRow>
        )}
      </SettingsSection>

      <OpenSessions />

      <AccountActivity />

      <AccountNameDialog
        user={user}
        open={editando === 'nombre'}
        onOpenChange={alCerrar('nombre')}
      />
      <AccountPhoneDialog
        user={user}
        open={editando === 'telefono'}
        onOpenChange={alCerrar('telefono')}
      />
      <AccountEmailDialog
        open={editando === 'correo'}
        onOpenChange={alCerrar('correo')}
      />
      <AccountPasswordDialog
        open={editando === 'clave'}
        onOpenChange={alCerrar('clave')}
      />
      <TwoFactorEnableDialog
        email={user.email}
        open={editando === 'dos-pasos' && !user.two_factor_enabled}
        onOpenChange={alCerrar('dos-pasos')}
      />
      <TwoFactorDisableDialog
        open={editando === 'dos-pasos' && user.two_factor_enabled}
        onOpenChange={alCerrar('dos-pasos')}
      />
    </div>
  )
}

function Esqueleto() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-52 rounded-lg" />
    </div>
  )
}
