import { describe, expect, it } from 'vitest'

import {
  construirHistorial,
  describirFalloDelPago,
  describirRecarga,
  explicarPendiente,
} from '@/features/credits/recargas'
import { ApiError } from '@/lib/api-error'
import type { TopUpRequest, TopUpRequestDetail } from '@/types/api'

type Base = Pick<
  TopUpRequest,
  'status' | 'external_id' | 'voucher_url' | 'refunded_credits'
>

const recarga = (cambios: Partial<Base>): Base => ({
  status: 'pending',
  external_id: '',
  voucher_url: '',
  refunded_credits: '0.00',
  ...cambios,
})

describe('describirRecarga', () => {
  it('una pendiente sin pagar pide pagar', () => {
    expect(describirRecarga(recarga({}))).toEqual({
      punto: 'sin-pagar',
      etiqueta: 'Sin pagar',
      tono: 'aviso',
      accion: 'pagar',
    })
  })

  it('con código de agente hay que ir a pagar, aunque ya tenga id externo', () => {
    const estado = describirRecarga(
      recarga({ external_id: 'ORD01', voucher_url: 'https://mp.test/cip' }),
    )

    expect(estado.punto).toBe('en-agente')
    expect(estado.accion).toBe('codigo')
  })

  it('pagada y sin acreditar solo se espera', () => {
    const estado = describirRecarga(recarga({ external_id: 'ORD01' }))

    expect(estado).toMatchObject({
      punto: 'en-confirmacion',
      tono: 'proceso',
      accion: null,
    })
  })

  it('acreditada con parte devuelta lo dice, en vez de «Acreditada» a secas', () => {
    expect(
      describirRecarga(recarga({ status: 'completed', refunded_credits: '1100.00' })),
    ).toMatchObject({
      punto: 'devuelta-en-parte',
      etiqueta: 'Devuelta en parte',
      tono: 'aviso',
    })
    expect(describirRecarga(recarga({ status: 'completed' }))).toMatchObject({
      punto: 'acreditada',
      tono: 'ok',
    })
  })

  it('devuelta no pide nada y se lee aparte', () => {
    expect(
      describirRecarga(recarga({ status: 'refunded', external_id: 'ORD01' })),
    ).toMatchObject({
      punto: 'devuelta',
      etiqueta: 'Devuelta',
      tono: 'info',
      accion: null,
    })
  })

  it('un contracargo avisa mientras se revisa y se lee aparte al perderse', () => {
    expect(
      describirRecarga(recarga({ status: 'disputed', external_id: 'ORD01' })),
    ).toMatchObject({ punto: 'en-disputa', tono: 'aviso', accion: null })
    expect(
      describirRecarga(recarga({ status: 'charged_back', external_id: 'ORD01' })),
    ).toMatchObject({ punto: 'contracargo', etiqueta: 'Contracargo', accion: null })
  })

  it('acreditada y cancelada no piden nada', () => {
    expect(
      describirRecarga(recarga({ status: 'completed', external_id: 'ORD01' })),
    ).toMatchObject({ punto: 'acreditada', tono: 'ok', accion: null })
    expect(describirRecarga(recarga({ status: 'cancelled' }))).toMatchObject({
      punto: 'cancelada',
      tono: 'neutro',
      accion: null,
    })
  })
})

describe('explicarPendiente', () => {
  it('dice qué es y qué falta', () => {
    expect(explicarPendiente('sin-pagar', 'S/ 50', 'hace 3 min')).toEqual({
      titulo: 'Recarga de S/ 50 sin pagar',
      detalle: 'Pedida hace 3 min. Termine el pago para que entren los créditos.',
    })
    expect(explicarPendiente('en-confirmacion', 'S/ 50', 'hace 4 h').titulo).toBe(
      'Pago de S/ 50 recibido hace 4 h',
    )
  })
})

