// En enkel liste over de seneste registreringer fra valgtavlen, nyeste
// øverst. Kan kopieres som almindelig tekst til at sætte ind i journalen.
// Bevidst ingen grafer eller statistik - kun en facitliste.

import { useState } from 'react'
import { useData } from '../../state/DataProvider'
import type { ValgRegistrering } from '../../db/schema'
import knap from '../../styles/buttons.module.css'
import styles from './ValgRegistreringerListe.module.css'

interface Props {
  onLuk: () => void
}

const VIST_MAKS = 100

function formaterTidspunkt(t: number): string {
  return new Date(t).toLocaleString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formaterSvar(svar: ValgRegistrering['svar']): string {
  if (svar.type === 'valgte') return svar.ord
  if (svar.type === 'ingen-respons') return 'Svarede ikke'
  return 'Svarede på anden måde'
}

function tilTekstlinje(r: ValgRegistrering): string {
  const fastValgDel = r.fastValgNavn ? `"${r.fastValgNavn}" - ` : ''
  return `${formaterTidspunkt(r.tidspunkt)} — ${fastValgDel}Tilbudt: ${r.tilbudt.join(', ')}. Svar: ${formaterSvar(r.svar)}`
}

export function ValgRegistreringerListe({ onLuk }: Props) {
  const { valgRegistreringer } = useData()
  const [kopieretBesked, setKopieretBesked] = useState<string | null>(null)
  const [visManueltFallback, setVisManueltFallback] = useState(false)

  const synlige = valgRegistreringer.slice(0, VIST_MAKS)
  const heleTeksten = valgRegistreringer.map(tilTekstlinje).join('\n')

  async function haandterKopier() {
    try {
      await navigator.clipboard.writeText(heleTeksten)
      setKopieretBesked('Kopieret! Du kan nu sætte det ind i journalen.')
      setVisManueltFallback(false)
    } catch {
      setKopieretBesked('Kunne ikke kopiere automatisk - marker og kopier teksten herunder i stedet.')
      setVisManueltFallback(true)
    }
  }

  return (
    <div className={styles.side}>
      <header className={styles.header}>
        <button type="button" className={knap.sekundaer} onClick={onLuk}>
          ← Tilbage
        </button>
        <h1 className={styles.titel}>Seneste registreringer</h1>
      </header>

      <div className={styles.body}>
        <button
          type="button"
          className={knap.primaer}
          onClick={haandterKopier}
          disabled={valgRegistreringer.length === 0}
        >
          Kopiér som tekst
        </button>
        {kopieretBesked && <p className={styles.kopieretBesked}>{kopieretBesked}</p>}
        {visManueltFallback && (
          <textarea readOnly className={styles.manuelTekst} value={heleTeksten} onFocus={(e) => e.target.select()} />
        )}

        {valgRegistreringer.length === 0 ? (
          <p className={styles.tom}>Ingen registreringer endnu.</p>
        ) : (
          <ul className={styles.liste}>
            {synlige.map((r) => (
              <li key={r.id} className={styles.raekke}>
                <span className={styles.tidspunkt}>{formaterTidspunkt(r.tidspunkt)}</span>
                {r.fastValgNavn && <span className={styles.fastValgNavn}>{r.fastValgNavn}</span>}
                <span className={styles.detalje}>Tilbudt: {r.tilbudt.join(', ')}</span>
                <span className={styles.svar}>Svar: {formaterSvar(r.svar)}</span>
              </li>
            ))}
          </ul>
        )}
        {valgRegistreringer.length > synlige.length && (
          <p className={styles.hjaelp}>
            Viser de {synlige.length} seneste. Alle er med i "Kopiér som tekst" og i sikkerhedskopien.
          </p>
        )}
      </div>
    </div>
  )
}
