// Denne fil beskriver "formen" på de data, appen gemmer.
// Hvis du en dag vil ændre hvilke oplysninger et piktogram eller en kategori
// har, er det her du starter - og i database.ts, hvor selve lagringen sker.

export interface Kategori {
  id: string
  navn: string
  /** Hex-farvekode, fx "#5B7FA6". Bruges konsekvent som genkendelse for kategorien. */
  farve: string
  raekkefolge: number
}

export interface Piktogram {
  id: string
  /** Ordet der siges højt og vises under billedet. */
  navn: string
  kategoriId: string
  /** Selve billedet, allerede skaleret ned og komprimeret. Null indtil et er tilføjet. */
  billede: Blob | null
  /** Rækkefølge inden for kategorien. */
  raekkefolge: number
  /**
   * Gemt som 0/1 i stedet for en rigtig boolean, fordi IndexedDB-indekser
   * historisk har haft upålidelig understøttelse af booleans som nøgler.
   */
  favorit: 0 | 1
  /** Rækkefølge i Snippen. Null hvis piktogrammet ikke er favorit. */
  snippenRaekkefolge: number | null
  oprettet: number
}

export type IndstillingNoegle = 'speechEnabled' | 'leylaMode' | 'leylaCode'

export interface Indstilling {
  key: IndstillingNoegle
  value: boolean | string
}

/**
 * Et fast, gemt valg til valgtavlen - fx "Gå eller cykle". Personalet kan
 * hente det frem med ét tryk i stedet for at vælge piktogrammer fra bunden
 * hver gang. Spørgsmålet siges højt, når valgtavlen åbnes med dette valg.
 */
export interface FastValg {
  id: string
  navn: string
  sporgsmaal: string
  piktogramIds: string[]
  raekkefolge: number
}

/**
 * Én registrering af, hvad der blev tilbudt, og hvordan hun svarede.
 * "tilbudt" og "fastValgNavn" gemmes som tekst (et øjebliksbillede), ikke
 * som referencer - så registreringen forbliver korrekt og læsbar, selvom
 * piktogrammer eller faste valg senere omdøbes eller slettes.
 */
export interface ValgRegistrering {
  id: string
  tidspunkt: number
  tilbudt: string[]
  fastValgNavn: string | null
  svar: SvarType
}

export type SvarType =
  | { type: 'valgte'; ord: string }
  | { type: 'ingen-respons' }
  | { type: 'andet' }

export const START_KATEGORIER: Omit<Kategori, 'id'>[] = [
  { navn: 'Basis', farve: '#5B7FA6', raekkefolge: 0 },
  { navn: 'Mad og drikke', farve: '#C97B4A', raekkefolge: 1 },
  { navn: 'Hygiejne', farve: '#5FA090', raekkefolge: 2 },
  { navn: 'Aktiviteter', farve: '#9B72B0', raekkefolge: 3 },
  { navn: 'Følelser', farve: '#C15C6B', raekkefolge: 4 },
  { navn: 'Personer og Steder', farve: '#7C8C5C', raekkefolge: 5 },
]

/** Piktogrammer der oprettes uden billede i Basis-kategorien ved første opstart. */
export const BASIS_PLADSER = ['pause', 'vent', 'færdig', 'næste', 'hjælp', 'toilet', 'spise', 'gåtur']

export const SNIPPEN_MAKS = 6
export const VALGTAVLE_MAKS = 4
export const VALGTAVLE_MIN = 2
