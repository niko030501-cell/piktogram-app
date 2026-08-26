// Forsiden: Snippen øverst, så kategorierne som store farvede fliser. Ingen
// velkomstskærm, ingen unødvendige trin - personalet skal kunne åbne appen
// og finde "toilet" på under fem sekunder.

import { useState } from 'react'
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
import { CategoryTile } from './CategoryTile'
import categoryTileStyles from './CategoryTile.module.css'
import { SnippenBar } from './SnippenBar'
import { EditCategorySheet } from '../edit/EditCategorySheet'
import type { NavigerTil } from '../../app/viewState'
import type { Kategori } from '../../db/schema'
import knap from '../../styles/buttons.module.css'
import styles from './HomeScreen.module.css'

interface Props {
  navigerTil: NavigerTil
}

export function HomeScreen({ navigerTil }: Props) {
  const { kategorier, omorganiserKategorier } = useData()
  const { leylaMode } = useSettings()
  const [redigererKategorier, setRedigererKategorier] = useState(false)
  const [redigeresKategori, setRedigeresKategori] = useState<Kategori | 'ny' | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function haandterDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fraIndeks = kategorier.findIndex((k) => k.id === active.id)
    const tilIndeks = kategorier.findIndex((k) => k.id === over.id)
    if (fraIndeks === -1 || tilIndeks === -1) return
    const nyRaekkefolge = [...kategorier]
    const [flyttet] = nyRaekkefolge.splice(fraIndeks, 1)
    nyRaekkefolge.splice(tilIndeks, 0, flyttet)
    void omorganiserKategorier(nyRaekkefolge)
  }

  return (
    <div className={styles.side}>
      <header className={styles.header}>
        <h1 className={styles.appNavn}>Piktogram app</h1>
        <div className={styles.headerKnapper}>
          <button
            type="button"
            className={knap.sekundaer}
            onClick={() => navigerTil({ kind: 'valgtavleOpsaetning' })}
          >
            Valgtavle
          </button>
          {!leylaMode && (
            <button
              type="button"
              className={knap.sekundaer}
              onClick={() => navigerTil({ kind: 'indstillinger' })}
            >
              ⚙ Indstillinger
            </button>
          )}
        </div>
      </header>

      <div className={styles.body}>
        <SnippenBar navigerTil={navigerTil} />

        <div className={styles.kategoriHeader}>
          <h2 className={styles.overskrift}>Kategorier</h2>
          {!leylaMode && (
            <button
              type="button"
              className={knap.sekundaer}
              onClick={() => setRedigererKategorier((v) => !v)}
            >
              {redigererKategorier ? 'Færdig' : 'Rediger'}
            </button>
          )}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={haandterDragEnd}>
          <SortableContext items={kategorier.map((k) => k.id)} strategy={rectSortingStrategy}>
            <div className={styles.grid}>
              {kategorier.map((k) => (
                <SorterbarKategoriFlise
                  key={k.id}
                  kategori={k}
                  redigerer={redigererKategorier}
                  onTryk={() => {
                    if (redigererKategorier) setRedigeresKategori(k)
                    else navigerTil({ kind: 'kategori', kategoriId: k.id })
                  }}
                />
              ))}
              {redigererKategorier && (
                <button
                  type="button"
                  className={styles.nyKategori}
                  onClick={() => setRedigeresKategori('ny')}
                >
                  + Ny kategori
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>

        {!leylaMode && (
          <button
            type="button"
            className={styles.tilfoejBilleder}
            onClick={() => navigerTil({ kind: 'bulkImport' })}
          >
            + Tilføj billeder
          </button>
        )}
      </div>

      {redigeresKategori && (
        <EditCategorySheet
          kategori={redigeresKategori === 'ny' ? undefined : redigeresKategori}
          onLuk={() => setRedigeresKategori(null)}
        />
      )}
    </div>
  )
}

function SorterbarKategoriFlise({
  kategori,
  redigerer,
  onTryk,
}: {
  kategori: Kategori
  redigerer: boolean
  onTryk: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: kategori.id,
    disabled: !redigerer,
  })
  return (
    <CategoryTile
      ref={setNodeRef}
      kategori={kategori}
      onClick={onTryk}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={redigerer ? categoryTileStyles.redigerbar : undefined}
      {...(redigerer ? { ...attributes, ...listeners } : {})}
    />
  )
}
