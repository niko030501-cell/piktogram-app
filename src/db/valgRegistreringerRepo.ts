// Gemmer og henter loggen over, hvad der er blevet tilbudt og svaret på
// valgtavlen. Loggen er bevidst "append-only" (der tilføjes kun nye
// registreringer, intet rettes eller slettes her) - det skal være en
// pålidelig, kronologisk facitliste, ligesom en journal.

import { getDB } from './database'
import type { ValgRegistrering } from './schema'

export async function hentAlleValgRegistreringer(): Promise<ValgRegistrering[]> {
  const db = await getDB()
  const alle = await db.getAll('valgRegistreringer')
  return alle.sort((a, b) => b.tidspunkt - a.tidspunkt) // nyeste først
}

export async function gemValgRegistrering(registrering: ValgRegistrering): Promise<void> {
  const db = await getDB()
  await db.put('valgRegistreringer', registrering)
}

export function nyValgRegistreringId(): string {
  return crypto.randomUUID()
}
