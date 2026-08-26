// Startpunktet for valgtavlen: personalets faste, gemte valg (fx "Gå eller
// cykle") kan hentes frem med ét tryk øverst, eller man kan selv bygge et
// valg af 2-4 piktogrammer nedenfor. At HENTE et fast valg frem er en
// almindelig "brug"-handling og virker derfor også i Leyla-tilstand -
// oprettelse/redigering af faste valg og det at bygge et nyt valg fra bunden
// er derimod personalets opgave og skjules i Leyla-tilstand.

import { forwardRef, useState } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useData } from '../../state/DataProvider'
import { useSettings } from '../../state/SettingsProvider'
import { useSpeech } from '../../speech/useSpeech'
import { useObjectUrl } from '../../state/useObjectUrl'
import { PictogramCard } from '../category/PictogramCard'
import { FastValgEditor } from './FastValgEditor'
import { VALGTAVLE_MAKS, VALGTAVLE_MIN } from '../../db/schema'
import type { FastValg, Piktogram } from '../../db/schema'
import type { NavigerTil } from '../../app/viewState'
import knap from '../../styles/buttons.module.css'
import styles from './ChoiceBoard.module.css'

interface Props {
  navigerTil: NavigerTil
  onLuk: () => void
}

export function ChoiceBoardSetup({ navigerTil, onLuk }: Props) {
  const { kategorier, piktogrammerForKategori, fasteValg, omorganiserFasteValg } = useData()
  const { leylaMode } = useSettings()
  const sig = useSpeech()
  const [valgte, setValgte] = useState<string[]>([])
  const [redigererFasteValg, setRedigererFasteValg] = useState(false)
  const [redigeresFastValg, setRedigeresFastValg] = useState<FastValg | 'ny' | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function toggleValg(id: string) {
    setValgte((forrige) => {
      if (forrige.includes(id)) return forrige.filter((v) => v !== id)
      if (forrige.length >= VALGTAVLE_MAKS) return forrige
      return [...forrige, id]
    })
  }

  function haandterHentFastValg(fv: FastValg) {
    sig(fv.sporgsmaal)
    navigerTil({
      kind: 'valgtavleVisning',
      piktogramIds: fv.piktogramIds,
      fastValgNavn: fv.navn,
      sporgsmaal: fv.sporgsmaal,
    })
  }

  function haandterDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fraIndeks = fasteValg.findIndex((f) => f.id === active.id)
    const tilIndeks = fasteValg.findIndex((f) => f.id === over.id)
    if (fraIndeks === -1 || tilIndeks === -1) return
    const nyRaekkefolge = [...fasteValg]
    const [flyttet] = nyRaekkefolge.splice(fraIndeks, 1)
    nyRaekkefolge.splice(tilIndeks, 0, flyttet)
    void omorganiserFasteValg(nyRaekkefolge)
  }

  const kanVise = valgte.length >= VALGTAVLE_MIN && valgte.length <= VALGTAVLE_MAKS

  if (redigeresFastValg) {
    return (
      <FastValgEditor
        fastValg={redigeresFastValg === 'ny' ? undefined : redigeresFastValg}
        onLuk={() => setRedigeresFastValg(null)}
      />
    )
  }

  return (
    <div className={styles.opsaetningSide}>
      <header className={styles.opsaetningHeader}>
        <button type="button" className={knap.sekundaer} onClick={onLuk}>
          ← Tilbage
        </button>
        <h1 className={styles.opsaetningTitel}>Valgtavle</h1>
      </header>

      <div className={styles.opsaetningBody}>
        <section>
          <div className={styles.fastValgHeaderRaekke}>
            <h2 className={styles.overskrift}>Faste valg</h2>
            {!leylaMode && (
              <button
                type="button"
                className={knap.sekundaer}
                onClick={() => setRedigererFasteValg((v) => !v)}
              >
                {redigererFasteValg ? 'Færdig' : 'Rediger'}
              </button>
            )}
          </div>

          {fasteValg.length === 0 ? (
            <p className={styles.hjaelp}>
              {leylaMode ? 'Ingen faste valg endnu.' : 'Ingen faste valg endnu - opret ét nedenfor.'}
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={haandterDragEnd}>
              <SortableContext items={fasteValg.map((f) => f.id)} strategy={rectSortingStrategy}>
                <div className={styles.fastValgGrid}>
                  {fasteValg.map((f) => (
                    <SorterbartFastValgKort
                      key={f.id}
                      fastValg={f}
                      redigerer={redigererFasteValg}
                      onTryk={() =>
                        redigererFasteValg ? setRedigeresFastValg(f) : haandterHentFastValg(f)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {!leylaMode && redigererFasteValg && (
            <button
              type="button"
              className={styles.nytFastValg}
              onClick={() => setRedigeresFastValg('ny')}
            >
              + Nyt fast valg
            </button>
          )}

          {!leylaMode && (
            <button
              type="button"
              className={styles.registreringerLink}
              onClick={() => navigerTil({ kind: 'valgRegistreringer' })}
            >
              Seneste registreringer →
            </button>
          )}
        </section>

        {!leylaMode && (
          <section>
            <h2 className={styles.overskrift}>Eller byg et valg selv</h2>
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

            <button
              type="button"
              className={knap.primaer}
              disabled={!kanVise}
              onClick={() =>
                navigerTil({
                  kind: 'valgtavleVisning',
                  piktogramIds: valgte,
                  fastValgNavn: null,
                  sporgsmaal: null,
                })
              }
            >
              Vis valg
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

const FastValgKort = forwardRef<
  HTMLButtonElement,
  { fastValg: FastValg } & ButtonHTMLAttributes<HTMLButtonElement>
>(function FastValgKort({ fastValg, className, ...resten }, ref) {
  const { piktogrammer } = useData()
  const billeder = fastValg.piktogramIds
    .map((id) => piktogrammer.find((p) => p.id === id))
    .filter((p): p is Piktogram => !!p)

  return (
    <button ref={ref} type="button" className={`${styles.fastValgKnap} ${className ?? ''}`} {...resten}>
      <span className={styles.fastValgThumbs}>
        {billeder.map((p) => (
          <FastValgThumb key={p.id} piktogram={p} />
        ))}
      </span>
      <span className={styles.fastValgNavn}>{fastValg.navn}</span>
    </button>
  )
})

function FastValgThumb({ piktogram }: { piktogram: Piktogram }) {
  const url = useObjectUrl(piktogram.billede)
  return <span className={styles.fastValgThumb}>{url && <img src={url} alt="" />}</span>
}

function SorterbartFastValgKort({
  fastValg,
  redigerer,
  onTryk,
}: {
  fastValg: FastValg
  redigerer: boolean
  onTryk: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: fastValg.id,
    disabled: !redigerer,
  })
  return (
    <FastValgKort
      ref={setNodeRef}
      fastValg={fastValg}
      onClick={onTryk}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={redigerer ? styles.redigerbar : undefined}
      {...(redigerer ? { ...attributes, ...listeners } : {})}
    />
  )
}
