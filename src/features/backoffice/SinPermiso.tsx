import { LockIcon } from 'lucide-react'

import { EmptyState, PageHeader } from '@/components/states'
import { PERMISOS } from '@/features/backoffice/permisos'
import type { StaffCapability } from '@/types/api'

interface Props {
  titulo: string
  descripcion: string
  permiso: StaffCapability
}

/** En lugar de una tabla que el servidor negaría: qué permiso hace falta
 *  y a quién pedirlo. */
export function SinPermiso({ titulo, descripcion, permiso }: Props) {
  const nombre = PERMISOS.find((opcion) => opcion.clave === permiso)?.nombre

  return (
    <div className="space-y-6">
      <PageHeader title={titulo} description={descripcion} />
      <EmptyState
        enmarcado
        icon={LockIcon}
        title={`Requiere el permiso de ${nombre}`}
        description="Pídalo a quien gestiona el personal."
      />
    </div>
  )
}
