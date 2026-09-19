/** Direccion propuesta a partir del nombre: minusculas, sin tildes y con
 *  guiones. La valida el backend. */
export function buildSlug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
