// Vises diskret nederst i hjørnet, når Leyla-tilstand er slået til - ser ud
// som almindelig, rolig tekst, ikke som en knap der inviterer til at blive
// trykket på. Et langt tryk (ca. 3 sekunder) åbner en kode-tastatur, der
// låser op igen.

import { useRef, useState } from 'react'
import { useSettings } from '../../state/SettingsProvider'
import { Modal } from '../../components/Modal'
import knap from '../../styles/buttons.module.css'
import styles from './LeylaUnlockAffordance.module.css'

const LANGT_TRYK_MS = 3000

export function LeylaUnlockAffordance() {
  const { leylaCode, deaktiverLeylaTilstand } = useSettings()
  const [visPinPad, setVisPinPad] = useState(false)
  const [kode, setKode] = useState('')
  const [fejl, setFejl] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startTryk() {
    timerRef.current = setTimeout(() => {
      setVisPinPad(true)
      setKode('')
      setFejl(false)
    }, LANGT_TRYK_MS)
  }

  function stopTryk() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function tastCiffer(ciffer: string) {
    setFejl(false)
    setKode((forrige) => {
      const ny = (forrige + ciffer).slice(0, 4)
      if (ny.length === 4) {
        if (ny === leylaCode) {
          void deaktiverLeylaTilstand()
          setVisPinPad(false)
        } else {
          setFejl(true)
          return ''
        }
      }
      return ny
    })
  }

  return (
    <>
      <button
        type="button"
        className={styles.diskretKnap}
        onPointerDown={startTryk}
        onPointerUp={stopTryk}
        onPointerLeave={stopTryk}
        onPointerCancel={stopTryk}
        aria-label="Lås op (hold trykket i 3 sekunder)"
      >
        Piktogram app
      </button>

      {visPinPad && (
        <Modal titel="Indtast kode for at låse op" onLuk={() => setVisPinPad(false)}>
          <div className={styles.prikker} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`${styles.prik} ${i < kode.length ? styles.udfyldt : ''}`} />
            ))}
          </div>
          {fejl && <p className={styles.fejlBesked}>Forkert kode - prøv igen.</p>}
          <div className={styles.taltavle}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Slet'].map((t, i) =>
              t === '' ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  className={styles.tal}
                  onClick={() => (t === 'Slet' ? setKode((k) => k.slice(0, -1)) : tastCiffer(t))}
                >
                  {t}
                </button>
              ),
            )}
          </div>
          <button type="button" className={knap.sekundaer} onClick={() => setVisPinPad(false)}>
            Annuller
          </button>
        </Modal>
      )}
    </>
  )
}
