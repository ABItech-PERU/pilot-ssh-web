/** Mensaje de error de un campo. Sustituye a la pista, no se apila con ella. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-destructive text-xs font-medium">{message}</p>
}
