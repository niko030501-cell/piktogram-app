// Rediger ét piktogram: navn, kategori, billede - og slet (med bekræftelse).
// Alt gemmes samlet med "Gem"-knappen, så en halvfærdig ændring ikke kan
// gemmes ved et uheld.

import { useState } from 'react'
import { Modal } from '../../components/Modal'
import knap from '../../styles/buttons.module.css'
import { useData } from '../../state/DataProvider'
import { useObjectUrl } from '../../state/useObjectUrl'
import { skalerOgKomprimerBillede, vaelgEnkeltBillede } from '../import/imageProcessing'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import type { Piktogram } from '../../db/schema'
import styles from './EditSheet.module.css'

interface Props {
  piktogram: Piktogram
  onLuk: () => void
}

export function EditPictogramSheet({ piktogram, onLuk }: Props) {
  const { kategorier, opdaterPiktogram, sletPiktogram } = useData()
  const [navn, setNavn] = useState(piktogram.navn)
  const [kategoriId, setKategoriId] = useState(piktogram.kategoriId)
  const [billede, setBillede] = useState<Blob | null>(piktogram.billede)
  const [visSletBekraeft, setVisSletBekraeft] = useState(false)
  const [gemmer, setGemmer] = useState(false)
  const billedeUrl = useObjectUrl(billede)

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
    await opdaterPiktogram({ ...piktogram, navn: trimmet, kategoriId, billede })
    setGemmer(false)
    onLuk()
  }

  async function haandterSlet() {
    await sletPiktogram(piktogram.id)
    onLuk()
  }

  if (visSletBekraeft) {
    return (
      <ConfirmDeleteDialog
        titel="Slet piktogram?"
        besked={`Er du sikker på, at "${piktogram.navn}" skal slettes? Det kan ikke fortrydes.`}
        onBekraeft={haandterSlet}
        onAnnuller={() => setVisSletBekraeft(false)}
      />
    )
  }

  return (
    <Modal titel="Rediger piktogram" onLuk={onLuk}>
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

      <label className={styles.felt}>
        <span>Navn (ordet der siges højt)</span>
        <input
          type="text"
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
          className={styles.input}
        />
      </label>

      <label className={styles.felt}>
        <span>Kategori</span>
        <select
          value={kategoriId}
          onChange={(e) => setKategoriId(e.target.value)}
          className={styles.input}
        >
          {kategorier.map((k) => (
            <option key={k.id} value={k.id}>
              {k.navn}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.knapRaekke}>
        <button type="button" className={knap.fare} onClick={() => setVisSletBekraeft(true)}>
          Slet
        </button>
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
