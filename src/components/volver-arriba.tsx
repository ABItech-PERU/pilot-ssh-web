import { cn } from 'cn'
import { ArrowUpIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

/** Píxeles de scroll desde los que se ofrece el botón. */
const DESDE = 600

export function VolverArriba() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const revisar = () => setVisible(window.scrollY > DESDE)
    revisar()
    window.addEventListener('scroll', revisar, { passive: true })
    return () => window.removeEventListener('scroll', revisar)
  }, [])

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Volver arriba"
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cn(
        'bg-background/90 fixed right-4 bottom-4 z-30 shadow-sm backdrop-blur transition-[opacity,transform] duration-300 sm:right-6 sm:bottom-6',
        visible ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <ArrowUpIcon />
    </Button>
  )
}
