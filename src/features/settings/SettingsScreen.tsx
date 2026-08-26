// Indstillinger: tale til/fra, genveje til at tilføje billeder og tage en
// sikkerhedskopi, samt at slå Leyla-tilstand til. Denne skærm er skjult,
// mens Leyla-tilstand er aktiv.

import { useState } from 'react'
import { useSettings } from '../../state/SettingsProvider'
import { LeylaAktiverModal } from '../leyla/LeylaAktiverModal'
import type { NavigerTil } from '../../app/viewState'
import knap from '../../styles/buttons.module.css'
import styles from './SettingsScreen.module.css'

interface Props {
  navigerTil: NavigerTil
  onLuk: () => void
}

export function SettingsScreen({ navigerTil, onLuk }: Props) {
  const { speechEnabled, saetSpeechEnabled } = useSettings()
  const [visLeylaOpsaetning, setVisLeylaOpsaetning] = useState(false)

  return (
    <div className={styles.side}>
      <header className={styles.header}>
        <button type="button" className={knap.sekundaer} onClick={onLuk}>
          ← Tilbage
        </button>
        <h1 className={styles.titel}>Indstillinger</h1>
      </header>

      <div className={styles.body}>
        <section className={styles.raekke}>
          <div>
            <h2 className={styles.overskrift}>Sig ordet højt</h2>
            <p className={styles.beskrivelse}>Læser ordet højt på dansk, når et billede vises stort.</p>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={speechEnabled}
              onChange={(e) => void saetSpeechEnabled(e.target.checked)}
            />
            <span className={styles.switchSpor} />
          </label>
        </section>

        <section className={styles.raekke}>
          <div>
            <h2 className={styles.overskrift}>Tilføj billeder</h2>
            <p className={styles.beskrivelse}>Tilføj mange billeder på én gang.</p>
          </div>
          <button
            type="button"
            className={knap.sekundaer}
            onClick={() => navigerTil({ kind: 'bulkImport' })}
          >
            Tilføj
          </button>
        </section>

        <section className={styles.raekke}>
          <div>
            <h2 className={styles.overskrift}>Sikkerhedskopi</h2>
            <p className={styles.beskrivelse}>
              Gem alt til én fil, eller gendan fra en tidligere sikkerhedskopi.
            </p>
          </div>
          <button
            type="button"
            className={knap.sekundaer}
            onClick={() => navigerTil({ kind: 'sikkerhedskopi' })}
          >
            Åbn
          </button>
        </section>

        <section className={styles.raekke}>
          <div>
            <h2 className={styles.overskrift}>Leyla-tilstand</h2>
            <p className={styles.beskrivelse}>
              Lås appen så der kun kan bruges piktogrammer - intet kan redigeres eller slettes. Slås fra
              igen med koden, via et langt tryk nederst i hjørnet.
            </p>
          </div>
          <button type="button" className={knap.primaer} onClick={() => setVisLeylaOpsaetning(true)}>
            Slå til
          </button>
        </section>
      </div>

      {visLeylaOpsaetning && (
        <LeylaAktiverModal
          onLuk={() => setVisLeylaOpsaetning(false)}
          onAktiveret={() => {
            setVisLeylaOpsaetning(false)
            onLuk()
          }}
        />
      )}
    </div>
  )
}
