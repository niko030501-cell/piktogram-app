// Rolig banner nederst på skærmen, der kun vises når en ny version af
// appen er klar til at blive taget i brug (se registerSW.ts).

import { useServiceWorkerUpdate } from './useServiceWorkerUpdate'
import { genindlaesMedOpdatering } from './registerSW'
import styles from './UpdateBanner.module.css'

export function UpdateBanner() {
  const klar = useServiceWorkerUpdate()
  if (!klar) return null

  return (
    <div className={styles.banner} role="status">
      <span>Ny version af appen er klar.</span>
      <button type="button" className={styles.knap} onClick={genindlaesMedOpdatering}>
        Genindlæs
      </button>
    </div>
  )
}
