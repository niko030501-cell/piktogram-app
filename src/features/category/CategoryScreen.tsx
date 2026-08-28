// Viser alle piktogrammer i én kategori som et gitter. Almindeligt tryk
// viser billedet i fuld skærm. I "Rediger"-tilstand (skjult i
// Leyla-tilstand) kan kortene i stedet trækkes til ny rækkefølge eller
// trykkes for at åbne redigeringsvinduet. Mangler et piktogram et billede,
// åbner et tryk altid billedvælgeren, uanset tilstand - det er sådan man
// udfylder Basis-pladserne.

import { useState } from 'react'
import type { MouseEvent } from 'react'
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
import { skalerOgKomprimerBillede, vaelgEnkeltBillede } from '../import/imageProcessing'
import { EditPictogramSheet } from '../edit/EditPictogramSheet'
import { PictogramCard } from './PictogramCard'
import type { NavigerTil } from '../../app/viewState'
import type { Piktogram } from '../../db/schema'
import knap from '../../styles/buttons.module.css'
import styles from './CategoryScreen.module.css'

interface Props {
  kategoriId: string
  navigerTil: NavigerTil
}

export function CategoryScreen({ kategoriId, navigerTil }: Props) {
  const { kategorier, piktogrammerForKategori, omorganiserPiktogrammer, opdaterPiktogram } = useData()
  const { leylaMode } = useSettings()
  const sig = useSpeech()
  const [redigerer, setRedigerer] = useState(false)
  const [redigeresPiktogram, setRedigeresPiktogram] = useState<Piktogram | null>(null)

  const kategori = kategorier.find((k) => k.id === kategoriId)
  const piktogrammer = piktogrammerForKategori(kategoriId)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  if (!kategori) {
    return (
      <div className={styles.side}>
        <button type="button" className={knap.sekundaer} onClick={() => navigerTil({ kind: 'hjem' })}>
          ← Tilbage
        </button>
        <p>Kategorien findes ikke længere.</p>
      </div>
    )
  }

  async function haandterManglendeBillede(piktogram: Piktogram) {
    const fil = await vaelgEnkeltBillede()
    if (!fil) return
    const billede = await skalerOgKomprimerBillede(fil)
    await opdaterPiktogram({ ...piktogram, billede })
  }

  function haandterKortTryk(piktogram: Piktogram, index: number, e: MouseEvent<HTMLButtonElement>) {
    if (!piktogram.billede) {
      void haandterManglendeBillede(piktogram)
      return
    }
    if (redigerer) {
      setRedigeresPiktogram(piktogram)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    sig(piktogram.navn)
    navigerTil({
      kind: 'fuldskaerm',
      piktogramIds: piktogrammer.map((p) => p.id),
      indeks: index,
      oprindelsesRect: rect,
      tilbageTil: { kind: 'kategori', kategoriId },
    })
  }

  function haandterDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fraIndeks = piktogrammer.findIndex((p) => p.id === active.id)
    const tilIndeks = piktogrammer.findIndex((p) => p.id === over.id)
    if (fraIndeks === -1 || tilIndeks === -1) return
    const nyRaekkefolge = [...piktogrammer]
    const [flyttet] = nyRaekkefolge.splice(fraIndeks, 1)
    nyRaekkefolge.splice(tilIndeks, 0, flyttet)
    void omorganiserPiktogrammer(kategoriId, nyRaekkefolge)
  }

  return (
    <div className={styles.side}>
      <header className={styles.header} style={{ background: kategori.farve }}>
        <button type="button" className={knap.sekundaer} onClick={() => navigerTil({ kind: 'hjem' })}>
          ← Tilbage
        </button>
        <h1 className={styles.titel}>{kategori.navn}</h1>
        {!leylaMode && (
          <div className={styles.headerKnapper}>
            <button
              type="button"
              className={knap.sekundaer}
              onClick={() => navigerTil({ kind: 'bulkImport', forudvalgtKategoriId: kategoriId })}
            >
              Tilføj billeder
            </button>
            <button type="button" className={knap.sekundaer} onClick={() => setRedigerer((v) => !v)}>
              {redigerer ? 'Færdig' : 'Rediger'}
            </button>
          </div>
        )}
      </header>

      <div className={styles.body}>
        {piktogrammer.length === 0 ? (
          <p className={styles.tom}>Ingen piktogrammer i denne kategori endnu.</p>
        ) : (
          // En kategori kan indeholde mange piktogrammer, så i modsætning til
          // HomeScreen/SnippenEditor er der her reelt brug for at kunne
          // scrolle, mens man trækker. Men dnd-kits standard-afstand (20% af
          // skærmen fra kanten) udløste det alt for let på en telefon - sat
          // langt tættere på selve kanten i stedet.
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={haandterDragEnd}
            autoScroll={{ threshold: { x: 0.2, y: 0.08 } }}
          >
            <SortableContext items={piktogrammer.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className={styles.grid}>
                {piktogrammer.map((p, index) => (
                  <SorterbartKort
                    key={p.id}
                    piktogram={p}
                    redigerer={redigerer}
                    onTryk={(e) => haandterKortTryk(p, index, e)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {redigeresPiktogram && (
        <EditPictogramSheet piktogram={redigeresPiktogram} onLuk={() => setRedigeresPiktogram(null)} />
      )}
    </div>
  )
}

function SorterbartKort({
  piktogram,
  redigerer,
  onTryk,
}: {
  piktogram: Piktogram
  redigerer: boolean
  onTryk: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: piktogram.id,
    disabled: !redigerer,
  })

  return (
    <PictogramCard
      ref={setNodeRef}
      piktogram={piktogram}
      onClick={onTryk}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={redigerer ? styles.redigerbar : undefined}
      {...(redigerer ? { ...attributes, ...listeners } : {})}
    />
  )
}
