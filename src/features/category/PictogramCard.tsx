// Ét piktogram-kort: billede + ordet under. Genbruges i kategori-gitteret,
// i Snippen og i valgtavle-opsætningen. Selve klik-handlingen (vis stort,
// vælg til valgtavle, o.l.) bestemmes af den, der bruger kortet - se
// "resten"-props, som videresendes direkte til <button>.

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import type { Piktogram } from '../../db/schema'
import { useData } from '../../state/DataProvider'
import { useObjectUrl } from '../../state/useObjectUrl'
import styles from './PictogramCard.module.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  piktogram: Piktogram
  valgt?: boolean
  visValgMarkering?: boolean
}

export const PictogramCard = forwardRef<HTMLButtonElement, Props>(function PictogramCard(
  { piktogram, valgt, visValgMarkering, className, ...resten },
  ref,
) {
  const { markerPiktogramBilledeOdelagt } = useData()
  const billedeUrl = useObjectUrl(piktogram.billede)

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.kort} ${valgt ? styles.valgt : ''} ${className ?? ''}`}
      {...resten}
    >
      <span className={styles.billedRamme}>
        {billedeUrl ? (
          <img
            src={billedeUrl}
            alt=""
            className={styles.billede}
            draggable={false}
            onError={() => void markerPiktogramBilledeOdelagt(piktogram.id)}
          />
        ) : (
          <span className={styles.mangler}>Mangler billede</span>
        )}
      </span>
      <span className={styles.navn}>{piktogram.navn}</span>
      {visValgMarkering && (
        <span className={styles.valgMarkering} aria-hidden="true">
          {valgt ? '✓' : ''}
        </span>
      )}
    </button>
  )
})
