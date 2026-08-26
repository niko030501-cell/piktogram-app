// Står for AT synkronisere - selve arbejdet ligger i push.ts og pull.ts.
// Denne fil bestemmer bare HVORNÅR det skal ske:
//   - ved opstart
//   - når enheden får forbindelse igen
//   - når appen bliver synlig igen (samme idé som opdaterings-tjekket i
//     pwa/registerSW.ts - iOS kører sjældent noget i baggrunden)
//   - kort efter en lokal ændring (se dirtySignal.ts), samlet op så en
//     bunke ændringer i træk ikke giver en synkronisering per ændring
//   - løbende via Supabase Realtime, når andre enheder ændrer noget
//
// Uden sky-forbindelse (se supabaseClient.ts) foretager denne fil sig
// ingenting - appen virker så bare rent lokalt.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { harSkyForbindelse, supabase } from './supabaseClient'
import { lytEfterLokaleAendringer } from './dirtySignal'
import { skubTilSky } from './push'
import { traekFraSky } from './pull'
import { useAuth } from '../features/auth/AuthProvider'
import { useData } from '../state/DataProvider'

type SyncStatus = 'inaktiv' | 'synkroniserer' | 'fejl'

interface SyncContextVaerdi {
  harSkyForbindelse: boolean
  status: SyncStatus
  sidstSynkroniseret: number | null
  /**
   * Sandt når enheden enten ikke bruger sky-synkronisering, eller har
   * afsluttet sit allerførste forsøg på at hente ned fra skyen. Bruges af
   * App.tsx til at vente med at vise noget, på en helt ny enhed - ellers
   * ville de 6 standardkategorier nå at blive sået lokalt, inden de rigtige
   * kategorier er hentet ned, så det hele ser duplikeret ud.
   */
  foersteSynkroniseringKlar: boolean
}

const SyncContext = createContext<SyncContextVaerdi | null>(null)

const SYNK_TABELLER = [
  'piktogram_kategorier',
  'piktogram_piktogrammer',
  'piktogram_faste_valg',
  'piktogram_valg_registreringer',
] as const

const SKUB_FORSINKELSE_MS = 800

export function SyncProvider({ children }: { children: ReactNode }) {
  const { loggetInd } = useAuth()
  const { genindlaesFraDatabase } = useData()
  const [status, setStatus] = useState<SyncStatus>('inaktiv')
  const [sidstSynkroniseret, setSidstSynkroniseret] = useState<number | null>(null)
  // Uden sky-forbindelse er der intet at vente på - så er "første synkronisering" allerede overstået.
  const [foersteSynkroniseringKlar, setFoersteSynkroniseringKlar] = useState(!harSkyForbindelse)
  const forsinkelseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const koerFuldSynkronisering = useCallback(async () => {
    if (!harSkyForbindelse || !loggetInd) return
    setStatus('synkroniserer')
    try {
      await skubTilSky()
      await traekFraSky()
      await genindlaesFraDatabase()
      setSidstSynkroniseret(Date.now())
      setStatus('inaktiv')
    } catch {
      // Forbliver med synket: 0 lokalt - prøves automatisk igen ved næste lejlighed.
      setStatus('fejl')
    } finally {
      // Sættes uanset udfald - ellers ville en enhed uden forbindelse ved
      // allerførste login aldrig komme videre.
      setFoersteSynkroniseringKlar(true)
    }
  }, [loggetInd, genindlaesFraDatabase])

  // Opstart, forbindelse igen, og appen bliver synlig igen.
  useEffect(() => {
    if (!harSkyForbindelse || !loggetInd) return
    void koerFuldSynkronisering()

    function paaOnline() {
      void koerFuldSynkronisering()
    }
    function paaSynlighedsSkift() {
      if (document.visibilityState === 'visible') void koerFuldSynkronisering()
    }
    window.addEventListener('online', paaOnline)
    document.addEventListener('visibilitychange', paaSynlighedsSkift)
    return () => {
      window.removeEventListener('online', paaOnline)
      document.removeEventListener('visibilitychange', paaSynlighedsSkift)
    }
  }, [loggetInd, koerFuldSynkronisering])

  // Lokal ændring -> skub op kort efter, samlet op hvis flere sker i træk.
  useEffect(() => {
    if (!harSkyForbindelse || !loggetInd) return
    return lytEfterLokaleAendringer(() => {
      if (forsinkelseRef.current) clearTimeout(forsinkelseRef.current)
      forsinkelseRef.current = setTimeout(() => void koerFuldSynkronisering(), SKUB_FORSINKELSE_MS)
    })
  }, [loggetInd, koerFuldSynkronisering])

  // Realtime: andre enheders ændringer dukker op uden at skulle vente på næste tjek.
  useEffect(() => {
    const klient = supabase
    if (!harSkyForbindelse || !loggetInd || !klient) return
    let kanalOpsaetning = klient.channel('piktogram-aendringer')
    for (const tabel of SYNK_TABELLER) {
      kanalOpsaetning = kanalOpsaetning.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabel },
        () => void koerFuldSynkronisering(),
      )
    }
    const kanal = kanalOpsaetning.subscribe()
    return () => {
      void klient.removeChannel(kanal)
    }
  }, [loggetInd, koerFuldSynkronisering])

  const vaerdi: SyncContextVaerdi = {
    harSkyForbindelse,
    status,
    sidstSynkroniseret,
    foersteSynkroniseringKlar,
  }

  return <SyncContext.Provider value={vaerdi}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextVaerdi {
  const vaerdi = useContext(SyncContext)
  if (!vaerdi) throw new Error('useSync skal bruges inden i en <SyncProvider>')
  return vaerdi
}
