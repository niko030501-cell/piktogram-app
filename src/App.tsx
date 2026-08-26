// Sætter de to "udbydere" op, der holder appens data (DataProvider) og
// indstillinger (SettingsProvider) i hukommelsen, og venter roligt med at
// vise noget, til begge er læst fra IndexedDB. Selve skærmene ligger i
// app/AppShell.tsx.

import { useEffect } from 'react'
import { DataProvider, useData } from './state/DataProvider'
import { SettingsProvider, useSettings } from './state/SettingsProvider'
import { AppShell } from './app/AppShell'
import { forbeedTalestemmer } from './speech/speech'
import { initServiceWorker } from './pwa/registerSW'
import { UpdateBanner } from './pwa/UpdateBanner'

function AppIndhold() {
  const { klarTilBrug: dataKlar } = useData()
  const { klarTilBrug: settingsKlar } = useSettings()

  useEffect(() => {
    forbeedTalestemmer()
    initServiceWorker()
  }, [])

  if (!dataKlar || !settingsKlar) {
    // Bevidst tomt: varer typisk under et øjeblik, og appen skal ikke have
    // en velkomst- eller indlæsningsskærm.
    return <div style={{ height: '100%', background: 'var(--color-bg)' }} />
  }

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
        <AppIndhold />
      </SettingsProvider>
    </DataProvider>
  )
}
