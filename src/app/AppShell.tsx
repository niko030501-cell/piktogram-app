// Skifter mellem appens skærme. Der er bevidst ikke noget routing-bibliotek
// her - "view" er bare en almindelig variabel, og navigerTil() skifter den.
// Se viewState.ts for hvilke skærme der findes.

import { useState } from 'react'
import type { View } from './viewState'
import { useData } from '../state/DataProvider'
import { useSettings } from '../state/SettingsProvider'
import { HomeScreen } from '../features/home/HomeScreen'
import { CategoryScreen } from '../features/category/CategoryScreen'
import { FullscreenViewer } from '../features/viewer/FullscreenViewer'
import { ChoiceBoardSetup } from '../features/valgtavle/ChoiceBoardSetup'
import { ChoiceBoardView } from '../features/valgtavle/ChoiceBoardView'
import { ValgRegistreringerListe } from '../features/valgtavle/ValgRegistreringerListe'
import { SnippenEditor } from '../features/snippen/SnippenEditor'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { BackupScreen } from '../features/backup/BackupScreen'
import { BulkImportFlow } from '../features/import/BulkImportFlow'
import { LeylaUnlockAffordance } from '../features/leyla/LeylaUnlockAffordance'
import styles from './AppShell.module.css'

export function AppShell() {
  const [view, setView] = useState<View>({ kind: 'hjem' })
  const { piktogrammer } = useData()
  const { leylaMode } = useSettings()

  function navigerTil(nyView: View) {
    setView(nyView)
  }

  function gaaHjem() {
    setView({ kind: 'hjem' })
  }

  return (
    <div className={styles.rod}>
      {view.kind === 'hjem' && <HomeScreen navigerTil={navigerTil} />}

      {view.kind === 'kategori' && (
        <CategoryScreen kategoriId={view.kategoriId} navigerTil={navigerTil} />
      )}

      {view.kind === 'valgtavleOpsaetning' && (
        <ChoiceBoardSetup navigerTil={navigerTil} onLuk={gaaHjem} />
      )}

      {view.kind === 'valgtavleVisning' && (
        <ChoiceBoardView
          piktogramIds={view.piktogramIds}
          fastValgNavn={view.fastValgNavn}
          sporgsmaal={view.sporgsmaal}
          onLuk={() => navigerTil({ kind: 'valgtavleOpsaetning' })}
        />
      )}

      {view.kind === 'valgRegistreringer' && !leylaMode && (
        <ValgRegistreringerListe onLuk={() => navigerTil({ kind: 'valgtavleOpsaetning' })} />
      )}

      {view.kind === 'snippenRediger' && <SnippenEditor onLuk={gaaHjem} />}

      {view.kind === 'indstillinger' && !leylaMode && (
        <SettingsScreen navigerTil={navigerTil} onLuk={gaaHjem} />
      )}

      {view.kind === 'sikkerhedskopi' && !leylaMode && (
        <BackupScreen onLuk={() => navigerTil({ kind: 'indstillinger' })} />
      )}

      {view.kind === 'bulkImport' && !leylaMode && (
        <BulkImportFlow forudvalgtKategoriId={view.forudvalgtKategoriId} onLuk={gaaHjem} />
      )}

      {view.kind === 'fuldskaerm' && (
        <FullscreenViewer
          piktogrammer={view.piktogramIds
            .map((id) => piktogrammer.find((p) => p.id === id))
            .filter((p): p is NonNullable<typeof p> => !!p)}
          startIndeks={view.indeks}
          oprindelsesRect={view.oprindelsesRect}
          onLuk={() => setView(view.tilbageTil)}
        />
      )}

      {leylaMode && <LeylaUnlockAffordance />}
    </div>
  )
}
