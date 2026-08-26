// Denne fil beskriver "formen" på de data, appen gemmer.
// Hvis du en dag vil ændre hvilke oplysninger et piktogram eller en kategori
// har, er det her du starter - og i database.ts, hvor selve lagringen sker.

/**
 * Fælles felter til sky-synkronisering (se src/sync/) - alt undtagen
 * Indstilling har disse to felter oven i sine egne.
 */
export interface SynkFelter {
  /** Tidsstempel for sidst kendte synkronisering med skyen. */
  opdateret: number
  /**
   * 0 = denne ændring mangler at blive sendt til skyen endnu. Fungerer
   * samtidig som gensendings-kø: en ændring lavet uden forbindelse står
   * bare som 0, til der er forbindelse igen.
   */
  synket: 0 | 1
}

/**
 * Som SynkFelter, men for de typer der også kan slettes.
 * ValgRegistrering har IKKE dette - loggen er bevidst append-only og kan
 * hverken rettes eller slettes, så der er intet at markere som slettet.
 */
export interface SynkFelterMedSletning extends SynkFelter {
  /**
   * "Blød" sletning i stedet for at rækken bare forsvinder - null betyder
   * ikke slettet. Gør at en sletning når at brede sig til alle enheder,
   * i stedet for kun at forsvinde på den enhed, den blev slettet på.
   */
  slettet: number | null
}

export interface Kategori extends SynkFelterMedSletning {
  id: string
  navn: string
  /** Hex-farvekode, fx "#5B7FA6". Bruges konsekvent som genkendelse for kategorien. */
  farve: string
  raekkefolge: number
  /**
   * Valgfrit billede vist på kategoriflisen på forsiden - vigtigt for at
   * hun selv kan finde rundt uden at kunne læse. Null indtil et er tilføjet;
   * flisen falder da tilbage til kun farve og navn.
   */
  billede: Blob | null
  /** Sti til billedet i Supabase Storage, hvis det er sendt til skyen. */
  billedeStoragePath: string | null
}

export interface Piktogram extends SynkFelterMedSletning {
  id: string
  /** Ordet der siges højt og vises under billedet. */
  navn: string
  kategoriId: string
  /** Selve billedet, allerede skaleret ned og komprimeret. Null indtil et er tilføjet. */
  billede: Blob | null
  /** Sti til billedet i Supabase Storage, hvis det er sendt til skyen. */
  billedeStoragePath: string | null
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
export interface FastValg extends SynkFelterMedSletning {
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
export interface ValgRegistrering extends SynkFelter {
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
  { navn: 'Basis', farve: '#5B7FA6', raekkefolge: 0, billede: null, billedeStoragePath: null, opdateret: 0, slettet: null, synket: 0 },
  { navn: 'Mad og drikke', farve: '#C97B4A', raekkefolge: 1, billede: null, billedeStoragePath: null, opdateret: 0, slettet: null, synket: 0 },
  { navn: 'Hygiejne', farve: '#5FA090', raekkefolge: 2, billede: null, billedeStoragePath: null, opdateret: 0, slettet: null, synket: 0 },
  { navn: 'Aktiviteter', farve: '#9B72B0', raekkefolge: 3, billede: null, billedeStoragePath: null, opdateret: 0, slettet: null, synket: 0 },
  { navn: 'Følelser', farve: '#C15C6B', raekkefolge: 4, billede: null, billedeStoragePath: null, opdateret: 0, slettet: null, synket: 0 },
  { navn: 'Personer og Steder', farve: '#7C8C5C', raekkefolge: 5, billede: null, billedeStoragePath: null, opdateret: 0, slettet: null, synket: 0 },
]

/** Piktogrammer der oprettes uden billede i Basis-kategorien ved første opstart. */
export const BASIS_PLADSER = ['pause', 'vent', 'færdig', 'næste', 'hjælp', 'toilet', 'spise', 'gåtur']

export const SNIPPEN_MAKS = 6
export const VALGTAVLE_MAKS = 4
export const VALGTAVLE_MIN = 2
