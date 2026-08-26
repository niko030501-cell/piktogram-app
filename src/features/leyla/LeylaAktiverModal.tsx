// Slår Leyla-tilstand til: beder om en 4-cifret kode to gange (for at
// undgå tastefejl i en kode, man ikke kan se), gemmer den og låser appen.

import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useSettings } from '../../state/SettingsProvider'
import knap from '../../styles/buttons.module.css'
import styles from './LeylaUnlockAffordance.module.css'

interface Props {
  onLuk: () => void
  onAktiveret: () => void
}

export function LeylaAktiverModal({ onLuk, onAktiveret }: Props) {
  const { aktiverLeylaTilstand } = useSettings()
  const [trin, setTrin] = useState<'indtast' | 'bekraeft'>('indtast')
  const [foersteKode, setFoersteKode] = useState('')
  const [kode, setKode] = useState('')
  const [fejl, setFejl] = useState(false)

  function tastCiffer(ciffer: string) {
    setFejl(false)
    setKode((forrige) => {
      const ny = (forrige + ciffer).slice(0, 4)
      if (ny.length === 4) {
        if (trin === 'indtast') {
          setFoersteKode(ny)
          setTrin('bekraeft')
          return ''
        }
        if (ny === foersteKode) {
          void aktiverLeylaTilstand(ny).then(onAktiveret)
        } else {
          setFejl(true)
          setTrin('indtast')
          setFoersteKode('')
          return ''
        }
      }
      return ny
    })
  }

  return (
    <Modal titel={trin === 'indtast' ? 'Vælg en 4-cifret kode' : 'Bekræft koden'} onLuk={onLuk}>
      <p>Koden bruges til at låse Leyla-tilstand op igen, når den er slået til.</p>
      <div className={styles.prikker} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`${styles.prik} ${i < kode.length ? styles.udfyldt : ''}`} />
        ))}
      </div>
      {fejl && <p className={styles.fejlBesked}>Koderne var ikke ens - prøv igen.</p>}
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
      <button type="button" className={knap.sekundaer} onClick={onLuk}>
        Annuller
      </button>
    </Modal>
  )
}
