// Fælles ramme om appens dialoger (rediger, slet-bekræftelse, PIN-kode
// osv.): en dæmpet baggrund med en rolig, centreret boks. Tryk uden for
// boksen lukker den, hvis onLuk er angivet.

import type { ReactNode } from 'react'
import styles from './Modal.module.css'

interface Props {
  titel: string
  children: ReactNode
  onLuk?: () => void
}

export function Modal({ titel, children, onLuk }: Props) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={titel}
      onClick={(e) => {
        if (e.target === e.currentTarget) onLuk?.()
      }}
    >
      <div className={styles.boks}>
        <h2 className={styles.titel}>{titel}</h2>
        {children}
      </div>
    </div>
  )
}
