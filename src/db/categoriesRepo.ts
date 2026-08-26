// CRUD (opret/læs/opdater/slet) for kategorier. Al adgang går via getDB()
// fra database.ts. DataProvider.tsx kalder disse funktioner og holder en
// kopi i hukommelsen, så brugerfladen ikke skal spørge databasen konstant.

import { getDB } from './database'
import type { Kategori } from './schema'

export async function hentAlleKategorier(): Promise<Kategori[]> {
  const db = await getDB()
  const alle = await db.getAll('kategorier')
  return alle.sort((a, b) => a.raekkefolge - b.raekkefolge)
}

export async function gemKategori(kategori: Kategori): Promise<void> {
  const db = await getDB()
  await db.put('kategorier', kategori)
}

export async function gemFlereKategorier(kategorier: Kategori[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('kategorier', 'readwrite')
  await Promise.all(kategorier.map((k) => tx.store.put(k)))
  await tx.done
}

export async function sletKategori(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('kategorier', id)
}

export function nyKategoriId(): string {
  return crypto.randomUUID()
}
