// Gemmer og henter loggen over, hvad der er blevet tilbudt og svaret på
// valgtavlen. Loggen er bevidst "append-only" (der tilføjes kun nye
// registreringer, intet rettes eller slettes her) - det skal være en
// pålidelig, kronologisk facitliste, ligesom en journal. Derfor er der
// ingen "slettet"-håndtering her, i modsætning til de andre repo-filer.

import { getDB } from './database'
import { varslOmLokalAendring } from '../sync/dirtySignal'
import type { ValgRegistrering } from './schema'

export async function hentAlleValgRegistreringer(): Promise<ValgRegistrering[]> {
  const db = await getDB()
  const alle = await db.getAll('valgRegistreringer')
  return alle.sort((a, b) => b.tidspunkt - a.tidspunkt) // nyeste først
}

/** Bruges af synkroniseringen til at finde rækker, der mangler at blive sendt til skyen. */
export async function hentValgRegistreringerTilSynkronisering(): Promise<ValgRegistrering[]> {
  const db = await getDB()
  return db.getAllFromIndex('valgRegistreringer', 'by-synket', 0)
}

/** Sættes af synkroniseringen selv, når en registrering hentes FRA skyen - skal ikke markeres som "mangler at blive sendt op" igen. */
export async function gemValgRegistrering(
  registrering: ValgRegistrering,
  valgfri?: { fraSky?: boolean },
): Promise<void> {
  const db = await getDB()
  const raekke = valgfri?.fraSky
    ? registrering
    : { ...registrering, opdateret: Date.now(), synket: 0 as const }
  await db.put('valgRegistreringer', raekke)
  if (!valgfri?.fraSky) varslOmLokalAendring()
}

export function nyValgRegistreringId(): string {
  return crypto.randomUUID()
}
