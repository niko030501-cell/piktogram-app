// Registrerer service workeren, der gør appen i stand til at starte helt
// uden internet. Opdateringer hentes IKKE ind stille i baggrunden (det
// kunne skifte indhold under hænderne på personalet midt i en visning) -
// i stedet sættes et flag, som UpdateBanner.tsx viser en rolig besked om.

import { registerSW } from 'virtual:pwa-register'

type Lytter = () => void

let opdateringKlar = false
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
const lyttere = new Set<Lytter>()

function underretAlle() {
  lyttere.forEach((lytter) => lytter())
}

export function initServiceWorker(): void {
  if (updateSW) return // allerede sat op

  updateSW = registerSW({
    onNeedRefresh() {
      opdateringKlar = true
      underretAlle()
    },
    onRegistered(registration) {
      if (!registration) return
      // iOS åbner sjældent appen i baggrunden, så et tjek hver gang den
      // igen bliver synlig er den mest pålidelige måde at opdage en ny
      // version på.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update()
        }
      })
    },
  })
}

export function abonnerPaaOpdatering(lytter: Lytter): () => void {
  lyttere.add(lytter)
  return () => lyttere.delete(lytter)
}

export function erOpdateringKlar(): boolean {
  return opdateringKlar
}

export function genindlaesMedOpdatering(): void {
  void updateSW?.(true)
}
