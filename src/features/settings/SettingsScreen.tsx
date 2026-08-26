// Indstillinger: tale til/fra, genveje til at tilføje billeder og tage en
// sikkerhedskopi, samt at slå Leyla-tilstand til. Denne skærm er skjult,
// mens Leyla-tilstand er aktiv.

import { useState } from 'react'
import { useSettings } from '../../state/SettingsProvider'
import { useAuth } from '../auth/AuthProvider'
import { harSkyForbindelse } from '../../sync/supabaseClient'
import { useSync } from '../../sync/SyncProvider'
import { erstatAltIndhold } from '../../db/database'
import { LeylaAktiverModal } from '../leyla/LeylaAktiverModal'
import { ConfirmDeleteDialog } from '../edit/ConfirmDeleteDialog'
import type { NavigerTil } from '../../app/viewState'
import knap from '../../styles/buttons.module.css'
import styles from './SettingsScreen.module.css'

interface Props {
  navigerTil: NavigerTil
  onLuk: () => void
}

function formaterSidstSynkroniseret(tidspunkt: number | null): string {
  if (tidspunkt === null) return 'Endnu ikke synkroniseret'
  return `Sidst synkroniseret kl. ${new Date(tidspunkt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`
}

export function SettingsScreen({ navigerTil, onLuk }: Props) {
  const { speechEnabled, saetSpeechEnabled } = useSettings()
  const { logUd } = useAuth()
  const [visLeylaOpsaetning, setVisLeylaOpsaetning] = useState(false)
  const [visLogUdBekraeft, setVisLogUdBekraeft] = useState(false)
  const [loggerUd, setLoggerUd] = useState(false)

  // useSync() kræver en <SyncProvider> - den findes altid i App.tsx, men kun
  // relevant at vise noget fra, når appen rent faktisk er sat op med en
  // sky-forbindelse.
  const { status, sidstSynkroniseret } = useSync()

  async function haandterLogUd() {
    setLoggerUd(true)
    // Rydder alt lokalt indhold - det er hele pointen med at logge ud af
    // en enhed: den skal ikke længere have hendes billeder liggende.
    await erstatAltIndhold([], [], [], [], [])
    await logUd()
    window.location.reload()
  }

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

        {harSkyForbindelse && (
          <>
            <section className={styles.raekke}>
              <div>
                <h2 className={styles.overskrift}>Sky-synkronisering</h2>
                <p className={styles.beskrivelse}>
                  {status === 'synkroniserer'
                    ? 'Synkroniserer...'
                    : status === 'fejl'
                      ? 'Kunne ikke synkronisere - prøver igen automatisk.'
                      : formaterSidstSynkroniseret(sidstSynkroniseret)}
                </p>
              </div>
            </section>

            <button type="button" className={styles.logUdLink} onClick={() => setVisLogUdBekraeft(true)}>
              Log ud af denne enhed
            </button>
          </>
        )}
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

      {visLogUdBekraeft && (
        <ConfirmDeleteDialog
          titel="Log ud af denne enhed?"
          besked="Alt indhold (kategorier, billeder, faste valg og registreringer) bliver slettet fra DENNE enhed - det ligger stadig trygt i skyen. Brug det kun, hvis telefonen er mistet eller skal udfases."
          onBekraeft={() => void haandterLogUd()}
          onAnnuller={() => setVisLogUdBekraeft(false)}
        />
      )}

      {loggerUd && <div className={styles.loggerUdOverlay}>Logger ud...</div>}
    </div>
  )
}
