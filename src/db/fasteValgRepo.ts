// CRUD for faste valg (gemte valgtavle-opsætninger som "Gå eller cykle").

import { getDB } from './database'
import type { FastValg } from './schema'

export async function hentAlleFasteValg(): Promise<FastValg[]> {
  const db = await getDB()
  const alle = await db.getAll('fasteValg')
  return alle.sort((a, b) => a.raekkefolge - b.raekkefolge)
}

export async function gemFastValg(fastValg: FastValg): Promise<void> {
  const db = await getDB()
  await db.put('fasteValg', fastValg)
}

export async function gemFlereFasteValg(fasteValg: FastValg[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('fasteValg', 'readwrite')
  await Promise.all(fasteValg.map((f) => tx.store.put(f)))
  await tx.done
}

export async function sletFastValg(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('fasteValg', id)
}

export function nytFastValgId(): string {
  return crypto.randomUUID()
}
