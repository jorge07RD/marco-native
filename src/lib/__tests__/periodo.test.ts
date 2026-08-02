import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { anioActual, mesActual, periodoAnterior, rangoAnteriorDe, rangoDe } from '../periodo'

// Todo lo de aquí depende de "hoy": los periodos en curso se recortan contra
// él. Se fija el reloj a un 2 de agosto para que los casos de mes a medias
// sean reproducibles.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 2))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('periodo en curso', () => {
  test('mesActual es el mes de hoy, no el índice de JS', () => {
    expect(mesActual()).toEqual({ tipo: 'mes', year: 2026, month: 8 })
  })

  test('anioActual es el año de hoy', () => {
    expect(anioActual()).toEqual({ tipo: 'anio', year: 2026 })
  })
})

describe('rangoDe', () => {
  test('un mes cerrado va del día 1 al último', () => {
    expect(rangoDe({ tipo: 'mes', year: 2026, month: 7 })).toEqual({
      inicio: '2026-07-01',
      fin: '2026-07-31',
      etiqueta: 'julio 2026',
    })
  })

  test('el mes en curso se corta en hoy, no en el 31', () => {
    expect(rangoDe({ tipo: 'mes', year: 2026, month: 8 })).toMatchObject({
      inicio: '2026-08-01',
      fin: '2026-08-02',
    })
  })

  test('el año en curso también se corta en hoy', () => {
    expect(rangoDe({ tipo: 'anio', year: 2026 })).toMatchObject({
      inicio: '2026-01-01',
      fin: '2026-08-02',
    })
  })

  test('un año pasado va entero', () => {
    expect(rangoDe({ tipo: 'anio', year: 2025 })).toMatchObject({
      inicio: '2025-01-01',
      fin: '2025-12-31',
    })
  })

  test('febrero bisiesto tiene 29', () => {
    expect(rangoDe({ tipo: 'mes', year: 2024, month: 2 }).fin).toBe('2024-02-29')
  })
})

describe('periodoAnterior', () => {
  test('enero retrocede a diciembre del año anterior', () => {
    expect(periodoAnterior({ tipo: 'mes', year: 2026, month: 1 })).toEqual({
      tipo: 'mes',
      year: 2025,
      month: 12,
    })
  })

  test('un año retrocede al anterior', () => {
    expect(periodoAnterior({ tipo: 'anio', year: 2026 })).toEqual({ tipo: 'anio', year: 2025 })
  })
})

describe('rangoAnteriorDe', () => {
  test('el mes en curso se compara con los mismos días del anterior', () => {
    // Agosto va por el día 2, así que julio se recorta al 1 y 2.
    expect(rangoAnteriorDe({ tipo: 'mes', year: 2026, month: 8 })).toMatchObject({
      inicio: '2026-07-01',
      fin: '2026-07-02',
    })
  })

  test('un mes cerrado se compara con el anterior entero', () => {
    expect(rangoAnteriorDe({ tipo: 'mes', year: 2026, month: 7 })).toMatchObject({
      inicio: '2026-06-01',
      fin: '2026-06-30',
    })
  })

  test('un mes de 31 contra uno de 30 no se pasa de fin de mes', () => {
    // Mayo tiene 31 días y abril 30: el recorte no puede inventar un 31 de abril.
    expect(rangoAnteriorDe({ tipo: 'mes', year: 2026, month: 5 })).toMatchObject({
      inicio: '2026-04-01',
      fin: '2026-04-30',
    })
  })

  test('el año en curso se compara con el mismo tramo del anterior', () => {
    expect(rangoAnteriorDe({ tipo: 'anio', year: 2026 })).toMatchObject({
      inicio: '2025-01-01',
      fin: '2025-08-02',
    })
  })

  test('los días son los N justo anteriores al rango actual', () => {
    expect(rangoAnteriorDe({ tipo: 'dias', dias: 7 })).toMatchObject({
      inicio: '2026-07-20',
      fin: '2026-07-26',
    })
  })
})
