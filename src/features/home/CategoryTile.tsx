// Én stor kategoriflise på forsiden, farvet med kategoriens egen farve -
// farven bruges konsekvent, så den bliver et genkendeligt "mærke" for
// kategorien, ikke bare pynt. Har kategorien fået et billede, vises det
// fyldende hele flisen med navnet i en label nederst - det er det, der gør
// det muligt for hende selv at finde rundt uden at kunne læse.

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import type { Kategori } from '../../db/schema'
import { useData } from '../../state/DataProvider'
import { useObjectUrl } from '../../state/useObjectUrl'
import styles from './CategoryTile.module.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kategori: Kategori
}

export const CategoryTile = forwardRef<HTMLButtonElement, Props>(function CategoryTile(
  { kategori, className, style, ...resten },
  ref,
) {
  const { markerKategoriBilledeOdelagt } = useData()
  const billedeUrl = useObjectUrl(kategori.billede)

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.flise} ${billedeUrl ? styles.medBillede : ''} ${className ?? ''}`}
      style={{ background: kategori.farve, ...style }}
      {...resten}
    >
      {billedeUrl && (
        <img
          src={billedeUrl}
          alt=""
          className={styles.billede}
          draggable={false}
          onError={() => void markerKategoriBilledeOdelagt(kategori.id)}
        />
      )}
      <span className={styles.navn}>{kategori.navn}</span>
    </button>
  )
})
