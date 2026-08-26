import { useEffect, useState } from 'react'
import { abonnerPaaOpdatering, erOpdateringKlar } from './registerSW'

export function useServiceWorkerUpdate(): boolean {
  const [klar, setKlar] = useState(erOpdateringKlar())
  useEffect(() => abonnerPaaOpdatering(() => setKlar(true)), [])
  return klar
}
