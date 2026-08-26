// Den store, fulde skærmvisning af ét piktogram. Dette er sådan personalet
// viser et billede til hende: det vokser roligt ud fra det kort der blev
// trykket på (medmindre "reducer bevægelse" er slået til), kan zoomes med to
// fingre, og man kan swipe til næste/forrige billede i samme kategori.
//
// Tale (talesyntese) udløses IKKE herfra, men af den kode der åbner
// visningen (PictogramCard, SnippenBar) og af swipe-skiftet nedenfor - det
// er et krav fra iOS, at speechSynthesis.speak() startes direkte inde i en
// tryk-handling, ikke i en useEffect.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Piktogram } from '../../db/schema'
import { useObjectUrl } from '../../state/useObjectUrl'
import { usePrefersReducedMotion } from '../../utils/reducedMotion'
import { useSpeech } from '../../speech/useSpeech'
import { useImageGestures } from './useImageGestures'
import styles from './FullscreenViewer.module.css'

interface Props {
  piktogrammer: Piktogram[]
  startIndeks: number
  oprindelsesRect: DOMRectReadOnly | null
  onLuk: () => void
}

const LUKKE_VARIGHED_MS = 260

export function FullscreenViewer({ piktogrammer, startIndeks, oprindelsesRect, onLuk }: Props) {
  const [indeks, setIndeks] = useState(startIndeks)
  const [voksetUd, setVoksetUd] = useState(false)
  const [lukker, setLukker] = useState(false)
  const reducerBevaegelse = usePrefersReducedMotion()
  const sig = useSpeech()
  const foersteRender = useRef(true)
  const onLukKaldt = useRef(false)

  const aktuelt = piktogrammer[indeks]
  const billedeUrl = useObjectUrl(aktuelt?.billede)

  const { transform, nulstilZoom, handlers } = useImageGestures({
    paaNaeste: () => gaaTil(indeks + 1),
    paaForrige: () => gaaTil(indeks - 1),
    paaLuk: () => haandterLuk(),
  })

  // Åbning: start i "krympet til kortets størrelse", flyt derefter til fuld
  // skærm på næste billede-frame, så CSS-transitionen kan animere imellem.
  useEffect(() => {
    if (reducerBevaegelse || !oprindelsesRect) {
      setVoksetUd(true)
      return
    }
    const frame = requestAnimationFrame(() => {
      setVoksetUd(true)
      foersteRender.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [reducerBevaegelse, oprindelsesRect])

  function kaldOnLukEnGang() {
    if (onLukKaldt.current) return
    onLukKaldt.current = true
    onLuk()
  }

  function gaaTil(nytIndeks: number) {
    if (nytIndeks < 0 || nytIndeks >= piktogrammer.length) return
    const nytPiktogram = piktogrammer[nytIndeks]
    if (!nytPiktogram) return
    setIndeks(nytIndeks)
    nulstilZoom()
    sig(nytPiktogram.navn)
  }

  const brugFlipLukning = !reducerBevaegelse && !!oprindelsesRect && indeks === startIndeks

  function haandterLuk() {
    if (lukker) return
    setLukker(true)
    if (!brugFlipLukning) {
      // Ingen tydelig "hjem"-position at animere tilbage til (fx efter
      // swipe til et andet billede) - så toner vi det hele ud i stedet.
      return
    }
    foersteRender.current = false
    setVoksetUd(false)
  }

  // Sikkerhedsnet: hvis transitionend af en eller anden grund ikke fyrer,
  // skal visningen stadig lukke.
  useEffect(() => {
    if (!lukker) return
    const timer = setTimeout(kaldOnLukEnGang, LUKKE_VARIGHED_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lukker])

  useEffect(() => {
    function paaTast(e: KeyboardEvent) {
      if (e.key === 'Escape') haandterLuk()
      if (e.key === 'ArrowRight') gaaTil(indeks + 1)
      if (e.key === 'ArrowLeft') gaaTil(indeks - 1)
    }
    window.addEventListener('keydown', paaTast)
    return () => window.removeEventListener('keydown', paaTast)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indeks, lukker])

  const flipStil = useMemo((): CSSProperties => {
    if (voksetUd || !oprindelsesRect || reducerBevaegelse) {
      return { transform: 'none' }
    }
    const dx = oprindelsesRect.left + oprindelsesRect.width / 2 - window.innerWidth / 2
    const dy = oprindelsesRect.top + oprindelsesRect.height / 2 - window.innerHeight / 2
    const sx = oprindelsesRect.width / window.innerWidth
    const sy = oprindelsesRect.height / window.innerHeight
    return {
      transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
      transition: foersteRender.current ? 'none' : undefined,
    }
  }, [voksetUd, oprindelsesRect, reducerBevaegelse])

  if (!aktuelt) return null

  return (
    <div
      className={`${styles.baggrund} ${lukker && !brugFlipLukning ? styles.lukkerFade : ''}`}
      style={flipStil}
      role="dialog"
      aria-modal="true"
      aria-label={aktuelt.navn}
      onTransitionEnd={(e) => {
        if (lukker && e.target === e.currentTarget) kaldOnLukEnGang()
      }}
    >
      <div className={`${styles.indhold} ${voksetUd ? styles.synlig : ''}`}>
        <div className={styles.billedRamme} {...handlers}>
          {billedeUrl ? (
            <img
              src={billedeUrl}
              alt={aktuelt.navn}
              className={styles.billede}
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.skala})`,
              }}
              draggable={false}
            />
          ) : (
            <div className={styles.mangler}>Mangler billede</div>
          )}
        </div>
        <p className={styles.ord}>{aktuelt.navn}</p>
      </div>
    </div>
  )
}
