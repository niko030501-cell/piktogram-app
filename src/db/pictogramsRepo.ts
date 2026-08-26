// CRUD for piktogrammer, inklusiv de særlige opslag appen har brug for:
// alle piktogrammer i én kategori, og alle favoritter (til Snippen).

import { getDB } from './database'
import type { Piktogram } from './schema'

export async function hentPiktogrammerForKategori(kategoriId: string): Promise<Piktogram[]> {
  const db = await getDB()
  const alle = await db.getAllFromIndex('piktogrammer', 'by-kategori', kategoriId)
  return alle.sort((a, b) => a.raekkefolge - b.raekkefolge)
}

export async function hentAllePiktogrammer(): Promise<Piktogram[]> {
  const db = await getDB()
  return db.getAll('piktogrammer')
}

export async function hentFavoritter(): Promise<Piktogram[]> {
  const db = await getDB()
  const favoritter = await db.getAllFromIndex('piktogrammer', 'by-favorit', 1)
  return favoritter
    .filter((p) => p.snippenRaekkefolge !== null)
    .sort((a, b) => (a.snippenRaekkefolge ?? 0) - (b.snippenRaekkefolge ?? 0))
}

export async function gemPiktogram(piktogram: Piktogram): Promise<void> {
  const db = await getDB()
  await db.put('piktogrammer', piktogram)
}

export async function gemFlerePiktogrammer(piktogrammer: Piktogram[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('piktogrammer', 'readwrite')
  await Promise.all(piktogrammer.map((p) => tx.store.put(p)))
  await tx.done
}

export async function sletPiktogram(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('piktogrammer', id)
}

export function nytPiktogramId(): string {
  return crypto.randomUUID()
}
