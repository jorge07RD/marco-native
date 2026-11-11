import { describe, expect, it } from 'vitest'

import { agregarHora, describirHoras, parseHoras, quitarHora, serializarHoras } from '../recordatorios'

describe('parseHoras', () => {
  it('lee el formato antiguo de una sola hora', () => {
    expect(parseHoras('08:00')).toEqual(['08:00'])
  })

  it('ordena, quita repetidos y descarta lo que no es una hora', () => {
    expect(parseHoras('21:00, 08:00,08:00,25:00,abc,')).toEqual(['08:00', '21:00'])
  })

  it('devuelve una lista vacía sin valor', () => {
    expect(parseHoras('')).toEqual([])
    expect(parseHoras(null)).toEqual([])
  })
})

describe('serializarHoras', () => {
  it('escribe la lista ordenada y separada por comas', () => {
    expect(serializarHoras(['21:00', '07:00'])).toBe('07:00,21:00')
  })
})

describe('agregarHora', () => {
  it('añade una hora cualquiera en su sitio', () => {
    expect(agregarHora(['08:00', '21:00'], '13:45')).toEqual(['08:00', '13:45', '21:00'])
  })

  it('no repite una hora que ya estaba', () => {
    expect(agregarHora(['08:00'], '08:00')).toEqual(['08:00'])
  })
})

describe('quitarHora', () => {
  it('quita una hora que estaba', () => {
    expect(quitarHora(['08:00', '21:00'], '08:00')).toEqual(['21:00'])
  })

  it('no deja la lista vacía', () => {
    expect(quitarHora(['08:00'], '08:00')).toEqual(['08:00'])
  })
})

describe('describirHoras', () => {
  it('une las horas como en una frase', () => {
    expect(describirHoras(['08:00'])).toBe('08:00')
    expect(describirHoras(['08:00', '21:00'])).toBe('08:00 y 21:00')
    expect(describirHoras(['07:00', '12:00', '21:00'])).toBe('07:00, 12:00 y 21:00')
  })
})
