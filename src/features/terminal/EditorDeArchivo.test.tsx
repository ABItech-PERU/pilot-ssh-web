import { EditorView } from '@codemirror/view'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EditorDeArchivo } from '@/features/terminal/EditorDeArchivo'
import type { MensajeDeContenido } from '@/features/terminal/socket'

const RUTA = '/home/deploy/.env'

function leido(cambios: Partial<MensajeDeContenido> = {}): MensajeDeContenido {
  return {
    type: 'contenido',
    estado: 'listo',
    ruta: RUTA,
    nombre: '.env',
    texto: 'APP_ENV=prod\n',
    tamano: 13,
    version: 'v1',
    recortado: false,
    editable: true,
    ...cambios,
  }
}

function montar(respuesta: MensajeDeContenido = leido(), ruta = RUTA) {
  const pedirContenido = vi.fn().mockResolvedValue(respuesta)
  const guardarContenido = vi
    .fn()
    .mockResolvedValue({ type: 'contenido', estado: 'guardado', version: 'v2', tamano: 12 })
  const descargar = vi.fn()
  const onCerrar = vi.fn()
  render(
    <EditorDeArchivo
      ruta={ruta}
      pedirContenido={pedirContenido}
      guardarContenido={guardarContenido}
      descargar={descargar}
      onCerrar={onCerrar}
    />,
  )
  return { pedirContenido, guardarContenido, descargar, onCerrar }
}

async function abrirEditor(nombre = '.env') {
  const contenido = await screen.findByRole('textbox', { name: `Contenido de ${nombre}` })
  return { contenido, vista: EditorView.findFromDOM(contenido)! }
}

/** jsdom no edita un contenteditable; se escribe como lo haría el teclado. */
function escribir(vista: EditorView, texto: string, { reemplazar = false } = {}) {
  const fin = vista.state.doc.length
  vista.dispatch({
    changes: { from: reemplazar ? 0 : fin, to: fin, insert: texto },
    userEvent: 'input.type',
  })
}

describe('EditorDeArchivo', () => {
  it('muestra el texto del archivo con sus líneas numeradas', async () => {
    const { pedirContenido } = montar(leido({ texto: 'uno\ndos\ntres\n' }))

    const { vista } = await abrirEditor()

    expect(vista.state.doc.toString()).toBe('uno\ndos\ntres\n')
    expect(pedirContenido).toHaveBeenCalledWith(RUTA)
    const numeros = document.querySelector('.cm-lineNumbers')!
    expect(within(numeros as HTMLElement).getByText('3')).toBeInTheDocument()
  })

  it('reconoce el lenguaje por el nombre del archivo', async () => {
    const ruta = '/srv/app/docker-compose.yml'
    montar(leido({ ruta, nombre: 'docker-compose.yml', texto: 'services:\n' }), ruta)

    await abrirEditor('docker-compose.yml')

    expect(await screen.findByText(/YAML/)).toBeInTheDocument()
  })

  it('sin cambios no deja guardar', async () => {
    montar()

    await abrirEditor()

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('guarda lo escrito con la versión que leyó', async () => {
    const usuario = userEvent.setup()
    const { guardarContenido } = montar()
    const { vista } = await abrirEditor()

    escribir(vista, 'APP_ENV=uat\n', { reemplazar: true })
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(guardarContenido).toHaveBeenCalledWith({
      ruta: RUTA,
      texto: 'APP_ENV=uat\n',
      version: 'v1',
    })
  })

  it('Ctrl+S guarda sin buscar el botón', async () => {
    const usuario = userEvent.setup()
    const { guardarContenido } = montar()
    const { contenido, vista } = await abrirEditor()

    escribir(vista, 'X=1')
    contenido.focus()
    await usuario.keyboard('{Control>}s{/Control}')

    expect(guardarContenido).toHaveBeenCalledTimes(1)
  })

  it('un archivo de Windows se guarda con sus finales de línea', async () => {
    const usuario = userEvent.setup()
    const { guardarContenido } = montar(leido({ texto: 'a\r\nb\r\n' }))
    const { vista } = await abrirEditor()

    expect(screen.getByText(/Windows \(CRLF\)/)).toBeInTheDocument()
    escribir(vista, 'c')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(guardarContenido.mock.lastCall?.[0].texto).toBe('a\r\nb\r\nc')
  })

  it('si cambió en el servidor, no lo da por guardado', async () => {
    const usuario = userEvent.setup()
    const { guardarContenido } = montar()
    guardarContenido.mockResolvedValueOnce({
      type: 'contenido',
      estado: 'error',
      message: 'El archivo cambió en el servidor desde que lo abrió.',
    })
    const { vista } = await abrirEditor()

    escribir(vista, 'X=1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    // Sigue sin guardar, y el texto escrito no se pierde
    expect(await screen.findByText('Sin guardar')).toBeInTheDocument()
    expect(vista.state.doc.toString()).toBe('APP_ENV=prod\nX=1')
  })

  it('un archivo grande se abre solo para leer', async () => {
    montar(leido({ recortado: true, editable: false }))

    const { contenido } = await abrirEditor()

    expect(contenido).toHaveAttribute('aria-readonly', 'true')
    expect(screen.getByText(/Se ve solo el final/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    // Los números de un trozo no serían los del archivo
    expect(document.querySelector('.cm-lineNumbers')).toBeNull()
  })

  it('lo que no es texto ofrece descargarlo', async () => {
    const usuario = userEvent.setup()
    const { descargar } = montar({
      type: 'contenido',
      estado: 'error',
      message: 'logo.png no es de texto. Descárguelo para abrirlo.',
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('no es de texto')
    await usuario.click(screen.getByRole('button', { name: 'Descargar' }))

    expect(descargar).toHaveBeenCalledWith(RUTA)
  })

  it('Escape en el buscador lo cierra sin cerrar el archivo', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar()
    const { contenido } = await abrirEditor()

    contenido.focus()
    await usuario.keyboard('{Control>}f{/Control}')
    const buscar = await screen.findByRole('textbox', { name: 'Buscar' })
    buscar.focus()
    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('textbox', { name: 'Buscar' })).not.toBeInTheDocument()
    expect(onCerrar).not.toHaveBeenCalled()
  })

  it('cerrar con cambios pide confirmarlo', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar()
    const { vista } = await abrirEditor()

    escribir(vista, 'X=1')
    await usuario.keyboard('{Escape}')

    expect(await screen.findByRole('alertdialog', { name: '¿Cerrar sin guardar?' })).toBeVisible()
    expect(onCerrar).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(onCerrar).toHaveBeenCalled()
  })

  it('cerrar sin cambios no pregunta', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar()
    await abrirEditor()

    await usuario.keyboard('{Escape}')

    expect(onCerrar).toHaveBeenCalled()
  })
})
