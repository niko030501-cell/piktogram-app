// Sætter appens "udbydere" op: data og indstillinger (fra IndexedDB), samt
// login til sky-synkronisering. Venter roligt med at vise noget, til data
// er læst lokalt - og viser login-skærmen i stedet for appen, hvis denne
// enhed ikke er logget ind endnu (kun relevant, når sky-forbindelse er sat
// op - se sync/supabaseClient.ts). Selve skærmene ligger i app/AppShell.tsx.

import { useEffect } from 'react'
import { DataProvider, useData } from './state/DataProvider'
import { SettingsProvider, useSettings } from './state/SettingsProvider'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { LoginScreen } from './features/auth/LoginScreen'
import { AppShell } from './app/AppShell'
import { forbeedTalestemmer } from './speech/speech'
import { initServiceWorker } from './pwa/registerSW'
import { UpdateBanner } from './pwa/UpdateBanner'

function TomSkaerm() {
  // Bevidst tomt: varer typisk under et øjeblik, og appen skal ikke have
  // en velkomst- eller indlæsningsskærm.
  return <div style={{ height: '100%', background: 'var(--color-bg)' }} />
}

function AppIndhold() {
  const { klarTilBrug: dataKlar } = useData()
  const { klarTilBrug: settingsKlar } = useSettings()
  const { klarTilBrug: authKlar, loggetInd } = useAuth()

  useEffect(() => {
    forbeedTalestemmer()
    initServiceWorker()
  }, [])

  if (!dataKlar || !settingsKlar || !authKlar) return <TomSkaerm />
  if (!loggetInd) return <LoginScreen />

  return (
    <>
      <AppShell />
      <UpdateBanner />
    </>
  )
}

export default function App() {
  return (
    <DataProvider>
      <SettingsProvider>
        <AuthProvider>
          <AppIndhold />
        </AuthProvider>
      </SettingsProvider>
    </DataProvider>
  )
}
