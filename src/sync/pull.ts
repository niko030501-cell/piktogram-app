// Henter ændringer fra skyen ned og lægger dem ind lokalt. Køres ved
// opstart, når enheden får forbindelse igen, når appen bliver synlig igen,
// og løbende via en Supabase Realtime-lytning, mens appen er åben.
//
// "Nyeste ændring vinder": en ekstern række overskriver kun den lokale,
// hvis dens tidsstempel fra serveren er nyere end det, vi selv kender.
// Billeder hentes i baggrunden bagefter, højst nogle få ad gangen, så
// kategorier/piktogrammer vises korrekt med navn og farve med det samme,
// mens billederne "drypper ind" derefter.

import { supabase } from './supabaseClient'
import * as kategoriRepo from '../db/categoriesRepo'
import * as piktogramRepo from '../db/pictogramsRepo'
import * as fastValgRepo from '../db/fasteValgRepo'
import * as valgRegistreringRepo from '../db/valgRegistreringerRepo'
import type { Kategori, Piktogram, FastValg, SvarType, ValgRegistrering } from '../db/schema'

const BILLED_BUCKET = 'piktogram-billeder'
const MAKS_SAMTIDIGE_DOWNLOADS = 4

interface KategoriRaekke {
  id: string
  navn: string
  farve: string
  raekkefolge: number
  billede_path: string | null
  slettet: string | null
  updated_at: string
}

interface PiktogramRaekke {
  id: string
  navn: string
  kategori_id: string
  billede_path: string | null
  raekkefolge: number
  favorit: boolean
  snippen_raekkefolge: number | null
  oprettet: number
  slettet: string | null
  updated_at: string
}

interface FastValgRaekke {
  id: string
  navn: string
  sporgsmaal: string
  piktogram_ids: string[]
  raekkefolge: number
  slettet: string | null
  updated_at: string
}

interface ValgRegistreringRaekke {
  id: string
  tidspunkt: number
  tilbudt: string[]
  fast_valg_navn: string | null
  svar: SvarType
  updated_at: string
}

/** Kører op til MAKS_SAMTIDIGE_DOWNLOADS opgaver ad gangen, i stedet for alle på én gang. */
async function medBegraensetSamtidighed<T>(opgaver: (() => Promise<T>)[]): Promise<void> {
  const koe = [...opgaver]
  async function arbejder() {
    let naeste = koe.shift()
    while (naeste) {
      await naeste()
      naeste = koe.shift()
    }
  }
  await Promise.all(Array.from({ length: MAKS_SAMTIDIGE_DOWNLOADS }, arbejder))
}

async function hentBillede(sti: string): Promise<Blob | null> {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(BILLED_BUCKET).download(sti)
  return error ? null : data
}

function erNyereEndLokal(fjernOpdateret: string, lokalOpdateret: number | undefined): boolean {
  if (lokalOpdateret === undefined) return true
  return new Date(fjernOpdateret).getTime() > lokalOpdateret
}

async function traekKategorier(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.from('piktogram_kategorier').select('*')
  if (error || !data) return

  const billedDownloads: (() => Promise<void>)[] = []

  for (const raekke of data as KategoriRaekke[]) {
    const lokal = await kategoriRepo.hentKategoriMedId(raekke.id)
    if (!erNyereEndLokal(raekke.updated_at, lokal?.opdateret)) continue

    const ny: Kategori = {
      id: raekke.id,
      navn: raekke.navn,
      farve: raekke.farve,
      raekkefolge: raekke.raekkefolge,
      billede: lokal?.billedeStoragePath === raekke.billede_path ? (lokal?.billede ?? null) : null,
      billedeStoragePath: raekke.billede_path,
      slettet: raekke.slettet ? new Date(raekke.slettet).getTime() : null,
      opdateret: new Date(raekke.updated_at).getTime(),
      synket: 1,
    }
    await kategoriRepo.gemKategori(ny, { fraSky: true })

    if (raekke.billede_path && !ny.billede) {
      billedDownloads.push(async () => {
        const blob = await hentBillede(raekke.billede_path!)
        if (blob) await kategoriRepo.gemKategori({ ...ny, billede: blob }, { fraSky: true })
      })
    }
  }

  await medBegraensetSamtidighed(billedDownloads)
}

