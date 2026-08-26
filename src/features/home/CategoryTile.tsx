// Én stor kategoriflise på forsiden, farvet med kategoriens egen farve -
// farven bruges konsekvent, så den bliver et genkendeligt "mærke" for
// kategorien, ikke bare pynt.

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import type { Kategori } from '../../db/schema'
import styles from './CategoryTile.module.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kategori: Kategori
}

export const CategoryTile = forwardRef<HTMLButtonElement, Props>(function CategoryTile(
  { kategori, className, style, ...resten },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.flise} ${className ?? ''}`}
      style={{ background: kategori.farve, ...style }}
      {...resten}
    >
      {kategori.navn}
    </button>
  )
})
