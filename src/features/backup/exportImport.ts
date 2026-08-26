// Eksporterer og importerer ALT appens indhold som én JSON-fil. Det er den
// eneste måde data flyttes mellem enheder på (fx til hendes egen iPad
// senere), da appen bevidst ikke har nogen server eller sky-lagring.
//
// Billeder gemmes i filen som base64-tekst i stedet for rå Blob-data, fordi
// JSON kun kan indeholde tekst. Det gør filen ca. en tredjedel større, end
// billederne fylder i appen, men til gengæld er det stadig bare "én fil".

import { erstatAltIndhold } from '../../db/database'
import * as kategoriRepo from '../../db/categoriesRepo'
import * as piktogramRepo from '../../db/pictogramsRepo'
import * as settingsRepo from '../../db/settingsRepo'
import * as fastValgRepo from '../../db/fasteValgRepo'
import * as valgRegistreringRepo from '../../db/valgRegistreringerRepo'
import type {
  FastValg,
  Indstilling,
  IndstillingNoegle,
  Kategori,
  Piktogram,
  ValgRegistrering,
} from '../../db/schema'

const EKSPORT_VERSION = 3

interface EksportKategori extends Omit<Kategori, 'billede'> {
  billedeBase64: string | null
}

interface EksportPiktogram extends Omit<Piktogram, 'billede'> {
  billedeBase64: string | null
}

export interface EksportData {
  version: number
  eksporteretDato: string
  indstillinger: Indstilling[]
  kategorier: EksportKategori[]
  piktogrammer: EksportPiktogram[]
  /** Findes ikke i sikkerhedskopier lavet før version 2 - importeres da som tom liste. */
  fasteValg?: FastValg[]
  /** Findes ikke i sikkerhedskopier lavet før version 2 - importeres da som tom liste. */
  valgRegistreringer?: ValgRegistrering[]
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
    kategorier.map(async ({ billede, ...resten }) => ({
      ...resten,
      billedeBase64: billede ? await blobTilBase64(billede) : null,
    })),
  )

  const eksportPiktogrammer: EksportPiktogram[] = await Promise.all(
    piktogrammer.map(async ({ billede, ...resten }) => ({
      ...resten,
      billedeBase64: billede ? await blobTilBase64(billede) : null,
    })),
  )

  return {
    version: EKSPORT_VERSION,
    eksporteretDato: new Date().toISOString(),
    indstillinger,
    kategorier: eksportKategorier,
    piktogrammer: eksportPiktogrammer,
    fasteValg,
    valgRegistreringer,
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
      // ikke billedeBase64 - de importeres bare uden billede.
      billede: billedeBase64 ? await base64TilBlob(billedeBase64) : null,
    })),
  )
  const piktogrammer: Piktogram[] = await Promise.all(
    data.piktogrammer.map(async ({ billedeBase64, ...resten }) => ({
      ...resten,
      billede: billedeBase64 ? await base64TilBlob(billedeBase64) : null,
    })),
  )
  await erstatAltIndhold(
    kategorier,
    piktogrammer,
    data.indstillinger ?? [],
    data.fasteValg ?? [],
    data.valgRegistreringer ?? [],
  )
}
