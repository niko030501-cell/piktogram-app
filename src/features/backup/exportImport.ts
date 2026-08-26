// Eksporterer og importerer ALT appens indhold som én JSON-fil. Det er
// stadig nyttigt som en uafhængig sikkerhedskopi, selv efter sky-
// synkronisering er kommet til (se src/sync/) - denne fil virker uanset om
// Supabase-kontoen findes, er nået, eller er sat på pause.
//
// Billeder gemmes i filen som base64-tekst i stedet for rå Blob-data, fordi
// JSON kun kan indeholde tekst. Det gør filen ca. en tredjedel større, end
// billederne fylder i appen, men til gengæld er det stadig bare "én fil".
//
// "synket" (om rækken er sendt til skyen) er lokal bogføring uden mening på
// en anden enhed - den fjernes ved eksport og sættes til 0 ved import, så
// en gendannet sikkerhedskopi bliver sendt til skyen igen for en sikkerheds
// skyld i stedet for at antage, den allerede er der.

import { erstatAltIndhold } from '../../db/database'
import * as kategoriRepo from '../../db/categoriesRepo'
import * as piktogramRepo from '../../db/pictogramsRepo'
import * as settingsRepo from '../../db/settingsRepo'
import * as fastValgRepo from '../../db/fasteValgRepo'
import * as valgRegistreringRepo from '../../db/valgRegistreringerRepo'
import { varslOmLokalAendring } from '../../sync/dirtySignal'
import type {
  FastValg,
  Indstilling,
  IndstillingNoegle,
  Kategori,
  Piktogram,
  ValgRegistrering,
} from '../../db/schema'

const EKSPORT_VERSION = 4

interface EksportKategori extends Omit<Kategori, 'billede' | 'synket'> {
  billedeBase64: string | null
}

interface EksportPiktogram extends Omit<Piktogram, 'billede' | 'synket'> {
  billedeBase64: string | null
}

type EksportFastValg = Omit<FastValg, 'synket'>
type EksportValgRegistrering = Omit<ValgRegistrering, 'synket'>

export interface EksportData {
  version: number
  eksporteretDato: string
  indstillinger: Indstilling[]
  kategorier: EksportKategori[]
  piktogrammer: EksportPiktogram[]
  /** Findes ikke i sikkerhedskopier lavet før version 2 - importeres da som tom liste. */
  fasteValg?: EksportFastValg[]
  /** Findes ikke i sikkerhedskopier lavet før version 2 - importeres da som tom liste. */
  valgRegistreringer?: EksportValgRegistrering[]
}

function blobTilBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function base64TilBlob(dataUrl: string): Promise<Blob> {
  const svar = await fetch(dataUrl)
  return svar.blob()
}

async function hentAlleIndstillinger(): Promise<Indstilling[]> {
  const noegler: { key: IndstillingNoegle; standard: boolean | string }[] = [
    { key: 'speechEnabled', standard: true },
    { key: 'leylaMode', standard: false },
    { key: 'leylaCode', standard: '' },
  ]
  return Promise.all(
    noegler.map(async ({ key, standard }) => ({
      key,
      value: await settingsRepo.hentIndstilling(key, standard),
    })),
  )
}

export async function lavEksportData(): Promise<EksportData> {
  const [kategorier, piktogrammer, indstillinger, fasteValg, valgRegistreringer] = await Promise.all([
    kategoriRepo.hentAlleKategorier(),
    piktogramRepo.hentAllePiktogrammer(),
    hentAlleIndstillinger(),
    fastValgRepo.hentAlleFasteValg(),
    valgRegistreringRepo.hentAlleValgRegistreringer(),
  ])

  const eksportKategorier: EksportKategori[] = await Promise.all(
    kategorier.map(async ({ billede, synket: _synket, ...resten }) => ({
      ...resten,
      billedeBase64: billede ? await blobTilBase64(billede) : null,
    })),
  )

  const eksportPiktogrammer: EksportPiktogram[] = await Promise.all(
    piktogrammer.map(async ({ billede, synket: _synket, ...resten }) => ({
      ...resten,
      billedeBase64: billede ? await blobTilBase64(billede) : null,
    })),
  )

  const eksportFasteValg: EksportFastValg[] = fasteValg.map(({ synket: _synket, ...resten }) => resten)
  const eksportValgRegistreringer: EksportValgRegistrering[] = valgRegistreringer.map(
    ({ synket: _synket, ...resten }) => resten,
  )

  return {
    version: EKSPORT_VERSION,
    eksporteretDato: new Date().toISOString(),
    indstillinger,
    kategorier: eksportKategorier,
    piktogrammer: eksportPiktogrammer,
    fasteValg: eksportFasteValg,
    valgRegistreringer: eksportValgRegistreringer,
  }
}

export async function downloadEksport(): Promise<void> {
  const data = await lavEksportData()
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const dato = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `piktogram-app-sikkerhedskopi-${dato}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export interface IndlaestBackup {
  data: EksportData
  antalKategorier: number
  antalPiktogrammer: number
}

export async function laesBackupFil(fil: File): Promise<IndlaestBackup> {
  const tekst = await fil.text()
  const data = JSON.parse(tekst) as EksportData
  if (!data || typeof data !== 'object' || !Array.isArray(data.kategorier) || !Array.isArray(data.piktogrammer)) {
    throw new Error('Filen ligner ikke en gyldig sikkerhedskopi fra Piktogram app.')
  }
  return {
    data,
    antalKategorier: data.kategorier.length,
    antalPiktogrammer: data.piktogrammer.length,
  }
}

export async function importerBackup(data: EksportData): Promise<void> {
  const kategorier: Kategori[] = await Promise.all(
    data.kategorier.map(async ({ billedeBase64, ...resten }) => ({
      ...resten,
      // Sikkerhedskopier fra før billeder på kategorier (version < 3) har
      // ikke billedeBase64 - de importeres bare uden billede. Ældre filer
      // (version < 4) har heller ikke sync-felterne - de får fornuftige
      // standardværdier, og synket sættes altid til 0 (se filens topkommentar).
      billede: billedeBase64 ? await base64TilBlob(billedeBase64) : null,
      billedeStoragePath: resten.billedeStoragePath ?? null,
      opdateret: resten.opdateret ?? 0,
      slettet: resten.slettet ?? null,
      synket: 0 as const,
    })),
  )
  const piktogrammer: Piktogram[] = await Promise.all(
    data.piktogrammer.map(async ({ billedeBase64, ...resten }) => ({
      ...resten,
      billede: billedeBase64 ? await base64TilBlob(billedeBase64) : null,
      billedeStoragePath: resten.billedeStoragePath ?? null,
      opdateret: resten.opdateret ?? 0,
      slettet: resten.slettet ?? null,
      synket: 0 as const,
    })),
  )
  const fasteValg: FastValg[] = (data.fasteValg ?? []).map((f) => ({
    ...f,
    opdateret: f.opdateret ?? 0,
    slettet: f.slettet ?? null,
    synket: 0 as const,
  }))
  const valgRegistreringer: ValgRegistrering[] = (data.valgRegistreringer ?? []).map((v) => ({
    ...v,
    opdateret: v.opdateret ?? 0,
    synket: 0 as const,
  }))

  await erstatAltIndhold(kategorier, piktogrammer, data.indstillinger ?? [], fasteValg, valgRegistreringer)

  // erstatAltIndhold skriver direkte til databasen (uden om repo-filerne),
  // så vi skal selv varsle om, at der nu er indhold der mangler at blive
  // sendt til skyen.
  varslOmLokalAendring()
}
