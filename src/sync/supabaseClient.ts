// Opretter forbindelsen til Supabase (databasen i skyen). Selve adressen og
// den offentlige nøgle læses fra miljøvariabler, sat i ".env.local" lokalt
// og som "Environment variables" i Netlifys indstillinger for den udgivne
// app - se .env.example. Nøglen her er beregnet til at ligge i appens kode
// og er ikke i sig selv nok til at læse eller ændre noget; det kræver også
// et gyldigt login (se Row Level Security-reglerne sat op i Supabase).

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const noegle = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Sandt hvis appen er sat op med sky-forbindelse. Er den ikke (endnu),
 * fungerer appen stadig fint - bare uden synkronisering og login, som hvis
 * funktionen aldrig var bygget.
 */
export const harSkyForbindelse = Boolean(url && noegle)

export const supabase = harSkyForbindelse ? createClient(url!, noegle!) : null
