import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PanelDeArchivos } from '@/features/terminal/PanelDeArchivos'
import type {
  EntradaDeArchivo,
  MensajeDeArchivo,
  MensajeDeArchivos,
  MensajeDeContenido,
  MensajeDeTarea,
} from '@/features/terminal/socket'

const entrada = (
  nombre: string,
  tipo: EntradaDeArchivo['tipo'] = 'archivo',
  tamano = 10,
): EntradaDeArchivo => ({
  nombre,
  tipo,
  tamano,
  modificado: '2026-11-20T10:00:00Z',
  permisos: 'rw-r--r--',
})

function listado(
  entradas: EntradaDeArchivo[],
  cambios: Partial<MensajeDeArchivos> = {},
): MensajeDeArchivos {
  return {
    type: 'archivos',
    ruta: '/home/deploy',
    inicio: '/home/deploy',
    padre: '/home',
    entradas,
    recortada: false,
    ...cambios,
  }
}

const SITIO = listado([
  entrada('public', 'carpeta', 4096),
  entrada('.env', 'archivo', 31),
  entrada('app.log', 'archivo', 2_500_000),
  entrada('notas.txt', 'archivo', 8),
  entrada('sitio.tar.gz', 'archivo', 2048),
])

const HECHO: MensajeDeArchivo = { type: 'archivo', accion: 'borrar', estado: 'hecho' }

/** Lo que contesta el servidor a cada tarea; una carpeta pequeña por defecto. */
function tareaHecha(medida = { archivos: 3, carpetas: 1, kb: 12 }) {
  return vi.fn(
    async (accion: MensajeDeTarea['accion'], ruta: string): Promise<MensajeDeTarea> => ({
      type: 'tarea',
      accion,
      pedida: ruta,
      estado: 'hecho',
      ...medida,
      nombre: accion === 'comprimir' ? 'public.tar.gz' : 'sitio',
    }),
  )
}

function montar(primero: MensajeDeArchivos = SITIO, ejecutarTarea = tareaHecha()) {
  const props = {
    ejecutarTarea,
    pedirArchivos: vi.fn().mockResolvedValue(primero),
    cambiarArchivo: vi.fn().mockResolvedValue(HECHO),
    pedirContenido: vi.fn().mockResolvedValue({
      type: 'contenido',
      estado: 'listo',
      ruta: '/home/deploy/notas.txt',
      nombre: 'notas.txt',
      texto: 'hola\n',
      tamano: 5,
      version: 'v1',
      recortado: false,
      editable: true,
    } satisfies MensajeDeContenido),
    guardarContenido: vi.fn(),
    descargar: vi.fn(),
    subir: vi.fn().mockResolvedValue(undefined),
    abrirEnTerminal: vi.fn(),
    onCerrar: vi.fn(),
  }
  render(<PanelDeArchivos carpetaInicial="~" {...props} />)
  return props
}

/** Los nombres en el orden en que se ven: cada fila es un botón con su nombre. */
const nombresVisibles = () =>
  screen
    .getAllByRole('listitem')
    .map((fila) => within(fila).queryAllByRole('button')[0]?.getAttribute('aria-label'))
    .filter((nombre) => nombre && !nombre.startsWith('Más acciones'))

const menuDe = async (usuario: ReturnType<typeof userEvent.setup>, nombre: string) => {
  await usuario.click(screen.getByRole('button', { name: `Más acciones de ${nombre}` }))
  return screen.findByRole('menu')
}

