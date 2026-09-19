import { cn } from 'cn'

/** El símbolo, con el mismo trazo que public/marca/isotipo-*.svg. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-6 shrink-0 stroke-teal-700 dark:stroke-teal-500', className)}
      aria-hidden
    >
      <path d="M14 10 40 31 14 52H58" />
    </svg>
  )
}

/** El imagotipo tal cual: la cola llega hasta la L de PILOT. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center', className)}>
      <img src="/marca/imagotipo-claro.svg" alt="Pilot SSH" className="h-8 dark:hidden" />
      <img
        src="/marca/imagotipo-oscuro.svg"
        alt="Pilot SSH"
        className="hidden h-8 dark:block"
      />
    </span>
  )
}
