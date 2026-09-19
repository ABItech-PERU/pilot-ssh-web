import {
  BookOpenIcon,
  DatabaseIcon,
  GitBranchIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  LinkIcon,
} from 'lucide-react'

import type { LinkKind } from '@/types/api'

/** Fuente unica de icono y nombre por tipo, para formulario y fichas. */
export const TIPOS_DE_ENLACE: Record<
  LinkKind,
  { etiqueta: string; icono: React.ElementType }
> = {
  web: { etiqueta: 'Web', icono: GlobeIcon },
  panel: { etiqueta: 'Panel', icono: LayoutDashboardIcon },
  database: { etiqueta: 'Base de datos', icono: DatabaseIcon },
  repo: { etiqueta: 'Repositorio', icono: GitBranchIcon },
  docs: { etiqueta: 'Documentación', icono: BookOpenIcon },
  other: { etiqueta: 'Otro', icono: LinkIcon },
}

export const TIPOS = Object.keys(TIPOS_DE_ENLACE) as LinkKind[]

/** Solo http(s) se pinta como enlace. Lo exige el backend; esto cubre
 *  datos viejos o importados. */
export function isSafeHref(url: string): boolean {
  return /^https?:\/\//i.test(url)
}
