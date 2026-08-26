// Beskriver hvilken "skærm" appen viser lige nu. Der bruges bevidst ingen
// router-bibliotek - appen har kun disse faste skærme, og navigation er
// bare et spørgsmål om at skifte denne ene værdi (se AppShell.tsx).

export type View =
  | { kind: 'hjem' }
  | { kind: 'kategori'; kategoriId: string }
  | {
      kind: 'fuldskaerm'
      /** Den liste billedet blev åbnet fra - bruges til swipe til næste/forrige. */
      piktogramIds: string[]
      indeks: number
      /** Skærmpositionen af det kort der blev trykket på, til "vokser ud"-animationen. */
      oprindelsesRect: DOMRectReadOnly | null
      /** Skærmen der vises igen, når fuldskærmsvisningen lukkes. */
      tilbageTil: View
    }
  | { kind: 'valgtavleOpsaetning' }
  | {
      kind: 'valgtavleVisning'
      piktogramIds: string[]
      /** Navn og spørgsmål fra det faste valg, hvis tavlen blev åbnet derfra - ellers null. */
      fastValgNavn: string | null
      sporgsmaal: string | null
    }
  | { kind: 'valgRegistreringer' }
  | { kind: 'snippenRediger' }
  | { kind: 'indstillinger' }
  | { kind: 'sikkerhedskopi' }
  | { kind: 'bulkImport'; forudvalgtKategoriId?: string }

export type NavigerTil = (view: View) => void
