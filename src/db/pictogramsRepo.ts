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

/**
 * Retter kun de angivne felter på et piktogram - ovenpå den nyeste udgave,
 * der findes i databasen lige nu, ikke ovenpå et øjebliksbillede kalderen
 * sidder med. Bruges i stedet for gemPiktogram/gemFlerePiktogrammer alle de
 * steder, hvor vi ellers ville skrive et helt objekt tilbage, der kan være
 * blevet forældet af fx et billede, der lige er hentet ned i baggrunden -
 * se toggleFavorit/omorganiserSnippen i DataProvider.tsx.
 */
export async function opdaterFlerePiktogramFelter(
  rettelser: { id: string; felter: Partial<Piktogram> }[],
): Promise<Piktogram[]> {
  const db = await getDB()
  const tx = db.transaction('piktogrammer', 'readwrite')
  const opdaterede: Piktogram[] = []
  for (const { id, felter } of rettelser) {
    const nuvaerende = await tx.store.get(id)
    if (!nuvaerende) continue
    const ny: Piktogram = { ...nuvaerende, ...felter, opdateret: Date.now(), synket: 0 }
    opdaterede.push(ny)
    await tx.store.put(ny)
  }
  await tx.done
  varslOmLokalAendring()
  return opdaterede
}

/**
 * Retter kun de angivne felter på ét piktogram - men KUN hvis ingen anden
 * (fx synkroniseringen selv, eller en anden fane) har ændret rækken siden
 * `forventetOpdateret`. Ellers droppes rettelsen stille - den ændring, der
 * skete i mellemtiden, er nyere og skal ikke overskrives. Bruges af
 * src/sync/push.ts og pull.ts, hvor der går tid (netværkskald) mellem at
 * læse en række og skrive resultatet tilbage.
 */
export async function patchPiktogramHvisUaendret(
  id: string,
  forventetOpdateret: number,
  felter: Partial<Piktogram>,
): Promise<void> {
  const db = await getDB()
  const nuvaerende = await db.get('piktogrammer', id)
  if (!nuvaerende || nuvaerende.opdateret !== forventetOpdateret) return
  await db.put('piktogrammer', { ...nuvaerende, ...felter })
}

export async function sletPiktogram(id: string): Promise<void> {
  const db = await getDB()
  const eksisterende = await db.get('piktogrammer', id)
  if (!eksisterende) return
  await db.put('piktogrammer', { ...eksisterende, slettet: Date.now(), opdateret: Date.now(), synket: 0 })
  varslOmLokalAendring()
}

/**
 * Rydder et lokalt billede, som browseren ikke kunne vise (fx en afbrudt
 * download, der efterlod nogle få ødelagte bytes) - uden at markere rækken
 * som "skal sendes til skyen", for det er jo ikke en rigtig ændring. Næste
 * synkronisering opdager selv at billedet mangler og henter det igen, se
 * src/sync/pull.ts.
 */
export async function ryddOdelagtBilledeLokalt(id: string): Promise<void> {
  const db = await getDB()
  const nuvaerende = await db.get('piktogrammer', id)
  if (!nuvaerende || !nuvaerende.billede) return
  await db.put('piktogrammer', { ...nuvaerende, billede: null })
}

export function nytPiktogramId(): string {
  return crypto.randomUUID()
}
