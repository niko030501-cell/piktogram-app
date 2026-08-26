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
    indexes: { 'by-synket': number }
  }
  piktogrammer: {
    key: string
    value: Piktogram
    indexes: { 'by-kategori': string; 'by-favorit': number; 'by-synket': number }
  }
  indstillinger: {
    key: string
    value: Indstilling
  }
  fasteValg: {
    key: string
    value: FastValg
    indexes: { 'by-synket': number }
  }
  valgRegistreringer: {
    key: string
    value: ValgRegistrering
    indexes: { 'by-tidspunkt': number; 'by-synket': number }
  }
}

const DB_NAVN = 'piktogram-db'
const DB_VERSION = 3

let dbPromise: Promise<IDBPDatabase<PiktogramDBSkema>> | null = null

export function getDB(): Promise<IDBPDatabase<PiktogramDBSkema>> {
  if (!dbPromise) {
    dbPromise = openDB<PiktogramDBSkema>(DB_NAVN, DB_VERSION, {
      // upgrade() kører kun når databasen oprettes for første gang, eller når
      // DB_VERSION hæves. Skal datamodellen ændres senere: hæv DB_VERSION og
      // tilføj et NYT "if (oldVersion < X)"-trin herunder - rør aldrig ved
      // et eksisterende trin, så gamle enheder kan opgradere sikkert.
      async upgrade(db, oldVersion, _newVersion, transaction) {
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
        if (oldVersion < 3) {
          // Nyt indeks til at finde rækker, der mangler at blive sendt til
          // skyen (se src/sync/). "by-synket" findes først fra version 3,
          // så den tilføjes her - og alt eksisterende indhold markeres som
          // "mangler at blive sendt op", hvilket er sådan det havner i
          // skyen første gang synkronisering slås til.
          transaction.objectStore('kategorier').createIndex('by-synket', 'synket')
          transaction.objectStore('piktogrammer').createIndex('by-synket', 'synket')
          transaction.objectStore('fasteValg').createIndex('by-synket', 'synket')
          transaction.objectStore('valgRegistreringer').createIndex('by-synket', 'synket')

          let kategoriCursor = await transaction.objectStore('kategorier').openCursor()
          while (kategoriCursor) {
            await kategoriCursor.update({
              ...kategoriCursor.value,
              billedeStoragePath: null,
              opdateret: 0,
              slettet: null,
              synket: 0,
            })
            kategoriCursor = await kategoriCursor.continue()
          }

          let piktogramCursor = await transaction.objectStore('piktogrammer').openCursor()
          while (piktogramCursor) {
            await piktogramCursor.update({
              ...piktogramCursor.value,
              billedeStoragePath: null,
              opdateret: 0,
              slettet: null,
              synket: 0,
            })
            piktogramCursor = await piktogramCursor.continue()
          }

          let fastValgCursor = await transaction.objectStore('fasteValg').openCursor()
          while (fastValgCursor) {
            await fastValgCursor.update({ ...fastValgCursor.value, opdateret: 0, slettet: null, synket: 0 })
            fastValgCursor = await fastValgCursor.continue()
          }

          let registreringCursor = await transaction.objectStore('valgRegistreringer').openCursor()
          while (registreringCursor) {
            await registreringCursor.update({
              ...registreringCursor.value,
              opdateret: 0,
              synket: 0,
            })
            registreringCursor = await registreringCursor.continue()
          }
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
