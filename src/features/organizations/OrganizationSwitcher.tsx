import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrganizationAvatar } from '@/features/organizations/OrganizationAvatar'
import { resolveLandingAfterSwitch } from '@/features/organizations/switch'
import { isOwnSpace, useCurrentOrganization } from '@/features/organizations/current'
import { OrganizationFormDialog } from '@/features/organizations/OrganizationFormDialog'
import type { OrganizationRole } from '@/types/api'

const ETIQUETA_ROL: Record<OrganizationRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Miembro',
}

/** Barra plegada: solo el icono; el nombre, al abrir el menú. */
export function OrganizationSwitcher({ compacta = false }: { compacta?: boolean }) {
  const { organization, organizations, setOrganization } = useCurrentOrganization()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const [creando, setCreando] = useState(false)

  const cambiar = (slug: string) => {
    setOrganization(slug)
    const destino = resolveLandingAfterSwitch(pathname)
    if (destino !== pathname) navegar(destino)
  }

  if (!organization) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={
            compacta
              ? 'h-auto w-full justify-center px-0 py-2'
              : 'h-auto w-full justify-between gap-2 px-2 py-2 text-left'
          }
          aria-label={compacta ? `Espacio de trabajo: ${organization.name}` : undefined}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <OrganizationAvatar organization={organization} />
            {!compacta && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {organization.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {organization.role ? ETIQUETA_ROL[organization.role] : 'Sin rol'}
                </span>
              </span>
            )}
          </span>
          {!compacta && (
            <ChevronsUpDownIcon className="text-muted-foreground size-4 shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>

      {/* Primero la organización actual y sus ajustes; después, a cuál
          cambiar */}
      <DropdownMenuContent align="start" className="w-72 p-0">
        <div className="p-3">
          <div className="flex items-center gap-3">
            <OrganizationAvatar organization={organization} tamano="md" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {organization.name}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {isOwnSpace(organization) ? 'Personal' : 'De equipo'} ·{' '}
                {organization.role ? ETIQUETA_ROL[organization.role] : 'Sin rol'}
              </span>
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <DropdownMenuItem
              className="justify-center rounded-md border"
              onSelect={() => navegar('/app/organization')}
            >
              <SettingsIcon className="size-4" />
              Ajustes
            </DropdownMenuItem>
            <DropdownMenuItem
              className="justify-center rounded-md border"
              onSelect={() => navegar('/app/team')}
            >
              <UsersIcon className="size-4" />
              Miembros
            </DropdownMenuItem>
          </div>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            Cambiar de organización
          </DropdownMenuLabel>

          {organizations.map((una) => (
            <DropdownMenuItem
              key={una.slug}
              onSelect={() => cambiar(una.slug)}
              className="gap-2"
            >
              <OrganizationAvatar organization={una} className="size-6 rounded" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{una.name}</span>
                <span className="text-muted-foreground block truncate font-mono text-[11px]">
                  {una.slug}
                </span>
              </span>
              {una.slug === organization.slug && (
                <CheckIcon className="size-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          <DropdownMenuItem onSelect={() => setCreando(true)}>
            <PlusIcon className="size-4" />
            Crear organización
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>

      <OrganizationFormDialog open={creando} onOpenChange={setCreando} />
    </DropdownMenu>
  )
}
