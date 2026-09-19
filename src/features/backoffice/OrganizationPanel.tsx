import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import * as platformApi from '@/features/backoffice/api'
import {
  OwnOrganizationNotice,
  SuspensionNotice,
} from '@/features/backoffice/CaseNotices'
import {
  AccountFacts,
  BalanceFacts,
  MoneyFacts,
  UsageFacts,
} from '@/features/backoffice/OrganizationFacts'
import { buildCasePath } from '@/features/backoffice/rutas'
import { OrganizationAvatar } from '@/features/organizations/OrganizationAvatar'
import type { PlatformOrganization } from '@/types/api'

interface Props {
  organizacion: PlatformOrganization | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Resumen junto a la lista: saldo, pagos, uso y responsable. El caso
 *  entero vive en su ficha. */
export function OrganizationPanel({ organizacion, open, onOpenChange }: Props) {
  // Billetera y actividad cuestan consultas: solo al abrir
  const detalle = useQuery({
    queryKey: platformApi.clavesPlataforma.organizacion(organizacion?.slug ?? ''),
    queryFn: () => platformApi.fetchOrganization(organizacion?.slug ?? ''),
    enabled: open && organizacion !== null,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        {/* Título fijo; el nombre completo va en el cuerpo, con las
            líneas que necesite */}
        <SidePanelHeader>
          <SheetTitle className="text-lg">Organización</SheetTitle>
          <SheetDescription>
            La cuenta, su dinero, su uso y quién la lleva.
          </SheetDescription>
        </SidePanelHeader>

        {organizacion && (
          <SidePanelBody>
            <div className="flex items-start gap-3 border-b px-5 py-4">
              <OrganizationAvatar organization={organizacion} tamano="md" />
              <div className="min-w-0">
                <p className="leading-snug font-semibold wrap-break-word">
                  {organizacion.name}
                </p>
                <p className="text-muted-foreground text-xs break-all">
                  {organizacion.slug}
                  {organizacion.is_personal && ' · espacio personal'}
                </p>
              </div>
            </div>

            {(organizacion.is_own || detalle.data?.suspension) && (
              <div className="space-y-2 border-b px-5 py-4">
                {organizacion.is_own && <OwnOrganizationNotice />}
                {detalle.data?.suspension && (
                  <SuspensionNotice suspension={detalle.data.suspension} />
                )}
              </div>
            )}

            <div className="divide-y">
              <BalanceFacts detalle={detalle.data} />
              <MoneyFacts organizacion={organizacion} detalle={detalle.data} />
              <UsageFacts organizacion={organizacion} detalle={detalle.data} />
              <AccountFacts organizacion={organizacion} detalle={detalle.data} />
            </div>
          </SidePanelBody>
        )}

        {organizacion && (
          <SidePanelFooter>
            <Button asChild className="flex-1">
              <Link to={buildCasePath(organizacion.slug)}>
                Abrir ficha
                <ArrowRightIcon />
              </Link>
            </Button>
          </SidePanelFooter>
        )}
      </SidePanelContent>
    </Sheet>
  )
}
