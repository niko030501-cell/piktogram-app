// Sår databasen med standardindhold ved allerførste opstart: de 6
// standardkategorier og de 8 billedløse pladser i Basis. Kører kun hvis
// kategori-lageret er helt tomt, så det aldrig overskriver rigtigt indhold.

import { getDB } from './database'
import { BASIS_PLADSER, START_KATEGORIER } from './schema'
import type { Kategori, Piktogram } from './schema'

export async function saaFoersteGangHvisTomt(): Promise<void> {
  const db = await getDB()

  // Tjek og skriv sker bevidst i ÉN transaktion: hvis to dele af appen
  // (fx Reacts StrictMode i udviklingstilstand) kalder denne funktion
  // samtidig, sikrer IndexedDB at den anden transaktion først må læse
  // "eksisterende"-tallet, når den første er helt færdig - så kan der
  // aldrig blive sået dobbelt op.
  const tx = db.transaction(['kategorier', 'piktogrammer'], 'readwrite')
  const eksisterende = await tx.objectStore('kategorier').count()
  if (eksisterende > 0) {
    await tx.done
    return
  }

  const kategorier: Kategori[] = START_KATEGORIER.map((k) => ({
    id: crypto.randomUUID(),
    ...k,
  }))

  const basis = kategorier.find((k) => k.navn === 'Basis')!

  const piktogrammer: Piktogram[] = BASIS_PLADSER.map((navn, index) => ({
    id: crypto.randomUUID(),
    navn,
    kategoriId: basis.id,
    billede: null,
    raekkefolge: index,
    favorit: 0,
    snippenRaekkefolge: null,
    oprettet: Date.now(),
  }))

  await Promise.all([
    ...kategorier.map((k) => tx.objectStore('kategorier').put(k)),
    ...piktogrammer.map((p) => tx.objectStore('piktogrammer').put(p)),
  ])
  await tx.done
}
