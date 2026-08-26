// Vælg hvilke op til 6 piktogrammer der vises i Snippen på forsiden, og
// træk dem til den rækkefølge de skal vises i. Et tryk på et billede
// tilføjer eller fjerner det som favorit.

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
import { PictogramCard } from '../category/PictogramCard'
import { SNIPPEN_MAKS } from '../../db/schema'
import type { Piktogram } from '../../db/schema'
import knap from '../../styles/buttons.module.css'
import styles from './SnippenEditor.module.css'

interface Props {
  onLuk: () => void
}

export function SnippenEditor({ onLuk }: Props) {
  const { kategorier, piktogrammerForKategori, favoritter, toggleFavorit, omorganiserSnippen } = useData()
  const [besked, setBesked] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function haandterDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fraIndeks = favoritter.findIndex((p) => p.id === active.id)
    const tilIndeks = favoritter.findIndex((p) => p.id === over.id)
    if (fraIndeks === -1 || tilIndeks === -1) return
    const nyRaekkefolge = [...favoritter]
    const [flyttet] = nyRaekkefolge.splice(fraIndeks, 1)
    nyRaekkefolge.splice(tilIndeks, 0, flyttet)
    void omorganiserSnippen(nyRaekkefolge)
  }

  async function haandterToggle(p: Piktogram) {
    setBesked(null)
    const resultat = await toggleFavorit(p)
    if (!resultat.ok && resultat.aarsag === 'snippen-fuld') {
      setBesked(`Snippen kan højst indeholde ${SNIPPEN_MAKS} billeder. Fjern ét, før du tilføjer et nyt.`)
    }
  }

  return (
    <div className={styles.side}>
      <header className={styles.header}>
        <button type="button" className={knap.sekundaer} onClick={onLuk}>
          ← Tilbage
        </button>
        <h1 className={styles.titel}>Rediger Snippen</h1>
      </header>

      <div className={styles.body}>
        {besked && <p className={styles.besked}>{besked}</p>}

        <section>
          <h2 className={styles.overskrift}>
            I Snippen ({favoritter.length} af {SNIPPEN_MAKS})
          </h2>
          {favoritter.length === 0 ? (
            <p className={styles.tom}>Ingen favoritter endnu - tilføj fra listerne herunder.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={haandterDragEnd}>
              <SortableContext items={favoritter.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className={styles.grid}>
                  {favoritter.map((p) => (
                    <SorterbartFavoritKort key={p.id} piktogram={p} onFjern={() => haandterToggle(p)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {kategorier.map((k) => {
          const alle = piktogrammerForKategori(k.id).filter((p) => p.billede)
          if (alle.length === 0) return null
          return (
            <section key={k.id}>
              <h2 className={styles.overskrift} style={{ color: k.farve }}>
                {k.navn}
              </h2>
              <div className={styles.grid}>
                {alle.map((p) => (
                  <PictogramCard
                    key={p.id}
                    piktogram={p}
                    valgt={p.favorit === 1}
                    visValgMarkering
                    onClick={() => haandterToggle(p)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function SorterbartFavoritKort({
  piktogram,
  onFjern,
}: {
  piktogram: Piktogram
  onFjern: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: piktogram.id })
  return (
    <PictogramCard
      ref={setNodeRef}
      piktogram={piktogram}
      valgt
      visValgMarkering
      onClick={onFjern}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    />
  )
}
