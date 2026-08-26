// Opret en ny kategori eller rediger en eksisterende: navn, billede, farve,
// og slet (med bekræftelse - og en tydelig advarsel hvis kategorien
// indeholder piktogrammer, da de også slettes).

import { useState } from 'react'
import { Modal } from '../../components/Modal'
import knap from '../../styles/buttons.module.css'
import { useData } from '../../state/DataProvider'
import { useObjectUrl } from '../../state/useObjectUrl'
import { skalerOgKomprimerBillede, vaelgEnkeltBillede } from '../import/imageProcessing'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import type { Kategori } from '../../db/schema'
import styles from './EditSheet.module.css'

const FARVE_FORSLAG = [
  '#5B7FA6',
  '#C97B4A',
  '#5FA090',
  '#9B72B0',
  '#C15C6B',
  '#7C8C5C',
  '#4A7A8C',
  '#A67C52',
  '#6B6EA6',
  '#8C6A5B',
]

interface Props {
  /** Udelades ved oprettelse af en ny kategori. */
  kategori?: Kategori
  onLuk: () => void
}

export function EditCategorySheet({ kategori, onLuk }: Props) {
  const { opretKategori, opdaterKategori, sletKategoriOgIndhold, piktogrammerForKategori } = useData()
  const [navn, setNavn] = useState(kategori?.navn ?? '')
  const [farve, setFarve] = useState(kategori?.farve ?? FARVE_FORSLAG[0])
  const [billede, setBillede] = useState<Blob | null>(kategori?.billede ?? null)
  const [visSletBekraeft, setVisSletBekraeft] = useState(false)
  const [gemmer, setGemmer] = useState(false)
  const billedeUrl = useObjectUrl(billede)

  const antalPiktogrammer = kategori ? piktogrammerForKategori(kategori.id).length : 0

  async function haandterSkiftBillede() {
    const fil = await vaelgEnkeltBillede()
    if (!fil) return
    const komprimeret = await skalerOgKomprimerBillede(fil)
    setBillede(komprimeret)
  }

  async function haandterGem() {
    const trimmet = navn.trim()
    if (!trimmet) return
    setGemmer(true)
    if (kategori) {
      await opdaterKategori({ ...kategori, navn: trimmet, farve, billede })
    } else {
      await opretKategori(trimmet, farve, billede)
    }
    setGemmer(false)
    onLuk()
  }

  async function haandterSlet() {
    if (!kategori) return
    await sletKategoriOgIndhold(kategori.id)
    onLuk()
  }

  if (visSletBekraeft && kategori) {
    return (
      <ConfirmDeleteDialog
        titel="Slet kategori?"
        besked={
          antalPiktogrammer > 0
            ? `"${kategori.navn}" indeholder ${antalPiktogrammer} piktogram${antalPiktogrammer === 1 ? '' : 'mer'}, som også bliver slettet. Det kan ikke fortrydes.`
            : `Er du sikker på, at "${kategori.navn}" skal slettes? Det kan ikke fortrydes.`
        }
        onBekraeft={haandterSlet}
        onAnnuller={() => setVisSletBekraeft(false)}
      />
    )
  }

  return (
    <Modal titel={kategori ? 'Rediger kategori' : 'Ny kategori'} onLuk={onLuk}>
      <div className={styles.billedRaekke}>
        <span className={styles.forhaandsvisning}>
          {billedeUrl ? (
            <img src={billedeUrl} alt="" />
          ) : (
            <span className={styles.mangler}>Intet billede</span>
          )}
        </span>
        <button type="button" className={knap.sekundaer} onClick={haandterSkiftBillede}>
          Skift billede
        </button>
      </div>
      <p className={styles.hjaelpetekst}>
        Vises på kategoriflisen på forsiden - vigtigt for at hun selv kan finde rundt uden at kunne
        læse.
      </p>

      <label className={styles.felt}>
        <span>Navn</span>
        <input
          type="text"
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
          className={styles.input}
          autoFocus
        />
      </label>

      <div className={styles.felt}>
        <span>Farve</span>
        <div className={styles.farveRaekke}>
          {FARVE_FORSLAG.map((f) => (
            <button
              key={f}
              type="button"
              className={styles.farvePrik}
              style={{ background: f, outline: farve === f ? '3px solid var(--color-focus)' : 'none' }}
              aria-label={`Vælg farve ${f}`}
              aria-pressed={farve === f}
              onClick={() => setFarve(f)}
            />
          ))}
        </div>
      </div>

      <div className={styles.knapRaekke}>
        {kategori && (
          <button type="button" className={knap.fare} onClick={() => setVisSletBekraeft(true)}>
            Slet
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className={knap.sekundaer} onClick={onLuk}>
          Annuller
        </button>
        <button
          type="button"
          className={knap.primaer}
          onClick={haandterGem}
          disabled={gemmer || !navn.trim()}
        >
          Gem
        </button>
      </div>
    </Modal>
  )
}