describe('PanelDeArchivos', () => {
  it('lista la carpeta con las carpetas primero', async () => {
    const { pedirArchivos } = montar()

    await screen.findByText('notas.txt')

    expect(pedirArchivos).toHaveBeenCalledWith('~')
    expect(nombresVisibles()).toEqual([
      'public',
      '.env',
      'app.log',
      'notas.txt',
      'sitio.tar.gz',
    ])
  })

  it('cada fila se nombra por su archivo y lo describe con tamaño y permisos', async () => {
    montar()

    const fila = await screen.findByRole('button', { name: 'notas.txt' })

    expect(fila).toHaveAccessibleDescription(/8 B · .* · rw-r--r--/)
  })

  it('una carpeta vacía ofrece subir algo', async () => {
    montar(listado([]))

    expect(await screen.findByText('Esta carpeta está vacía.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Subir aquí' })).toHaveLength(2)
  })

  it('si no se puede leer, lo dice y deja volver al inicio', async () => {
    const usuario = userEvent.setup()
    const { pedirArchivos } = montar({ ...SITIO, error: 'No existe la carpeta /x.' })

    expect(await screen.findByRole('alert')).toHaveTextContent('No existe la carpeta /x.')
    await usuario.click(screen.getByRole('button', { name: 'Volver al inicio' }))

    expect(pedirArchivos).toHaveBeenLastCalledWith('~')
  })

  it('abrir una carpeta pide su contenido', async () => {
    const usuario = userEvent.setup()
    const { pedirArchivos } = montar()

    await usuario.click(await screen.findByRole('button', { name: 'public' }))

    expect(pedirArchivos).toHaveBeenLastCalledWith('/home/deploy/public')
  })

  it('buscar deja solo lo que coincide', async () => {
    const usuario = userEvent.setup()
    montar()
    await screen.findByText('notas.txt')

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar en esta carpeta' }), 'NOT')

    expect(nombresVisibles()).toEqual(['notas.txt'])
  })

  it('el botón de descarga baja el archivo de su fila', async () => {
    const usuario = userEvent.setup()
    const { descargar } = montar()

    await usuario.click(await screen.findByRole('button', { name: 'Descargar notas.txt' }))

    expect(descargar).toHaveBeenCalledWith('/home/deploy/notas.txt')
  })

  it('comprimir una carpeta crea su .tar.gz en el servidor y recarga la lista', async () => {
    const usuario = userEvent.setup()
    const { ejecutarTarea, pedirArchivos } = montar()
    await screen.findByText('public')

    const menu = await menuDe(usuario, 'public')
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Comprimir' }))

    expect(ejecutarTarea).toHaveBeenCalledWith('comprimir', '/home/deploy/public')
    await vi.waitFor(() => expect(pedirArchivos).toHaveBeenCalledTimes(2))
  })

  it('mientras comprime, el panel lo dice', async () => {
    const usuario = userEvent.setup()
    const sinTerminar = vi.fn(() => new Promise<MensajeDeTarea>(() => {}))
    montar(SITIO, sinTerminar)
    await screen.findByText('public')

    const menu = await menuDe(usuario, 'public')
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Comprimir' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Comprimiendo public')
  })

  it('extraer solo se ofrece en los comprimidos', async () => {
    const usuario = userEvent.setup()
    const { ejecutarTarea } = montar()
    await screen.findByText('notas.txt')

    const deNotas = await menuDe(usuario, 'notas.txt')
    expect(within(deNotas).queryByRole('menuitem', { name: 'Extraer aquí' })).toBeNull()
    await usuario.keyboard('{Escape}')

    const delSitio = await menuDe(usuario, 'sitio.tar.gz')
    await usuario.click(within(delSitio).getByRole('menuitem', { name: 'Extraer aquí' }))

    expect(ejecutarTarea).toHaveBeenCalledWith('extraer', '/home/deploy/sitio.tar.gz')
  })

  it('borrar una carpeta mide lo que tiene y lo dice antes', async () => {
    const usuario = userEvent.setup()
    const { ejecutarTarea } = montar()
    await screen.findByText('public')

    const menu = await menuDe(usuario, 'public')
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Borrar…' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Borrar public?' })

    expect(await within(dialogo).findByText('3 archivos, 1 carpeta y 12 KB')).toBeVisible()
    await usuario.click(
      within(dialogo).getByRole('button', { name: 'Borrar carpeta y su contenido' }),
    )
    expect(ejecutarTarea).toHaveBeenCalledWith('medir', '/home/deploy/public')
    expect(ejecutarTarea).toHaveBeenCalledWith('borrar', '/home/deploy/public')
  })

  it('una carpeta con más de 100 archivos pide escribir su nombre', async () => {
    const usuario = userEvent.setup()
    montar(SITIO, tareaHecha({ archivos: 1566, carpetas: 12, kb: 455_000 }))
    await screen.findByText('public')

    const menu = await menuDe(usuario, 'public')
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Borrar…' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Borrar public?' })
    const nombre = await within(dialogo).findByRole('textbox', {
      name: 'Escriba public para confirmar',
    })
    const borrar = within(dialogo).getByRole('button', {
      name: 'Borrar carpeta y su contenido',
    })

    expect(borrar).toBeDisabled()
    await usuario.type(nombre, 'public')
    expect(borrar).toBeEnabled()
  })

  it('renombra en la misma fila', async () => {
    const usuario = userEvent.setup()
    const { cambiarArchivo } = montar()
    await screen.findByText('notas.txt')

    const menu = await menuDe(usuario, 'notas.txt')
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Renombrar' }))
    const campo = screen.getByRole('textbox', { name: 'Nombre nuevo de notas.txt' })
    await usuario.clear(campo)
    await usuario.type(campo, 'apuntes.txt{Enter}')

    expect(cambiarArchivo).toHaveBeenCalledWith({
      renombrar: { ruta: '/home/deploy/notas.txt', nombre: 'apuntes.txt' },
    })
  })

  it('crea una carpeta con el nombre escrito', async () => {
    const usuario = userEvent.setup()
    const { cambiarArchivo } = montar()
    await screen.findByText('notas.txt')

    await usuario.click(screen.getByRole('button', { name: 'Nueva carpeta' }))
    await usuario.type(
      screen.getByRole('textbox', { name: 'Nombre de la carpeta nueva' }),
      'respaldos{Enter}',
    )

    expect(cambiarArchivo).toHaveBeenCalledWith({
      crear_carpeta: { ruta: '/home/deploy', nombre: 'respaldos' },
    })
  })

  it('borrar pide confirmarlo y dice que no hay papelera', async () => {
    const usuario = userEvent.setup()
    const { cambiarArchivo } = montar()
    await screen.findByText('notas.txt')

    const menu = await menuDe(usuario, 'notas.txt')
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Borrar…' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Borrar notas.txt?' })

    expect(dialogo).toHaveTextContent('No hay papelera')
    expect(cambiarArchivo).not.toHaveBeenCalled()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Borrar archivo' }))
    expect(cambiarArchivo).toHaveBeenCalledWith({ borrar: { ruta: '/home/deploy/notas.txt' } })
  })

  it('elegir varios los borra con una sola confirmación', async () => {
    const usuario = userEvent.setup()
    const { cambiarArchivo } = montar()
    await screen.findByText('notas.txt')

    await usuario.click(screen.getByRole('button', { name: 'Elegir varios' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir notas.txt' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir .env' }))
    await usuario.click(screen.getByRole('button', { name: 'Borrar' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Borrar 2 elementos?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Borrar 2' }))

    expect(cambiarArchivo).toHaveBeenCalledTimes(2)
  })

  it('elegir varios descarga los archivos y deja las carpetas', async () => {
    const usuario = userEvent.setup()
    const { descargar } = montar()
    await screen.findByText('notas.txt')

    await usuario.click(screen.getByRole('button', { name: 'Elegir varios' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir public' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir notas.txt' }))
    await usuario.click(screen.getByRole('button', { name: 'Descargar' }))

    expect(descargar).toHaveBeenCalledTimes(1)
    expect(descargar).toHaveBeenCalledWith('/home/deploy/notas.txt')
  })

  it('ordena por tamaño de mayor a menor, sin sacar las carpetas de arriba', async () => {
    const usuario = userEvent.setup()
    montar()
    await screen.findByText('notas.txt')

    await usuario.click(screen.getByRole('button', { name: 'Ordenar y filtrar' }))
    await usuario.click(await screen.findByRole('menuitemradio', { name: 'Tamaño' }))
    await usuario.click(screen.getByRole('button', { name: 'Ordenar y filtrar' }))
    await usuario.click(await screen.findByRole('menuitemradio', { name: 'De mayor a menor' }))

    expect(nombresVisibles()).toEqual(['public', 'app.log', 'sitio.tar.gz', '.env', 'notas.txt'])
  })

  it('ocultar los ocultos deja un enlace para volver a verlos', async () => {
    const usuario = userEvent.setup()
    montar()
    await screen.findByText('notas.txt')

    await usuario.click(screen.getByRole('button', { name: 'Ordenar y filtrar' }))
    await usuario.click(await screen.findByRole('menuitemcheckbox', { name: 'Mostrar ocultos' }))

    expect(nombresVisibles()).not.toContain('.env')
    await usuario.click(screen.getByRole('button', { name: 'Mostrar 1 archivo oculto' }))
    expect(nombresVisibles()).toContain('.env')
  })

  it('va a la ruta que se escribe', async () => {
    const usuario = userEvent.setup()
    const { pedirArchivos } = montar()
    await screen.findByText('notas.txt')

    await usuario.click(screen.getByRole('button', { name: 'Escribir una ruta' }))
    const campo = screen.getByRole('textbox', { name: 'Ruta a la que ir' })
    await usuario.clear(campo)
    await usuario.type(campo, '/var/log{Enter}')

    expect(pedirArchivos).toHaveBeenLastCalledWith('/var/log')
  })

  it('abrir en la terminal lleva la shell a esa carpeta', async () => {
    const usuario = userEvent.setup()
    const { abrirEnTerminal } = montar()
    await screen.findByText('public')

    const menu = await menuDe(usuario, 'public')
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Abrir en la terminal' }))

    expect(abrirEnTerminal).toHaveBeenCalledWith('/home/deploy/public')
  })

  it('Escape cierra el panel', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar()
    await screen.findByText('notas.txt')

    await usuario.keyboard('{Escape}')

    expect(onCerrar).toHaveBeenCalled()
  })

  it('el Escape del editor no cierra el panel ni pierde lo escrito', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar()

    await usuario.click(await screen.findByRole('button', { name: 'notas.txt' }))
    const area = await screen.findByRole('textbox', { name: 'Contenido de notas.txt' })
    await usuario.type(area, 'cambio')
    await usuario.keyboard('{Escape}')

    expect(await screen.findByRole('alertdialog', { name: '¿Cerrar sin guardar?' })).toBeVisible()
    expect(onCerrar).not.toHaveBeenCalled()
  })
})
