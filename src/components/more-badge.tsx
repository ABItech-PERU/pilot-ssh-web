import { cn } from 'cn'

/** «+2»: lo que no cabe. Con el alto y el borde de un chip, porque comparte
 *  fila con ellos. */
export function MoreBadge({
  total,
  className,
  ...props
}: { total: number } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'border-border text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex h-5 items-center rounded border px-1.5 text-[11px] font-medium focus-visible:-outline-offset-2 focus-visible:outline-1',
        className,
      )}
      {...props}
    >
      +{total}
    </button>
  )
}
