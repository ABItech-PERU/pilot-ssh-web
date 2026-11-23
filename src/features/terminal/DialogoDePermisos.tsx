import { Loader2Icon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

import { FormDialogContent } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  type Acceso,
  type Cuadricula,
  describePermisos,
  esModoValido,
  fetchCuadricula,
  fetchOctal,
  fetchOctalDeCuadricula,
} from '@/features/terminal/archivos'

interface Props {
  /** El elegido; null con el diálogo cerrado. */
  entrada: { nombre: string; ruta: string; permisos: string } | null
  pendiente: boolean
  onGuardar: (ruta: string, modo: string) => void
  onCerrar: () => void
}

const FILAS: { quien: keyof Cuadricula; etiqueta: string }[] = [
  { quien: 'propietario', etiqueta: 'Propietario' },
  { quien: 'grupo', etiqueta: 'Grupo' },
  { quien: 'otros', etiqueta: 'Otros' },
]

const COLUMNAS: { acceso: keyof Acceso; etiqueta: string }[] = [
  { acceso: 'leer', etiqueta: 'Leer' },
  { acceso: 'escribir', etiqueta: 'Escribir' },
  { acceso: 'ejecutar', etiqueta: 'Ejecutar' },
]

/** Casillas y número a la par, como en cualquier cliente SFTP. */
export function DialogoDePermisos({ entrada, pendiente, onGuardar, onCerrar }: Props) {
  const idNumero = useId()
  const [modo, setModo] = useState('644')
  const [tecleado, setTecleado] = useState('644')
  // El nombre sigue a la vista mientras el diálogo se cierra con su animación
  const [nombre, setNombre] = useState('')

  // Por valor, porque el objeto llega nuevo en cada render y borraría lo marcado
  const permisosDeEntrada = entrada?.permisos
  const rutaDeEntrada = entrada?.ruta
  useEffect(() => {
    if (permisosDeEntrada === undefined || rutaDeEntrada === undefined) return
    const actual = fetchOctal(permisosDeEntrada)
    setModo(actual)
    setTecleado(actual)
  }, [permisosDeEntrada, rutaDeEntrada])

  const nombreDeEntrada = entrada?.nombre
  useEffect(() => {
    if (nombreDeEntrada) setNombre(nombreDeEntrada)
  }, [nombreDeEntrada])

  const cuadricula = fetchCuadricula(modo)
  const actual = entrada ? fetchOctal(entrada.permisos) : modo

  const marcar = (quien: keyof Cuadricula, acceso: keyof Acceso, valor: boolean) => {
    const nueva = { ...cuadricula, [quien]: { ...cuadricula[quien], [acceso]: valor } }
    const numero = fetchOctalDeCuadricula(nueva)
    setModo(numero)
    setTecleado(numero)
  }

  return (
    <Dialog open={entrada !== null} onOpenChange={(sigue) => !sigue && onCerrar()}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permisos de {nombre}</DialogTitle>
          <DialogDescription>Quién puede leerlo, cambiarlo o ejecutarlo.</DialogDescription>
        </DialogHeader>

        <form
          id="permisos"
          onSubmit={(evento) => {
            evento.preventDefault()
            if (entrada && esModoValido(modo)) onGuardar(entrada.ruta, modo)
          }}
          className="space-y-4"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="py-1 text-left font-normal">
                  <span className="sr-only">Quién</span>
                </th>
                {COLUMNAS.map((columna) => (
                  <th key={columna.acceso} className="py-1 font-normal">
                    {columna.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FILAS.map((fila) => (
                <tr key={fila.quien} className="border-t">
                  <th scope="row" className="py-2 text-left font-medium">
                    {fila.etiqueta}
                  </th>
                  {COLUMNAS.map((columna) => (
                    <td key={columna.acceso} className="py-2 text-center">
                      <Checkbox
                        aria-label={`${fila.etiqueta}: ${columna.etiqueta.toLowerCase()}`}
                        checked={cuadricula[fila.quien][columna.acceso]}
                        onCheckedChange={(valor) =>
                          marcar(fila.quien, columna.acceso, valor === true)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={idNumero}>En número</Label>
              <Input
                id={idNumero}
                inputMode="numeric"
                maxLength={3}
                className="font-machine w-20"
                value={tecleado}
                aria-invalid={!esModoValido(tecleado)}
                onChange={(evento) => {
                  const valor = evento.target.value.replace(/[^0-7]/g, '')
                  setTecleado(valor)
                  if (esModoValido(valor)) setModo(valor)
                }}
              />
            </div>
            <p className="text-muted-foreground font-machine pb-2 text-sm">
              {describePermisos(modo)}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            Los permisos especiales (setgid, sticky) se conservan.
          </p>
        </form>

        <DialogFooter>
          <Button
            type="submit"
            form="permisos"
            disabled={pendiente || !esModoValido(tecleado) || modo === actual}
            className="min-w-36"
          >
            {pendiente && <Loader2Icon className="animate-spin" />}
            Cambiar permisos
          </Button>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
