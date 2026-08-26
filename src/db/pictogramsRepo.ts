// CRUD for piktogrammer, inklusiv de særlige opslag appen har brug for:
// alle piktogrammer i én kategori, og alle favoritter (til Snippen).
//
// "Slettede" piktogrammer fjernes ikke rent faktisk (se sletPiktogram) - de
// markeres bare som slettede, så sletningen når at brede sig til alle
// enheder via sky-synkronisering (se src/sync/), i stedet for bare at
// forsvinde ét sted. Læse-funktionerne skjuler dem derfor for UI'et.

import { getDB } from './database'
import { varslOmLokalAendring } from '../sync/dirtySignal'
import type { Piktogram } from './schema'

export async function hentPiktogrammerForKategori(kategoriId: string): Promise<Piktogram[]> {
  const db = await getDB()
  const alle = await db.getAllFromIndex('piktogrammer', 'by-kategori', kategoriId)
  return alle.filter((p) => p.slettet === null).sort((a, b) => a.raekkefolge - b.raekkefolge)
}

export async function hentAllePiktogrammer(): Promise<Piktogram[]> {
  const db = await getDB()
  const alle = await db.getAll('piktogrammer')
  return alle.filter((p) => p.slettet === null)
}

export async function hentFavoritter(): Promise<Piktogram[]> {
  const db = await getDB()
  const favoritter = await db.getAllFromIndex('piktogrammer', 'by-favorit', 1)
  return favoritter
    .filter((p) => p.slettet === null && p.snippenRaekkefolge !== null)
    .sort((a, b) => (a.snippenRaekkefolge ?? 0) - (b.snippenRaekkefolge ?? 0))
}

/** Bruges af synkroniseringen til at finde rækker, der mangler at blive sendt til skyen (inkl. slettede). */
export async function hentPiktogrammerTilSynkronisering(): Promise<Piktogram[]> {
  const db = await getDB()
  return db.getAllFromIndex('piktogrammer', 'by-synket', 0)
}

/** Bruges af synkroniseringen til at sammenligne en ekstern række med den lokale udgave. */
export async function hentPiktogramMedId(id: string): Promise<Piktogram | undefined> {
  const db = await getDB()
  return db.get('piktogrammer', id)
}

interface GemValgfri {
  /** Sættes af synkroniseringen selv, når en række hentes FRA skyen - skal ikke markere den som "mangler at blive sendt op" igen. */
  fraSky?: boolean
}

export async function gemPiktogram(piktogram: Piktogram, valgfri?: GemValgfri): Promise<void> {
  const db = await getDB()
  const raekke = valgfri?.fraSky ? piktogram : { ...piktogram, opdateret: Date.now(), synket: 0 as const }
  await db.put('piktogrammer', raekke)
  if (!valgfri?.fraSky) varslOmLokalAendring()
}

export async function gemFlerePiktogrammer(piktogrammer: Piktogram[], valgfri?: GemValgfri): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('piktogrammer', 'readwrite')
  const raekker = valgfri?.fraSky
    ? piktogrammer
    : piktogrammer.map((p) => ({ ...p, opdateret: Date.now(), synket: 0 as const }))
  await Promise.all(raekker.map((p) => tx.store.put(p)))
  await tx.done
  if (!valgfri?.fraSky) varslOmLokalAendring()
}

export async function sletPiktogram(id: string): Promise<void> {
  const db = await getDB()
  const eksisterende = await db.get('piktogrammer', id)
  if (!eksisterende) return
  await db.put('piktogrammer', { ...eksisterende, slettet: Date.now(), opdateret: Date.now(), synket: 0 })
  varslOmLokalAendring()
}

export function nytPiktogramId(): string {
  return crypto.randomUUID()
}
