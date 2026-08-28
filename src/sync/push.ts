// Sender lokale ændringer (rækker med synket: 0) til skyen. Billeder
// uploades til Supabase Storage FØR selve rækken sendes, med en fast,
// forudsigelig sti (kategorier/{id}.jpg osv.) - så et gentaget forsøg,
// hvis noget fejler undervejs, bare overskriver samme sted i stedet for at
// oprette dubletter.
//
// Lykkes en overførsel ikke (fx ingen forbindelse), bliver rækken bare
// stående som synket: 0 og prøves igen ved næste kald - det ER hele
// gensendings-køen, der er ingen separat liste at holde styr på.

import { supabase } from './supabaseClient'
import * as kategoriRepo from '../db/categoriesRepo'
import * as piktogramRepo from '../db/pictogramsRepo'
import * as fastValgRepo from '../db/fasteValgRepo'
import * as valgRegistreringRepo from '../db/valgRegistreringerRepo'

const BILLED_BUCKET = 'piktogram-billeder'

async function uploadBillede(sti: string, billede: Blob): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.storage
    .from(BILLED_BUCKET)
    .upload(sti, billede, { upsert: true, contentType: 'image/jpeg' })
  return !error
}

function tilIso(millisekunder: number | null): string | null {
  return millisekunder === null ? null : new Date(millisekunder).toISOString()
}

async function skubKategorier(): Promise<void> {
  if (!supabase) return
  const rader = await kategoriRepo.hentKategorierTilSynkronisering()

  for (const k of rader) {
    let sti = k.billedeStoragePath
    if (k.billede) {
      const foreslaaetSti = `kategorier/${k.id}.jpg`
      if (await uploadBillede(foreslaaetSti, k.billede)) sti = foreslaaetSti
    }

    const { data, error } = await supabase
      .from('piktogram_kategorier')
      .upsert({
        id: k.id,
        navn: k.navn,
        farve: k.farve,
        raekkefolge: k.raekkefolge,
        billede_path: sti,
        slettet: tilIso(k.slettet),
      })
      .select('updated_at')
      .single()

    if (error || !data) continue // forbliver synket: 0, prøves igen senere

    // Patch, ikke overskriv: hvis kategorien er blevet ændret lokalt igen,
    // imens vi ventede på netværket, skal den nyere ændring stå ved magt -
    // den bliver samlet op og sendt i den næste synkronisering i stedet.
    await kategoriRepo.patchKategoriHvisUaendret(k.id, k.opdateret, {
      billedeStoragePath: sti,
      opdateret: new Date(data.updated_at).getTime(),
      synket: 1,
    })
  }
}

async function skubPiktogrammer(): Promise<void> {
  if (!supabase) return
  const rader = await piktogramRepo.hentPiktogrammerTilSynkronisering()

  for (const p of rader) {
    let sti = p.billedeStoragePath
    if (p.billede) {
      const foreslaaetSti = `piktogrammer/${p.id}.jpg`
      if (await uploadBillede(foreslaaetSti, p.billede)) sti = foreslaaetSti
    }

    const { data, error } = await supabase
      .from('piktogram_piktogrammer')
      .upsert({
        id: p.id,
        navn: p.navn,
        kategori_id: p.kategoriId,
        billede_path: sti,
        raekkefolge: p.raekkefolge,
        favorit: p.favorit === 1,
        snippen_raekkefolge: p.snippenRaekkefolge,
        oprettet: p.oprettet,
        slettet: tilIso(p.slettet),
      })
      .select('updated_at')
      .single()

    if (error || !data) continue

    // Patch, ikke overskriv: se kommentaren i skubKategorier ovenfor.
    await piktogramRepo.patchPiktogramHvisUaendret(p.id, p.opdateret, {
      billedeStoragePath: sti,
      opdateret: new Date(data.updated_at).getTime(),
      synket: 1,
    })
  }
}

async function skubFasteValg(): Promise<void> {
  if (!supabase) return
  const rader = await fastValgRepo.hentFasteValgTilSynkronisering()

  for (const f of rader) {
    const { data, error } = await supabase
      .from('piktogram_faste_valg')
      .upsert({
        id: f.id,
        navn: f.navn,
        sporgsmaal: f.sporgsmaal,
        piktogram_ids: f.piktogramIds,
        raekkefolge: f.raekkefolge,
        slettet: tilIso(f.slettet),
      })
      .select('updated_at')
      .single()

    if (error || !data) continue

    await fastValgRepo.gemFastValg(
      { ...f, opdateret: new Date(data.updated_at).getTime(), synket: 1 },
      { fraSky: true },
    )
  }
}

async function skubValgRegistreringer(): Promise<void> {
  if (!supabase) return
  const rader = await valgRegistreringRepo.hentValgRegistreringerTilSynkronisering()

  for (const v of rader) {
    const { data, error } = await supabase
      .from('piktogram_valg_registreringer')
      .upsert({
        id: v.id,
        tidspunkt: v.tidspunkt,
        tilbudt: v.tilbudt,
        fast_valg_navn: v.fastValgNavn,
        svar: v.svar,
      })
      .select('updated_at')
      .single()

    if (error || !data) continue

    await valgRegistreringRepo.gemValgRegistrering(
      { ...v, opdateret: new Date(data.updated_at).getTime(), synket: 1 },
      { fraSky: true },
    )
  }
}

/** Sender alle lokale ændringer til skyen. Kaldes af SyncProvider. */
export async function skubTilSky(): Promise<void> {
  if (!supabase) return
  // Kategorier først, så piktogrammernes kategori-reference altid findes.
  await skubKategorier()
  await Promise.all([skubPiktogrammer(), skubFasteValg(), skubValgRegistreringer()])
}