async function traekPiktogrammer(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.from('piktogram_piktogrammer').select('*')
  if (error || !data) return

  const billedDownloads: (() => Promise<void>)[] = []

  for (const raekke of data as PiktogramRaekke[]) {
    const lokal = await piktogramRepo.hentPiktogramMedId(raekke.id)
    if (!erNyereEndLokal(raekke.updated_at, lokal?.opdateret)) continue

    const ny: Piktogram = {
      id: raekke.id,
      navn: raekke.navn,
      kategoriId: raekke.kategori_id,
      billede: lokal?.billedeStoragePath === raekke.billede_path ? (lokal?.billede ?? null) : null,
      billedeStoragePath: raekke.billede_path,
      raekkefolge: raekke.raekkefolge,
      favorit: raekke.favorit ? 1 : 0,
      snippenRaekkefolge: raekke.snippen_raekkefolge,
      oprettet: raekke.oprettet,
      slettet: raekke.slettet ? new Date(raekke.slettet).getTime() : null,
      opdateret: new Date(raekke.updated_at).getTime(),
      synket: 1,
    }
    await piktogramRepo.gemPiktogram(ny, { fraSky: true })

    if (raekke.billede_path && !ny.billede) {
      billedDownloads.push(async () => {
        const blob = await hentBillede(raekke.billede_path!)
        if (blob) await piktogramRepo.gemPiktogram({ ...ny, billede: blob }, { fraSky: true })
      })
    }
  }

  await medBegraensetSamtidighed(billedDownloads)
}

async function traekFasteValg(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.from('piktogram_faste_valg').select('*')
  if (error || !data) return

  for (const raekke of data as FastValgRaekke[]) {
    const lokal = await fastValgRepo.hentFastValgMedId(raekke.id)
    if (!erNyereEndLokal(raekke.updated_at, lokal?.opdateret)) continue

    const ny: FastValg = {
      id: raekke.id,
      navn: raekke.navn,
      sporgsmaal: raekke.sporgsmaal,
      piktogramIds: raekke.piktogram_ids,
      raekkefolge: raekke.raekkefolge,
      slettet: raekke.slettet ? new Date(raekke.slettet).getTime() : null,
      opdateret: new Date(raekke.updated_at).getTime(),
      synket: 1,
    }
    await fastValgRepo.gemFastValg(ny, { fraSky: true })
  }
}

async function traekValgRegistreringer(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.from('piktogram_valg_registreringer').select('*')
  if (error || !data) return

  for (const raekke of data as ValgRegistreringRaekke[]) {
    const lokal = await valgRegistreringRepo.hentValgRegistreringMedId(raekke.id)
    if (lokal) continue // append-only - findes den allerede lokalt, er der intet at opdatere

    const ny: ValgRegistrering = {
      id: raekke.id,
      tidspunkt: raekke.tidspunkt,
      tilbudt: raekke.tilbudt,
      fastValgNavn: raekke.fast_valg_navn,
      svar: raekke.svar,
      opdateret: new Date(raekke.updated_at).getTime(),
      synket: 1,
    }
    await valgRegistreringRepo.gemValgRegistrering(ny, { fraSky: true })
  }
}

/** Henter alt fra skyen ned og lægger det ind lokalt. Kaldes af SyncProvider. */
export async function traekFraSky(): Promise<void> {
  if (!supabase) return
  await traekKategorier()
  await Promise.all([traekPiktogrammer(), traekFasteValg(), traekValgRegistreringer()])
}