describe('construirHistorial', () => {
  const escribir = {
    fechaHora: (iso: string) => iso.slice(0, 16),
    creditos: (cantidad: string) => String(Number(cantidad)),
    precio: (cantidad: string, moneda: string) => `${moneda} ${Number(cantidad)}`,
  }
  const detalle = (cambios: Partial<TopUpRequestDetail>): TopUpRequestDetail => ({
    id: 'r',
    package_name: 'Recarga S/ 50',
    contact_phone: '',
    credits: '5500.00',
    base_credits: '5000.00',
    bonus_credits: '500.00',
    price_amount: '50.00',
    price_currency: 'PEN',
    status: 'completed',
    requested_by: 'Ana Quispe',
    completed_by: null,
    cancelled_by: null,
    created_at: '2026-09-12T11:00:00Z',
    completed_at: '2026-09-12T11:01:00Z',
    cancelled_at: null,
    refunded_at: null,
    disputed_at: null,
    charged_back_at: null,
    external_id: 'ORD01',
    voucher_url: '',
    manual_reference: '',
    receipt_format: null,
    payment_method: '',
    payment_method_label: '',
    payment_brand: '',
    refunded_amount: '0.00',
    refunded_credits: '0.00',
    refunds: [],
    ...cambios,
  })

  it('dice quién acreditó: una persona o el aviso del proveedor', () => {
    const porElPago = construirHistorial(detalle({}), escribir)
    expect(porElPago[1]).toMatchObject({
      detalle: '5500 créditos entraron al saldo',
      quien: 'Por el proveedor del pago',
    })

    const aMano = construirHistorial(
      detalle({
        external_id: '',
        completed_by: 'Finanzas Pilot',
        manual_reference: 'BCP-778812',
        payment_method: 'transfer',
      }),
      escribir,
    )
    expect(aMano[1]).toMatchObject({
      detalle:
        '5500 créditos, cobrada por fuera (Transferencia) con la operación BCP-778812',
      quien: 'Por Finanzas Pilot',
    })
  })

  it('dice quién canceló, y cuándo no fue nadie', () => {
    const porFinanzas = construirHistorial(
      detalle({
        status: 'cancelled',
        completed_at: null,
        cancelled_at: '2026-09-12T12:00:00Z',
        cancelled_by: 'Finanzas Pilot',
      }),
      escribir,
    )
    expect(porFinanzas[1]).toMatchObject({
      titulo: 'Cancelada',
      quien: 'Por Finanzas Pilot',
    })

    const sola = construirHistorial(
      detalle({
        status: 'cancelled',
        completed_at: null,
        cancelled_at: '2026-09-12T12:00:00Z',
      }),
      escribir,
    )
    expect(sola[1]?.detalle).toBe('El pago no llegó a completarse')
  })

  it('cuenta cada devolución con su fecha, en orden', () => {
    const pasos = construirHistorial(
      detalle({
        refunded_at: '2026-09-13T10:00:00Z',
        refunded_amount: '30.00',
        refunded_credits: '3300.00',
        refunds: [
          { at: '2026-09-13T10:00:00Z', credits: '2200.00' },
          { at: '2026-09-12T12:00:00Z', credits: '1100.00' },
        ],
      }),
      escribir,
    )

    expect(pasos.map((paso) => paso.titulo)).toEqual([
      'Pedida',
      'Acreditada',
      'Devolución',
      'Devolución',
    ])
    expect(pasos[2]).toEqual({
      cuando: '2026-09-12T12:00',
      titulo: 'Devolución',
      detalle: '1100 créditos descontados',
    })
  })

  it('un contracargo perdido se dice como tal, no como devolución', () => {
    const pasos = construirHistorial(
      detalle({
        status: 'charged_back',
        disputed_at: '2026-09-13T09:00:00Z',
        charged_back_at: '2026-09-20T09:00:00Z',
        refunds: [{ at: '2026-09-20T09:00:00Z', credits: '5500.00' }],
      }),
      escribir,
    )

    expect(pasos.map((paso) => paso.titulo)).toEqual([
      'Pedida',
      'Acreditada',
      'Contracargo abierto',
      'Contracargo perdido',
    ])
  })

  it('cancelada sin pagar solo tiene dos pasos', () => {
    const pasos = construirHistorial(
      detalle({
        status: 'cancelled',
        completed_at: null,
        cancelled_at: '2026-09-12T11:30:00Z',
      }),
      escribir,
    )

    expect(pasos.map((paso) => paso.titulo)).toEqual(['Pedida', 'Cancelada'])
  })
})

describe('describirRecarga sin pasarela', () => {
  const pendiente = {
    status: 'pending' as const,
    external_id: '',
    voucher_url: '',
    refunded_credits: '0.00',
  }

  it('no dice «sin pagar»: quien pidió ya hizo su parte', () => {
    expect(describirRecarga(pendiente, false)).toEqual({
      punto: 'solicitada',
      etiqueta: 'Solicitada',
      tono: 'proceso',
      accion: 'contacto',
    })
  })

  it('con pasarela sí queda pagar', () => {
    expect(describirRecarga(pendiente, true).accion).toBe('pagar')
  })

  it('una acreditada no cambia por no haber pasarela', () => {
    const acreditada = { ...pendiente, status: 'completed' as const }
    expect(describirRecarga(acreditada, false).punto).toBe('acreditada')
  })
})

describe('describirFalloDelPago', () => {
  const limite = (retry_after: number | null) =>
    new ApiError(
      {
        message: 'Demasiados intentos seguidos',
        code: 'demasiadas_peticiones',
        retry_after,
      },
      429,
    )

  it('con el límite de intentos dice cuánto esperar, en minutos enteros', () => {
    expect(describirFalloDelPago(limite(2400))).toBe(
      'Demasiados intentos de pago. Vuelva a intentarlo en 40 min.',
    )
    expect(describirFalloDelPago(limite(5))).toBe(
      'Demasiados intentos de pago. Vuelva a intentarlo en 1 min.',
    )
    expect(describirFalloDelPago(limite(null))).toBe(
      'Demasiados intentos de pago. Inténtelo más tarde.',
    )
  })

  it('cualquier otro fallo se lee como lo cuenta el servidor', () => {
    const enCurso = new ApiError(
      { message: 'Esta recarga ya tiene un pago en curso.', code: 'pago_en_curso' },
      409,
    )
    expect(describirFalloDelPago(enCurso)).toBe('Esta recarga ya tiene un pago en curso.')
  })
})
