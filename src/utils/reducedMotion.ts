// Fortæller om enheden har "Reducer bevægelse" slået til i sine
// indstillinger. Bruges til at springe animationer over - fx den store
// billedvisning, som ellers "vokser ud" fra det trykkede piktogram.

import { useEffect, useState } from 'react'

const FORESPOERGSEL = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduceret, setReduceret] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(FORESPOERGSEL).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(FORESPOERGSEL)
    const lyt = (e: MediaQueryListEvent) => setReduceret(e.matches)
    mq.addEventListener('change', lyt)
    return () => mq.removeEventListener('change', lyt)
  }, [])

  return reduceret
}
