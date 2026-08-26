// Håndterer alt fingerbetjening på det store billede i ét sted, så
// pinch-zoom, panorering, swipe til næste/forrige og tryk-for-at-lukke ikke
// kommer i vejen for hinanden (de bruger de samme finger-tryk).
//
// Regel: med én finger og uden zoom kan man swipe eller trykke for at lukke.
// Med én finger og zoomet ind panorerer man i stedet. Med to fingre zoomer man.

import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface Options {
  paaNaeste: () => void
  paaForrige: () => void
  paaLuk: () => void
}

interface Punkt {
  x: number
  y: number
}

const MIN_ZOOM = 1
const MAKS_ZOOM = 4
const SWIPE_MIN_VANDRET = 60
const SWIPE_MAKS_LODRET = 60
const TRYK_MAKS_BEVAEGELSE = 10

function klemFast(v: number, min: number, maks: number) {
  return Math.min(maks, Math.max(min, v))
}

function afstand(a: Punkt, b: Punkt) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midtpunkt(a: Punkt, b: Punkt) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function useImageGestures({ paaNaeste, paaForrige, paaLuk }: Options) {
  const [transform, setTransform] = useState({ skala: 1, x: 0, y: 0 })
  const transformRef = useRef(transform)
  transformRef.current = transform

  const pointers = useRef<Map<number, Punkt>>(new Map())
  const startAfstand = useRef(0)
  const startSkala = useRef(1)
  const startTransform = useRef({ x: 0, y: 0 })
  const startMidt = useRef({ x: 0, y: 0 })
  const enkeltStart = useRef<Punkt | null>(null)
  const harBevaegetSig = useRef(false)

  const nulstilZoom = useCallback(() => setTransform({ skala: 1, x: 0, y: 0 }), [])

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    harBevaegetSig.current = false

    if (pointers.current.size === 1) {
      enkeltStart.current = { x: e.clientX, y: e.clientY }
      startTransform.current = { x: transformRef.current.x, y: transformRef.current.y }
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values())
      startAfstand.current = afstand(a, b) || 1
      startSkala.current = transformRef.current.skala
      startMidt.current = midtpunkt(a, b)
      startTransform.current = { x: transformRef.current.x, y: transformRef.current.y }
    }
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values())
      const nySkala = klemFast(
        startSkala.current * (afstand(a, b) / startAfstand.current),
        MIN_ZOOM,
        MAKS_ZOOM,
      )
      const midt = midtpunkt(a, b)
      setTransform({
        skala: nySkala,
        x: startTransform.current.x + (midt.x - startMidt.current.x),
        y: startTransform.current.y + (midt.y - startMidt.current.y),
      })
      harBevaegetSig.current = true
      return
    }

    if (pointers.current.size === 1 && enkeltStart.current) {
      const dx = e.clientX - enkeltStart.current.x
      const dy = e.clientY - enkeltStart.current.y
      if (Math.abs(dx) > TRYK_MAKS_BEVAEGELSE || Math.abs(dy) > TRYK_MAKS_BEVAEGELSE) {
        harBevaegetSig.current = true
      }
      if (transformRef.current.skala > 1.02) {
        setTransform((t) => ({
          ...t,
          x: startTransform.current.x + dx,
          y: startTransform.current.y + dy,
        }))
      }
    }
  }, [])

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const antalFoer = pointers.current.size
      pointers.current.delete(e.pointerId)

      if (antalFoer === 1 && enkeltStart.current) {
        const dx = e.clientX - enkeltStart.current.x
        const dy = e.clientY - enkeltStart.current.y

        if (transformRef.current.skala <= 1.02) {
          if (!harBevaegetSig.current) {
            paaLuk()
          } else if (Math.abs(dx) > SWIPE_MIN_VANDRET && Math.abs(dy) < SWIPE_MAKS_LODRET) {
            if (dx < 0) paaNaeste()
            else paaForrige()
          }
        }
        enkeltStart.current = null
      }

      // Gik vi fra to fingre til én (slap et pinch-greb), skal den
      // resterende finger opfattes som starten på en ny panorering -
      // ellers "hopper" billedet, næste gang fingeren bevæger sig.
      if (antalFoer === 2 && pointers.current.size === 1) {
        const resterende = Array.from(pointers.current.values())[0]
        enkeltStart.current = { x: resterende.x, y: resterende.y }
        startTransform.current = { x: transformRef.current.x, y: transformRef.current.y }
        harBevaegetSig.current = true
      }
    },
    [paaLuk, paaNaeste, paaForrige],
  )

  const onPointerCancel = useCallback((e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    enkeltStart.current = null
  }, [])

  return {
    transform,
    nulstilZoom,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
