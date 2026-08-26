// Simpelt nøgle/værdi-lager til indstillinger (tale til/fra, Leyla-tilstand,
// Leyla-kode). Nye indstillinger kan tilføjes uden at ændre databaseskemaet -
// de er bare en ny nøgle i samme store.

import { getDB } from './database'
import type { IndstillingNoegle } from './schema'

export async function hentIndstilling<T extends boolean | string>(
  key: IndstillingNoegle,
  standardVaerdi: T,
): Promise<T> {
  const db = await getDB()
  const raekke = await db.get('indstillinger', key)
  return raekke ? (raekke.value as T) : standardVaerdi
}

export async function gemIndstilling(key: IndstillingNoegle, value: boolean | string): Promise<void> {
  const db = await getDB()
  await db.put('indstillinger', { key, value })
}
