import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createCategoria, getCategorias } from '../categorias'
import { createHabito, getHabitos } from '../habitos'
import { sembrarDatosDeEjemplo } from '../semilla'

// La siembra solo orquesta: quien habla con SQLite es categorias/habitos, y
// esos ya están probados contra el dispositivo. Aquí se comprueba la parte que
// puede romperse en silencio — cuántos hábitos entran, con qué categorías, y
// sobre todo cuándo NO hay que sembrar.
vi.mock('../categorias', () => ({
  getCategorias: vi.fn(),
  createCategoria: vi.fn(),
}))
vi.mock('../habitos', () => ({
  getHabitos: vi.fn(),
  createHabito: vi.fn(),
}))

const getHabitosMock = vi.mocked(getHabitos)
const createHabitoMock = vi.mocked(createHabito)
const getCategoriasMock = vi.mocked(getCategorias)
const createCategoriaMock = vi.mocked(createCategoria)

beforeEach(() => {
  vi.clearAllMocks()
  getHabitosMock.mockResolvedValue([])
  getCategoriasMock.mockResolvedValue([])
  let siguienteId = 1
  createCategoriaMock.mockImplementation(async ({ nombre }) => ({
    id: siguienteId++,
    nombre,
    created_at: '2026-08-02T00:00:00',
    updated_at: null,
  }))
  createHabitoMock.mockResolvedValue({} as never)
})

describe('sembrarDatosDeEjemplo', () => {
  test('crea cinco hábitos', async () => {
    await sembrarDatosDeEjemplo()
    expect(createHabitoMock).toHaveBeenCalledTimes(5)
  })

  test('crea cada categoría una sola vez aunque la compartan varios hábitos', async () => {
    await sembrarDatosDeEjemplo()
    const nombres = createCategoriaMock.mock.calls.map(([body]) => body.nombre)
    expect(nombres).toEqual(['Salud', 'Productividad', 'Bienestar'])
  })

  test('todos los hábitos quedan colgados de una categoría existente', async () => {
    await sembrarDatosDeEjemplo()
    const idsCreados = createCategoriaMock.mock.results.map((r) => r.value)
    const ids = await Promise.all(idsCreados)
    const validos = ids.map((c) => c.id)
    for (const [body] of createHabitoMock.mock.calls) {
      expect(validos).toContain(body.categoria_id)
    }
  })

  test('reutiliza una categoría que ya existe en vez de duplicarla', async () => {
    getCategoriasMock.mockResolvedValue([
      { id: 99, nombre: 'Salud', created_at: '2026-01-01T00:00:00', updated_at: null },
    ])
    await sembrarDatosDeEjemplo()
    expect(createCategoriaMock.mock.calls.map(([b]) => b.nombre)).toEqual([
      'Productividad',
      'Bienestar',
    ])
    // Los dos hábitos de Salud van al id que ya estaba.
    const deSalud = createHabitoMock.mock.calls.filter(([b]) => b.categoria_id === 99)
    expect(deSalud).toHaveLength(2)
  })

  test('no siembra nada si ya hay hábitos', async () => {
    getHabitosMock.mockResolvedValue([{ id: 1 } as never])
    await sembrarDatosDeEjemplo()
    expect(createHabitoMock).not.toHaveBeenCalled()
    expect(createCategoriaMock).not.toHaveBeenCalled()
  })

  test('los días van en el JSON que espera parseDiasSeguro', async () => {
    await sembrarDatosDeEjemplo()
    for (const [body] of createHabitoMock.mock.calls) {
      const parsed: unknown = JSON.parse(body.dias)
      expect(Array.isArray(parsed)).toBe(true)
      expect((parsed as string[]).length).toBeGreaterThan(0)
      for (const letra of parsed as string[]) {
        expect(['L', 'M', 'X', 'J', 'V', 'S', 'D']).toContain(letra)
      }
    }
  })
})
