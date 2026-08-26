// Selve valgtavlen: 2-4 piktogrammer side om side, store og lige store. Når
// hun rører ved ét, fremhæves det og de andre dæmpes, og ordet siges højt.
// Bliver stående til personalet lukker den - det er meningen, at hun kan
// nå at trykke flere gange og skifte mening.
//
// Nederst kan personalet notere svaret med ét tryk: det piktogram der blev
// valgt, at hun ikke svarede, eller at hun svarede på en anden måde end ved
// at pege (fx med ord, tegn, eller ved at gå hen mod det hun ville). De tre
// knapper vejer bevidst lige tungt - ingen af dem er "rigtigere" end de andre.

import { useState } from 'react'
import { useData } from '../../state/DataProvider'
import { useObjectUrl } from '../../state/useObjectUrl'
import { useSpeech } from '../../speech/useSpeech'
import type { SvarType } from '../../db/schema'
import styles from './ChoiceBoard.module.css'

interface Props {
  piktogramIds: string[]
  fastValgNavn: string | null
  sporgsmaal: string | null
  onLuk: () => void
}

export function ChoiceBoardView({ piktogramIds, fastValgNavn, onLuk }: Props) {
  const { piktogrammer, tilfoejValgRegistrering } = useData()
  const sig = useSpeech()
  const [fremhaevet, setFremhaevet] = useState<string | null>(null)
  const [sidstNoteret, setSidstNoteret] = useState<string | null>(null)

  const valgte = piktogramIds
    .map((id) => piktogrammer.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)

  const fremhaevetOrd = valgte.find((p) => p.id === fremhaevet)?.navn ?? null

  function haandterTryk(id: string, navn: string) {
    setFremhaevet(id)
    sig(navn)
  }

  async function noter(svar: SvarType) {
    await tilfoejValgRegistrering({
      tidspunkt: Date.now(),
      tilbudt: valgte.map((p) => p.navn),
      fastValgNavn,
      svar,
    })
    const beskrivelse =
      svar.type === 'valgte'
        ? `"${svar.ord}"`
        : svar.type === 'ingen-respons'
          ? 'Svarede ikke'
          : 'Svarede på anden måde'
    const klokken = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
    setSidstNoteret(`Noteret: ${beskrivelse} kl. ${klokken}`)
    setFremhaevet(null)
  }

  if (valgte.length === 0) {
    return (
      <div className={styles.visningSide}>
        <p className={styles.tomBesked}>Piktogrammerne findes ikke længere.</p>
        <button type="button" className={styles.lukKnap} onClick={onLuk}>
          Luk valgtavle
        </button>
      </div>
    )
  }

  return (
    <div className={styles.visningSide}>
      <button type="button" className={styles.lukKnap} onClick={onLuk}>
        Luk valgtavle
      </button>
      <div className={styles.grid} data-antal={valgte.length}>
        {valgte.map((p) => (
          <ValgKnap
            key={p.id}
            navn={p.navn}
            billede={p.billede}
            fremhaevet={fremhaevet === p.id}
            daempet={fremhaevet !== null && fremhaevet !== p.id}
            onClick={() => haandterTryk(p.id, p.navn)}
          />
        ))}
      </div>

      <div className={styles.noterPanel}>
        {sidstNoteret && <p className={styles.noteretBesked}>{sidstNoteret}</p>}
        <div className={styles.noterKnapper}>
          <button
            type="button"
            className={styles.noterKnap}
            disabled={!fremhaevetOrd}
            onClick={() => fremhaevetOrd && noter({ type: 'valgte', ord: fremhaevetOrd })}
          >
            {fremhaevetOrd ? `Notér: ${fremhaevetOrd}` : 'Notér valgt'}
          </button>
          <button type="button" className={styles.noterKnap} onClick={() => noter({ type: 'ingen-respons' })}>
            Svarede ikke
          </button>
          <button type="button" className={styles.noterKnap} onClick={() => noter({ type: 'andet' })}>
            Svarede på anden måde
          </button>
        </div>
      </div>
    </div>
  )
}

function ValgKnap({
  navn,
  billede,
  fremhaevet,
  daempet,
  onClick,
}: {
  navn: string
  billede: Blob | null
  fremhaevet: boolean
  daempet: boolean
  onClick: () => void
}) {
  const billedeUrl = useObjectUrl(billede)
  return (
    <button
      type="button"
      className={`${styles.valgKnap} ${fremhaevet ? styles.fremhaevet : ''} ${daempet ? styles.daempet : ''}`}
      onClick={onClick}
    >
      {billedeUrl ? (
        <img src={billedeUrl} alt="" className={styles.valgBillede} />
      ) : (
        <span className={styles.valgMangler}>Mangler billede</span>
      )}
      <span className={styles.valgNavn}>{navn}</span>
    </button>
  )
}
