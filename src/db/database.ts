// Denne fil er det ENESTE sted i appen, der taler direkte med IndexedDB.
// Alt andet (categoriesRepo.ts, pictogramsRepo.ts, settingsRepo.ts, ...)
// går igennem getDB() herfra. Det gør det nemt at finde, hvis noget med
// lagringen skal fejlfindes eller ændres.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FastValg, Indstilling, Kategori, Piktogram, ValgRegistrering } from './schema'

interface PiktogramDBSkema extends DBSchema {
  kategorier: {
    key: string
    value: Kategori
  }
  piktogrammer: {
    key: string
    value: Piktogram
    indexes: { 'by-kategori': string; 'by-favorit': number }
  }
  indstillinger: {
    key: string
    value: Indstilling
  }
  fasteValg: {
    key: string
    value: FastValg
  }
  valgRegistreringer: {
    key: string
    value: ValgRegistrering
    indexes: { 'by-tidspunkt': number }
  }
}

const DB_NAVN = 'piktogram-db'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<PiktogramDBSkema>> | null = null

export function getDB(): Promise<IDBPDatabase<PiktogramDBSkema>> {
  if (!dbPromise) {
    dbPromise = openDB<PiktogramDBSkema>(DB_NAVN, DB_VERSION, {
      // upgrade() kører kun når databasen oprettes for første gang, eller når
      // DB_VERSION hæves. Skal datamodellen ændres senere: hæv DB_VERSION og
      // tilføj et NYT "if (oldVersion < X)"-trin herunder - rør aldrig ved
      // et eksisterende trin, så gamle enheder kan opgradere sikkert.
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('kategorier', { keyPath: 'id' })

          const piktogrammer = db.createObjectStore('piktogrammer', { keyPath: 'id' })
          piktogrammer.createIndex('by-kategori', 'kategoriId')
          piktogrammer.createIndex('by-favorit', 'favorit')

          db.createObjectStore('indstillinger', { keyPath: 'key' })
        }
        if (oldVersion < 2) {
          db.createObjectStore('fasteValg', { keyPath: 'id' })

          const valgRegistreringer = db.createObjectStore('valgRegistreringer', { keyPath: 'id' })
          valgRegistreringer.createIndex('by-tidspunkt', 'tidspunkt')
        }
      },
    })

    // Bed browseren om at undgå at rydde vores data ved pladsmangel.
    // Dette er "best effort" på iOS Safari, ikke en garanti - derfor
    // opfordrer vi stadig til jævnlige sikkerhedskopier andetsteds i appen.
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {
        // Ignoreres bevidst - appen virker fint uden persist-tilladelsen.
      })
    }
  }
  return dbPromise
}

/**
 * Rydder ALT eksisterende indhold og erstatter det med det, der importeres
 * fra en sikkerhedskopi. Kører som én transaktion, så en fejl undervejs
 * ikke kan efterlade databasen halvvejs tømt.
 */
export async function erstatAltIndhold(
  kategorier: Kategori[],
  piktogrammer: Piktogram[],
  indstillinger: Indstilling[],
  fasteValg: FastValg[],
  valgRegistreringer: ValgRegistrering[],
): Promise<void> {
  const db = await getDB()
  const stores = ['kategorier', 'piktogrammer', 'indstillinger', 'fasteValg', 'valgRegistreringer'] as const
  const tx = db.transaction(stores, 'readwrite')

  await Promise.all(stores.map((s) => tx.objectStore(s).clear()))

  await Promise.all([
    ...kategorier.map((k) => tx.objectStore('kategorier').put(k)),
    ...piktogrammer.map((p) => tx.objectStore('piktogrammer').put(p)),
    ...indstillinger.map((i) => tx.objectStore('indstillinger').put(i)),
    ...fasteValg.map((f) => tx.objectStore('fasteValg').put(f)),
    ...valgRegistreringer.map((v) => tx.objectStore('valgRegistreringer').put(v)),
  ])

  await tx.done
}
