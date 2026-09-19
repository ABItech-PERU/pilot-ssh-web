import { ChoiceCard } from '@/components/choice-card'
import { ColorChip } from '@/components/color-chip'
import { InfoHint } from '@/components/info-hint'
import * as serversApi from '@/features/servers/api'
import type { PaletteColor } from '@/types/api'

interface Plantilla {
  key: string
  values: string[]
  colores: Record<string, PaletteColor>
  porDefecto: boolean
}

/** Etiquetas con que nace un espacio: con «Entorno» ya se puede dar
 *  producción a un grupo entero el primer día.
 *
 *  Colores fijos y sin repetir: rojo solo en criticidad («atienda esto»);
 *  en entorno, azul producción, violeta pruebas y verde desarrollo.
 *  Valores de menos a más, en el orden en que sube un cambio. */
export const PLANTILLA: Plantilla[] = [
  {
    key: 'Entorno',
    values: ['Desarrollo', 'Pruebas', 'Producción'],
    colores: { Producción: 'blue', Pruebas: 'violet', Desarrollo: 'green' },
    porDefecto: true,
  },
  {
    key: 'Criticidad',
    values: ['Baja', 'Media', 'Alta'],
    colores: { Alta: 'red', Media: 'amber', Baja: 'slate' },
    porDefecto: false,
  },
]

export const ETIQUETAS_POR_DEFECTO = PLANTILLA.filter((una) => una.porDefecto).map(
  (una) => una.key,
)

/** Devuelve las fallidas en vez de fallar entero: el espacio ya existe. */
export async function aplicarPlantilla(
  slug: string,
  elegidas: string[],
): Promise<string[]> {
  const fallidas: string[] = []

  for (const etiqueta of PLANTILLA.filter((una) => elegidas.includes(una.key))) {
    try {
      await serversApi.defineLabel({
        organization: slug,
        key: etiqueta.key,
        values: etiqueta.values,
        colors: etiqueta.colores,
      })
    } catch {
      fallidas.push(etiqueta.key)
    }
  }

  return fallidas
}

/** Mismas fichas al crear una organización y en el alta de la cuenta. */
export function LabelTemplateField({
  elegidas,
  onChange,
}: {
  elegidas: string[]
  onChange: (elegidas: string[]) => void
}) {
  const alternar = (clave: string) =>
    onChange(
      elegidas.includes(clave)
        ? elegidas.filter((una) => una !== clave)
        : [...elegidas, clave],
    )

  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-1.5 text-sm font-medium">
        Etiquetas para empezar
        <InfoHint etiqueta="Para qué sirven las etiquetas">
          Agrupan servidores y credenciales para dar acceso a todos de una vez.
        </InfoHint>
      </legend>
      <div className="grid gap-2">
        {PLANTILLA.map((etiqueta) => (
          <ChoiceCard
            key={etiqueta.key}
            tipo="casilla"
            elegida={elegidas.includes(etiqueta.key)}
            titulo={etiqueta.key}
            pie={
              <span className="mt-1 flex flex-wrap gap-1">
                {etiqueta.values.map((valor) => (
                  <ColorChip key={valor} color={etiqueta.colores[valor]}>
                    {valor}
                  </ColorChip>
                ))}
              </span>
            }
            onClick={() => alternar(etiqueta.key)}
          />
        ))}
      </div>
    </fieldset>
  )
}
