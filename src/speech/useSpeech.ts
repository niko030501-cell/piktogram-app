// Kobler talesyntese sammen med indstillingen "tale til/fra", så resten af
// appen bare kan kalde sig(ordet) uden selv at tjekke indstillingen.

import { useSettings } from '../state/SettingsProvider'
import { sigOrd } from './speech'

export function useSpeech(): (ord: string) => void {
  const { speechEnabled } = useSettings()
  return (ord: string) => sigOrd(ord, speechEnabled)
}
