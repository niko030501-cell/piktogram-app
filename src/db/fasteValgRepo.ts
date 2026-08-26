// CRUD for faste valg (gemte valgtavle-opsætninger som "Gå eller cykle").
//
// "Slettede" faste valg fjernes ikke rent faktisk (se sletFastValg) - de
// markeres bare som slettede, så sletningen når at brede sig til alle
// enheder via sky-synkronisering (se src/sync/), i stedet for bare at
// forsvinde ét sted. hentAlleFasteValg() skjuler dem derfor for UI'et.

import { getDB } from './database'
import { varslOmLokalAendring } from '../sync/dirtySignal'
import type { FastValg } from './schema'

export async function hentAlleFasteValg(): Promise<FastValg[]> {
  const db = await getDB()
  const alle = await db.getAll('fasteValg')
  return alle.filter((f) => f.slettet === null).sort((a, b) => a.raekkefolge - b.raekkefolge)
}

/** Bruges af synkroniseringen til at finde rækker, der mangler at blive sendt til skyen (inkl. slettede). */
export async function hentFasteValgTilSynkronisering(): Promise<FastValg[]> {
  const db = await getDB()
  return db.getAllFromIndex('fasteValg', 'by-synket', 0)
}

interface GemValgfri {
  /** Sættes af synkroniseringen selv, når en række hentes FRA skyen - skal ikke markere den som "mangler at blive sendt op" igen. */
  fraSky?: boolean
}

export async function gemFastValg(fastValg: FastValg, valgfri?: GemValgfri): Promise<void> {
  const db = await getDB()
  const raekke = valgfri?.fraSky ? fastValg : { ...fastValg, opdateret: Date.now(), synket: 0 as const }
  await db.put('fasteValg', raekke)
  if (!valgfri?.fraSky) varslOmLokalAendring()
}

export async function gemFlereFasteValg(fasteValg: FastValg[], valgfri?: GemValgfri): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('fasteValg', 'readwrite')
  const raekker = valgfri?.fraSky
    ? fasteValg
    : fasteValg.map((f) => ({ ...f, opdateret: Date.now(), synket: 0 as const }))
  await Promise.all(raekker.map((f) => tx.store.put(f)))
  await tx.done
  if (!valgfri?.fraSky) varslOmLokalAendring()
}

export async function sletFastValg(id: string): Promise<void> {
  const db = await getDB()
  const eksisterende = await db.get('fasteValg', id)
  if (!eksisterende) return
  await db.put('fasteValg', { ...eksisterende, slettet: Date.now(), opdateret: Date.now(), synket: 0 })
  varslOmLokalAendring()
}

export function nytFastValgId(): string {
  return crypto.randomUUID()
}
