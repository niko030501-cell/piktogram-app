// Holder appens indstillinger: om tale er slået til, om Leyla-tilstand er
// aktiv, og koden der låser den op igen. Læses fra IndexedDB ved opstart,
// så appen husker tilstanden mellem hver gang den åbnes.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as settingsRepo from '../db/settingsRepo'

interface SettingsContextVaerdi {
  klarTilBrug: boolean
  speechEnabled: boolean
  leylaMode: boolean
  leylaCode: string
  saetSpeechEnabled: (v: boolean) => Promise<void>
  aktiverLeylaTilstand: (kode: string) => Promise<void>
  deaktiverLeylaTilstand: () => Promise<void>
  genindlaesFraDatabase: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextVaerdi | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [klarTilBrug, setKlarTilBrug] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [leylaMode, setLeylaMode] = useState(false)
  const [leylaCode, setLeylaCode] = useState('')

  const indlaesAlt = useCallback(async () => {
    const [tale, leylaTil, kode] = await Promise.all([
      settingsRepo.hentIndstilling('speechEnabled', true),
      settingsRepo.hentIndstilling('leylaMode', false),
      settingsRepo.hentIndstilling('leylaCode', ''),
    ])
    setSpeechEnabled(tale)
    setLeylaMode(leylaTil)
    setLeylaCode(kode)
  }, [])

  useEffect(() => {
    void (async () => {
      await indlaesAlt()
      setKlarTilBrug(true)
    })()
  }, [indlaesAlt])

  const saetSpeechEnabled = useCallback(async (v: boolean) => {
    await settingsRepo.gemIndstilling('speechEnabled', v)
    setSpeechEnabled(v)
  }, [])

  const aktiverLeylaTilstand = useCallback(async (kode: string) => {
    await settingsRepo.gemIndstilling('leylaCode', kode)
    await settingsRepo.gemIndstilling('leylaMode', true)
    setLeylaCode(kode)
    setLeylaMode(true)
  }, [])

  const deaktiverLeylaTilstand = useCallback(async () => {
    await settingsRepo.gemIndstilling('leylaMode', false)
    setLeylaMode(false)
  }, [])

  const vaerdi: SettingsContextVaerdi = {
    klarTilBrug,
    speechEnabled,
    leylaMode,
    leylaCode,
    saetSpeechEnabled,
    aktiverLeylaTilstand,
    deaktiverLeylaTilstand,
    genindlaesFraDatabase: indlaesAlt,
  }

  return <SettingsContext.Provider value={vaerdi}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextVaerdi {
  const vaerdi = useContext(SettingsContext)
  if (!vaerdi) throw new Error('useSettings skal bruges inden i en <SettingsProvider>')
  return vaerdi
}
