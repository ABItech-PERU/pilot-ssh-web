/** El valor de «todos» en un selector: Radix no admite uno vacío. */
export const TODOS = 'todos'

/** Las opciones que manda el servidor, con «todos» delante. */
export function conTodos(
  todos: string,
  opciones: readonly { value: string; label: string }[] = [],
) {
  return [
    { valor: TODOS, etiqueta: todos },
    ...opciones.map((opcion) => ({ valor: opcion.value, etiqueta: opcion.label })),
  ]
}
