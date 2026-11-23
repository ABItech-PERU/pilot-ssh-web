import { render, screen } from '@testing-library/react'
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

function montar(respuesta: MensajeDeContenido = leido()) {
  const pedirContenido = vi.fn().mockResolvedValue(respuesta)
  const guardarContenido = vi
    .fn()
    .mockResolvedValue({ type: 'contenido', estado: 'guardado', version: 'v2', tamano: 12 })
  const descargar = vi.fn()
  const onCerrar = vi.fn()
  render(
    <EditorDeArchivo
      ruta={RUTA}
      pedirContenido={pedirContenido}
      guardarContenido={guardarContenido}
      descargar={descargar}
      onCerrar={onCerrar}
    />,
  )
  return { pedirContenido, guardarContenido, descargar, onCerrar }
}

describe('EditorDeArchivo', () => {
  it('muestra el texto del archivo', async () => {
    const { pedirContenido } = montar()

    const area = await screen.findByRole('textbox', { name: 'Contenido de .env' })

    expect(area).toHaveValue('APP_ENV=prod\n')
    expect(pedirContenido).toHaveBeenCalledWith(RUTA)
  })

  it('sin cambios no deja guardar', async () => {
    montar()

    await screen.findByRole('textbox', { name: 'Contenido de .env' })

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('guarda lo escrito con la versión que leyó', async () => {
    const usuario = userEvent.setup()
    const { guardarContenido } = montar()
    const area = await screen.findByRole('textbox', { name: 'Contenido de .env' })

    await usuario.clear(area)
    await usuario.type(area, 'APP_ENV=uat{Enter}')
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
    const area = await screen.findByRole('textbox', { name: 'Contenido de .env' })

    await usuario.type(area, 'X=1')
    await usuario.keyboard('{Control>}s{/Control}')

    expect(guardarContenido).toHaveBeenCalledTimes(1)
  })

  it('un archivo de Windows se guarda con sus finales de línea', async () => {
    const usuario = userEvent.setup()
    const { guardarContenido } = montar(leido({ texto: 'a\r\nb\r\n' }))
    const area = await screen.findByRole('textbox', { name: 'Contenido de .env' })

    expect(screen.getByText(/Windows \(CRLF\)/)).toBeInTheDocument()
    await usuario.type(area, 'c')
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
    const area = await screen.findByRole('textbox', { name: 'Contenido de .env' })

    await usuario.type(area, 'X=1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    // Sigue sin guardar, y el texto escrito no se pierde
    expect(await screen.findByText('Sin guardar')).toBeInTheDocument()
    expect(area).toHaveValue('APP_ENV=prod\nX=1')
  })

  it('un archivo grande se abre solo para leer', async () => {
    montar(leido({ recortado: true, editable: false }))

    const area = await screen.findByRole('textbox', { name: 'Contenido de .env' })

    expect(area).toHaveAttribute('readonly')
    expect(screen.getByText(/Se ve solo el final/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
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

  it('cerrar con cambios pide confirmarlo', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar()
    const area = await screen.findByRole('textbox', { name: 'Contenido de .env' })

    await usuario.type(area, 'X=1')
    await usuario.keyboard('{Escape}')

    expect(await screen.findByRole('alertdialog', { name: '¿Cerrar sin guardar?' })).toBeVisible()
    expect(onCerrar).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(onCerrar).toHaveBeenCalled()
  })

  it('cerrar sin cambios no pregunta', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar()
    await screen.findByRole('textbox', { name: 'Contenido de .env' })

    await usuario.keyboard('{Escape}')

    expect(onCerrar).toHaveBeenCalled()
  })
})
