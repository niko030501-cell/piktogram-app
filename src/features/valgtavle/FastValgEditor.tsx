// Opret eller rediger ét fast valg: navn, spørgsmål der siges højt, og
// hvilke 2-4 piktogrammer det består af.

import { useState } from 'react'
import { useData } from '../../state/DataProvider'
import { PictogramCard } from '../category/PictogramCard'
import { ConfirmDeleteDialog } from '../edit/ConfirmDeleteDialog'
import { VALGTAVLE_MAKS, VALGTAVLE_MIN } from '../../db/schema'
import type { FastValg } from '../../db/schema'
import knap from '../../styles/buttons.module.css'
import editStyles from '../edit/EditSheet.module.css'
import styles from './ChoiceBoard.module.css'

interface Props {
  /** Udelades ved oprettelse af et nyt fast valg. */
  fastValg?: FastValg
  onLuk: () => void
}

export function FastValgEditor({ fastValg, onLuk }: Props) {
  const { kategorier, piktogrammerForKategori, opretFastValg, opdaterFastValg, sletFastValg } = useData()
  const [navn, setNavn] = useState(fastValg?.navn ?? '')
  const [sporgsmaal, setSporgsmaal] = useState(fastValg?.sporgsmaal ?? '')
  const [valgte, setValgte] = useState<string[]>(fastValg?.piktogramIds ?? [])
  const [visSletBekraeft, setVisSletBekraeft] = useState(false)
  const [gemmer, setGemmer] = useState(false)

  function toggleValg(id: string) {
    setValgte((forrige) => {
      if (forrige.includes(id)) return forrige.filter((v) => v !== id)
      if (forrige.length >= VALGTAVLE_MAKS) return forrige
      return [...forrige, id]
    })
  }

  const kanGemme =
    navn.trim().length > 0 &&
    sporgsmaal.trim().length > 0 &&
    valgte.length >= VALGTAVLE_MIN &&
    valgte.length <= VALGTAVLE_MAKS

  async function haandterGem() {
    if (!kanGemme) return
    setGemmer(true)
    if (fastValg) {
      await opdaterFastValg({
        ...fastValg,
        navn: navn.trim(),
        sporgsmaal: sporgsmaal.trim(),
        piktogramIds: valgte,
      })
    } else {
      await opretFastValg(navn.trim(), sporgsmaal.trim(), valgte)
    }
    setGemmer(false)
    onLuk()
  }

  async function haandterSlet() {
    if (!fastValg) return
    await sletFastValg(fastValg.id)
    onLuk()
  }

  if (visSletBekraeft && fastValg) {
    return (
      <ConfirmDeleteDialog
        titel="Slet fast valg?"
        besked={`Er du sikker på, at "${fastValg.navn}" skal slettes? Det kan ikke fortrydes.`}
        onBekraeft={haandterSlet}
        onAnnuller={() => setVisSletBekraeft(false)}
      />
    )
  }

  return (
    <div className={styles.opsaetningSide}>
      <header className={styles.opsaetningHeader}>
        <button type="button" className={knap.sekundaer} onClick={onLuk}>
          ← Annuller
        </button>
        <h1 className={styles.opsaetningTitel}>{fastValg ? 'Rediger fast valg' : 'Nyt fast valg'}</h1>
      </header>

      <div className={styles.opsaetningBody}>
        <label className={editStyles.felt}>
          <span>Navn</span>
          <input
            type="text"
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            className={editStyles.input}
            placeholder='fx "Gå eller cykle"'
          />
        </label>

        <label className={editStyles.felt}>
          <span>Spørgsmål der siges højt, når valget hentes frem</span>
          <input
            type="text"
            value={sporgsmaal}
            onChange={(e) => setSporgsmaal(e.target.value)}
            className={editStyles.input}
            placeholder='fx "Vil du gå eller cykle?"'
          />
        </label>

        <p className={styles.hjaelp}>
          Vælg {VALGTAVLE_MIN}-{VALGTAVLE_MAKS} piktogrammer ({valgte.length} valgt).
        </p>

        {kategorier.map((k) => {
          const alle = piktogrammerForKategori(k.id).filter((p) => p.billede)
          if (alle.length === 0) return null
          return (
            <div key={k.id} className={styles.kategoriBlok}>
              <h3 className={styles.underoverskrift} style={{ color: k.farve }}>
                {k.navn}
              </h3>
              <div className={styles.valgGrid}>
                {alle.map((p) => (
                  <PictogramCard
                    key={p.id}
                    piktogram={p}
                    valgt={valgte.includes(p.id)}
                    visValgMarkering
                    onClick={() => toggleValg(p.id)}
                    disabled={!valgte.includes(p.id) && valgte.length >= VALGTAVLE_MAKS}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.opsaetningBund}>
        {fastValg && (
          <button
            type="button"
            className={knap.fare}
            onClick={() => setVisSletBekraeft(true)}
            style={{ marginBottom: 12, width: '100%' }}
          >
            Slet dette faste valg
          </button>
        )}
        <button type="button" className={knap.primaer} disabled={!kanGemme || gemmer} onClick={haandterGem}>
          Gem
        </button>
      </div>
    </div>
  )
}
