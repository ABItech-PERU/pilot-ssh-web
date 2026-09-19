import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAISES, partirTelefono, soloDigitos, unirTelefono } from '@/lib/telefonos'

interface Props {
  id: string
  /** El número entero, con prefijo: «+51987654321». */
  valor: string
  onChange: (valor: string) => void
  invalido?: boolean
  autoFocus?: boolean
}

/** Teléfono con el país aparte. Se guarda junto y con prefijo, en E.164. */
export function PhoneField({ id, valor, onChange, invalido, autoFocus }: Props) {
  const { prefijo, numero } = partirTelefono(valor)
  const pais = PAISES.find((fila) => fila.prefijo === prefijo) ?? PAISES[0]!
  const largo = pais.digitos

  return (
    <div className="flex gap-2">
      <Select
        value={pais.prefijo}
        onValueChange={(nuevo) => onChange(unirTelefono(nuevo, numero))}
      >
        <SelectTrigger
          aria-label="País del teléfono"
          className="w-[8.5rem] shrink-0 tabular-nums"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAISES.map((fila) => (
            <SelectItem key={fila.codigo} value={fila.prefijo}>
              <span className="flex items-center gap-2">
                <span aria-hidden>{fila.bandera}</span>
                <span className="tabular-nums">{fila.prefijo}</span>
                <span className="text-muted-foreground text-xs">{fila.nombre}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        // Tope del país elegido: un dígito de más es un error de escritura
        maxLength={largo}
        autoFocus={autoFocus}
        placeholder={'9'.repeat(Math.min(largo, 9))}
        value={numero}
        aria-invalid={invalido}
        onChange={(evento) =>
          onChange(
            unirTelefono(pais.prefijo, soloDigitos(evento.target.value).slice(0, largo)),
          )
        }
      />
    </div>
  )
}
