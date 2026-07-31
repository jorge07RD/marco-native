// SQLite no tiene tipo booleano real ni onupdate automático — estos
// helpers chicos evitan repetir la conversión en cada función de marco.ts.

export function nowISO(): string {
  return new Date().toISOString()
}

export function toBool(v: number): boolean {
  return v === 1
}

export function toInt(v: boolean): number {
  return v ? 1 : 0
}
