// Skærmen hvor personalet gemmer eller gendanner en sikkerhedskopi. Dette
// er det, der gør at arbejdet aldrig går tabt, og hvordan billederne senere
// flyttes over på hendes egen iPad.

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useData } from '../../state/DataProvider'
import { useSettings } from '../../state/SettingsProvider'
import { Modal } from '../../components/Modal'
import { downloadEksport, importerBackup, laesBackupFil, type IndlaestBackup } from './exportImport'
import knap from '../../styles/buttons.module.css'
import styles from './BackupScreen.module.css'

interface Props {
  onLuk: () => void
}

export function BackupScreen({ onLuk }: Props) {
  const { genindlaesFraDatabase: genindlaesData } = useData()
  const { genindlaesFraDatabase: genindlaesIndstillinger } = useSettings()
  const [eksporterer, setEksporterer] = useState(false)
  const [ventendeImport, setVentendeImport] = useState<IndlaestBackup | null>(null)
  const [importerer, setImporterer] = useState(false)
  const [fejl, setFejl] = useState<string | null>(null)
  const [besked, setBesked] = useState<string | null>(null)

  async function haandterEksport() {
    setFejl(null)
    setBesked(null)
    setEksporterer(true)
    try {
      await downloadEksport()
      setBesked('Sikkerhedskopien er gemt.')
    } catch {
      setFejl('Kunne ikke lave sikkerhedskopien. Prøv igen.')
    } finally {
      setEksporterer(false)
    }
  }

  async function haandterVaelgFil(e: ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0]
    e.target.value = ''
    if (!fil) return
    setFejl(null)
    setBesked(null)
    try {
      const indlaest = await laesBackupFil(fil)
      setVentendeImport(indlaest)
    } catch {
      setFejl('Filen kunne ikke læses. Sørg for at vælge en sikkerhedskopi-fil fra Piktogram app.')
    }
  }

  async function haandterBekraeftImport() {
    if (!ventendeImport) return
    setImporterer(true)
    try {
      await importerBackup(ventendeImport.data)
      await Promise.all([genindlaesData(), genindlaesIndstillinger()])
      setBesked('Sikkerhedskopien er gendannet.')
      setVentendeImport(null)
    } catch {
      setFejl('Import mislykkedes. Prøv igen.')
    } finally {
      setImporterer(false)
    }
  }

  return (
    <div className={styles.side}>
      <header className={styles.header}>
        <button type="button" className={knap.sekundaer} onClick={onLuk}>
          ← Tilbage
        </button>
        <h1 className={styles.titel}>Sikkerhedskopi</h1>
      </header>

      <div className={styles.body}>
        {besked && <p className={styles.succesBesked}>{besked}</p>}
        {fejl && <p className={styles.fejlBesked}>{fejl}</p>}

        <section className={styles.kort}>
          <h2 className={styles.overskrift}>Gem sikkerhedskopi</h2>
          <p>
            Gemmer alle kategorier, piktogrammer og billeder i én fil, du selv gemmer et sikkert sted
            (fx Filer-appen, mail eller iCloud).
          </p>
          <button type="button" className={knap.primaer} onClick={haandterEksport} disabled={eksporterer}>
            {eksporterer ? 'Gemmer...' : 'Gem sikkerhedskopi'}
          </button>
        </section>

        <section className={styles.kort}>
          <h2 className={styles.overskrift}>Gendan fra sikkerhedskopi</h2>
          <p>
            Erstatter ALT indhold i appen med indholdet fra filen. Brug det fx når du sætter appen op
            på en ny enhed, eller vil hente en tidligere sikkerhedskopi tilbage.
          </p>
          <label className={`${knap.sekundaer} ${styles.filKnap}`}>
            Vælg fil
            <input
              type="file"
              accept="application/json"
              onChange={(e) => void haandterVaelgFil(e)}
              className={styles.skjultInput}
            />
          </label>
        </section>
      </div>

      {ventendeImport && (
        <Modal titel="Gendan sikkerhedskopi?" onLuk={() => setVentendeImport(null)}>
          <p>
            Denne fil indeholder {ventendeImport.antalKategorier} kategorier og{' '}
            {ventendeImport.antalPiktogrammer} piktogrammer. Alt nuværende indhold i appen bliver
            erstattet. Det kan ikke fortrydes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className={knap.sekundaer} onClick={() => setVentendeImport(null)}>
              Annuller
            </button>
            <button
              type="button"
              className={knap.fare}
              onClick={haandterBekraeftImport}
              disabled={importerer}
            >
              {importerer ? 'Gendanner...' : 'Erstat alt og gendan'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
