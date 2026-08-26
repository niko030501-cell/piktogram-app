// CRUD (opret/læs/opdater/slet) for kategorier. Al adgang går via getDB()
// fra database.ts. DataProvider.tsx kalder disse funktioner og holder en
// kopi i hukommelsen, så brugerfladen ikke skal spørge databasen konstant.
//
// "Slettede" kategorier fjernes ikke rent faktisk (se sletKategori) - de
// markeres bare som slettede, så sletningen når at brede sig til alle
// enheder via sky-synkronisering (se src/sync/), i stedet for bare at
// forsvinde ét sted. hentAlleKategorier() skjuler dem derfor for UI'et.

import { getDB } from './database'
import { varslOmLokalAendring } from '../sync/dirtySignal'
import type { Kategori } from './schema'

export async function hentAlleKategorier(): Promise<Kategori[]> {
  const db = await getDB()
  const alle = await db.getAll('kategorier')
  return alle.filter((k) => k.slettet === null).sort((a, b) => a.raekkefolge - b.raekkefolge)
}

/** Bruges af synkroniseringen til at finde rækker, der mangler at blive sendt til skyen (inkl. slettede). */
export async function hentKategorierTilSynkronisering(): Promise<Kategori[]> {
  const db = await getDB()
  return db.getAllFromIndex('kategorier', 'by-synket', 0)
}

interface GemValgfri {
  /** Sættes af synkroniseringen selv, når en række hentes FRA skyen - skal ikke markere den som "mangler at blive sendt op" igen. */
  fraSky?: boolean
}

export async function gemKategori(kategori: Kategori, valgfri?: GemValgfri): Promise<void> {
  const db = await getDB()
  const raekke = valgfri?.fraSky ? kategori : { ...kategori, opdateret: Date.now(), synket: 0 as const }
  await db.put('kategorier', raekke)
  if (!valgfri?.fraSky) varslOmLokalAendring()
}

export async function gemFlereKategorier(kategorier: Kategori[], valgfri?: GemValgfri): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('kategorier', 'readwrite')
  const raekker = valgfri?.fraSky
    ? kategorier
    : kategorier.map((k) => ({ ...k, opdateret: Date.now(), synket: 0 as const }))
  await Promise.all(raekker.map((k) => tx.store.put(k)))
  await tx.done
  if (!valgfri?.fraSky) varslOmLokalAendring()
}

export async function sletKategori(id: string): Promise<void> {
  const db = await getDB()
  const eksisterende = await db.get('kategorier', id)
  if (!eksisterende) return
  await db.put('kategorier', { ...eksisterende, slettet: Date.now(), opdateret: Date.now(), synket: 0 })
  varslOmLokalAendring()
}

export function nyKategoriId(): string {
  return crypto.randomUUID()
}
