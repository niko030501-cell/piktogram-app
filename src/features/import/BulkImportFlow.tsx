// Den vigtigste funktion i appen: vælg mange billedfiler på én gang, få et
// navn foreslået ud fra filnavnet, ret det der skal rettes, og gem det hele
// samlet. Billederne skaleres og komprimeres i baggrunden, mens listen vises.

import { useEffect, useState } from 'react'
import { useData } from '../../state/DataProvider'
import { useObjectUrl } from '../../state/useObjectUrl'
import { filnavnTilNavn } from '../../utils/filenameToName'
import { skalerOgKomprimerBillede, vaelgFlereBilleder } from './imageProcessing'
import { nytPiktogramId } from '../../db/pictogramsRepo'
import type { Kategori, Piktogram } from '../../db/schema'
import knap from '../../styles/buttons.module.css'
import styles from './BulkImportFlow.module.css'

interface Props {
  forudvalgtKategoriId?: string
  onLuk: () => void
}

interface Kladde {
  id: string
  fil: File
  navn: string
  kategoriId: string
  status: 'venter' | 'behandler' | 'klar' | 'fejl'
  komprimeretBillede: Blob | null
}

export function BulkImportFlow({ forudvalgtKategoriId, onLuk }: Props) {
  const { kategorier, piktogrammerForKategori, tilfoejPiktogrammer } = useData()
  const [kladder, setKladder] = useState<Kladde[]>([])
  const [harValgtFiler, setHarValgtFiler] = useState(false)
  const [gemmer, setGemmer] = useState(false)

  const standardKategoriId = forudvalgtKategoriId ?? kategorier[0]?.id ?? ''

  useEffect(() => {
    void (async () => {
      const filer = await vaelgFlereBilleder()
      if (filer.length === 0) {
        onLuk()
        return
      }
      setHarValgtFiler(true)
      const nyeKladder: Kladde[] = filer.map((fil) => ({
        id: crypto.randomUUID(),
        fil,
        navn: filnavnTilNavn(fil.name),
        kategoriId: standardKategoriId,
        status: 'venter',
        komprimeretBillede: null,
      }))
      setKladder(nyeKladder)

      // Billederne behandles ét ad gangen, så listen kan vise fremgang
      // undervejs i stedet for at fryse, mens alle behandles på én gang.
      for (const kladde of nyeKladder) {
        setKladder((forrige) =>
          forrige.map((k) => (k.id === kladde.id ? { ...k, status: 'behandler' } : k)),
        )
        try {
          const komprimeret = await skalerOgKomprimerBillede(kladde.fil)
          setKladder((forrige) =>
            forrige.map((k) =>
              k.id === kladde.id ? { ...k, status: 'klar', komprimeretBillede: komprimeret } : k,
            ),
          )
        } catch {
          setKladder((forrige) => forrige.map((k) => (k.id === kladde.id ? { ...k, status: 'fejl' } : k)))
        }
      }
    })()
    // Skal kun køre ved allerførste visning af skærmen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function opdaterKladde(id: string, aendringer: Partial<Kladde>) {
    setKladder((forrige) => forrige.map((k) => (k.id === id ? { ...k, ...aendringer } : k)))
  }

  function fjernKladde(id: string) {
    setKladder((forrige) => forrige.filter((k) => k.id !== id))
  }

  const alleFaerdigbehandlet =
    kladder.length > 0 && kladder.every((k) => k.status === 'klar' || k.status === 'fejl')
  const antalKlar = kladder.filter((k) => k.status === 'klar' && k.navn.trim()).length

  async function haandterGemAlle() {
    setGemmer(true)
    const naesteRaekkefolge = new Map<string, number>()
    for (const k of kategorier) {
      naesteRaekkefolge.set(k.id, piktogrammerForKategori(k.id).length)
    }

    const nyePiktogrammer: Piktogram[] = []
    for (const kladde of kladder) {
      if (kladde.status !== 'klar' || !kladde.navn.trim()) continue
      const raekkefolge = naesteRaekkefolge.get(kladde.kategoriId) ?? 0
      naesteRaekkefolge.set(kladde.kategoriId, raekkefolge + 1)
      nyePiktogrammer.push({
        id: nytPiktogramId(),
        navn: kladde.navn.trim(),
        kategoriId: kladde.kategoriId,
        billede: kladde.komprimeretBillede,
        raekkefolge,
        favorit: 0,
        snippenRaekkefolge: null,
        oprettet: Date.now(),
      })
    }

    await tilfoejPiktogrammer(nyePiktogrammer)
    setGemmer(false)
    onLuk()
  }

  if (!harValgtFiler) return null

  return (
    <div className={styles.side}>
      <header className={styles.header}>
        <button type="button" className={knap.sekundaer} onClick={onLuk}>
          ← Annuller
        </button>
        <h1 className={styles.titel}>Tilføj billeder ({kladder.length})</h1>
      </header>

      <div className={styles.body}>
        {kladder.length === 0 ? (
          <p className={styles.tom}>Ingen billeder valgt.</p>
        ) : (
          <div className={styles.liste}>
            {kladder.map((k) => (
              <KladdeRaekke
                key={k.id}
                kladde={k}
                kategorier={kategorier}
                onNavnAendret={(navn) => opdaterKladde(k.id, { navn })}
                onKategoriAendret={(kategoriId) => opdaterKladde(k.id, { kategoriId })}
                onFjern={() => fjernKladde(k.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.bund}>
        <button
          type="button"
          className={knap.primaer}
          disabled={!alleFaerdigbehandlet || gemmer || antalKlar === 0}
          onClick={haandterGemAlle}
        >
          {gemmer ? 'Gemmer...' : `Gem ${antalKlar} billede${antalKlar === 1 ? '' : 'r'}`}
        </button>
      </div>
    </div>
  )
}

function KladdeRaekke({
  kladde,
  kategorier,
  onNavnAendret,
  onKategoriAendret,
  onFjern,
}: {
  kladde: Kladde
  kategorier: Kategori[]
  onNavnAendret: (navn: string) => void
  onKategoriAendret: (kategoriId: string) => void
  onFjern: () => void
}) {
  const forhaandsvisningUrl = useObjectUrl(kladde.komprimeretBillede)

  return (
    <div className={styles.raekke}>
      <span className={styles.thumb}>
        {forhaandsvisningUrl && <img src={forhaandsvisningUrl} alt="" />}
        {kladde.status === 'behandler' && <span className={styles.thumbStatus}>Behandler...</span>}
        {kladde.status === 'fejl' && <span className={styles.thumbFejl}>Fejl</span>}
      </span>
      <input
        type="text"
        value={kladde.navn}
        onChange={(e) => onNavnAendret(e.target.value)}
        className={styles.navnInput}
        placeholder="Navn"
        aria-label="Navn"
      />
      <select
        value={kladde.kategoriId}
        onChange={(e) => onKategoriAendret(e.target.value)}
        className={styles.kategoriSelect}
        aria-label="Kategori"
      >
        {kategorier.map((k) => (
          <option key={k.id} value={k.id}>
            {k.navn}
          </option>
        ))}
      </select>
      <button type="button" className={styles.fjernKnap} onClick={onFjern}>
        Fjern
      </button>
    </div>
  )
}
