// Snippen: op til 6 favoritter, ét tryk væk fra forsiden. Erstatter det
// laminerede kort på nøglesnoren - personalet sætter indholdet ud fra de
// næste par timers aktiviteter (se SnippenEditor).

import type { MouseEvent } from 'react'
import { useData } from '../../state/DataProvider'
import { useSettings } from '../../state/SettingsProvider'
import { useSpeech } from '../../speech/useSpeech'
import { useObjectUrl } from '../../state/useObjectUrl'
import type { NavigerTil } from '../../app/viewState'
import type { Piktogram } from '../../db/schema'
import styles from './SnippenBar.module.css'

interface Props {
  navigerTil: NavigerTil
}

export function SnippenBar({ navigerTil }: Props) {
  const { favoritter } = useData()
  const { leylaMode } = useSettings()
  const sig = useSpeech()

  if (favoritter.length === 0 && leylaMode) return null

  function haandterTryk(p: Piktogram, index: number, e: MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    sig(p.navn)
    navigerTil({
      kind: 'fuldskaerm',
      piktogramIds: favoritter.map((f) => f.id),
      indeks: index,
      oprindelsesRect: rect,
      tilbageTil: { kind: 'hjem' },
    })
  }

  return (
    <section className={styles.snip} aria-label="Snippen - hurtig adgang">
      <div className={styles.header}>
        <h2 className={styles.overskrift}>Snippen</h2>
        {!leylaMode && (
          <button
            type="button"
            className={styles.redigerLink}
            onClick={() => navigerTil({ kind: 'snippenRediger' })}
          >
            Rediger
          </button>
        )}
      </div>
      {favoritter.length === 0 ? (
        <button
          type="button"
          className={styles.tomKnap}
          onClick={() => navigerTil({ kind: 'snippenRediger' })}
        >
          Tilføj favoritter til Snippen
        </button>
      ) : (
        <div className={styles.raekke}>
          {favoritter.map((p, index) => (
            <SnipKnap key={p.id} piktogram={p} onClick={(e) => haandterTryk(p, index, e)} />
          ))}
        </div>
      )}
    </section>
  )
}

function SnipKnap({
  piktogram,
  onClick,
}: {
  piktogram: Piktogram
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  const { markerPiktogramBilledeOdelagt } = useData()
  const billedeUrl = useObjectUrl(piktogram.billede)
  return (
    <button type="button" className={styles.knap} onClick={onClick}>
      <span className={styles.billedRamme}>
        {billedeUrl && (
          <img
            src={billedeUrl}
            alt=""
            className={styles.billede}
            onError={() => void markerPiktogramBilledeOdelagt(piktogram.id)}
          />
        )}
      </span>
      <span className={styles.navn}>{piktogram.navn}</span>
    </button>
  )
}
