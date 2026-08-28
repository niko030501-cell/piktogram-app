// Holder kategorier og piktogrammer i hukommelsen, så resten af appen kan
// læse dem uden at spørge IndexedDB hele tiden. Alle ændringer skrives
// først til databasen (via db/*Repo.ts) og opdaterer derefter hukommelsen -
// det er derfor rækkefølgen "gem, så opdater state" går igen i hver funktion.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as kategoriRepo from '../db/categoriesRepo'
import * as piktogramRepo from '../db/pictogramsRepo'
import * as fastValgRepo from '../db/fasteValgRepo'
import * as valgRegistreringRepo from '../db/valgRegistreringerRepo'
import { saaFoersteGangHvisTomt } from '../db/seed'
import { harSkyForbindelse } from '../sync/supabaseClient'
import { SNIPPEN_MAKS } from '../db/schema'
import type { FastValg, Kategori, Piktogram, ValgRegistrering } from '../db/schema'

interface FavoritResultat {
  ok: boolean
  aarsag?: 'snippen-fuld'
}

interface DataContextVaerdi {
  klarTilBrug: boolean
  kategorier: Kategori[]
  piktogrammer: Piktogram[]
  favoritter: Piktogram[]
  piktogrammerForKategori: (kategoriId: string) => Piktogram[]
  opretKategori: (navn: string, farve: string, billede?: Blob | null) => Promise<Kategori>
  opdaterKategori: (kategori: Kategori) => Promise<void>
  sletKategoriOgIndhold: (id: string) => Promise<void>
  omorganiserKategorier: (nyeIRaekkefolge: Kategori[]) => Promise<void>
  tilfoejPiktogram: (piktogram: Piktogram) => Promise<void>
  tilfoejPiktogrammer: (piktogrammer: Piktogram[]) => Promise<void>
  opdaterPiktogram: (piktogram: Piktogram) => Promise<void>
  sletPiktogram: (id: string) => Promise<void>
  omorganiserPiktogrammer: (kategoriId: string, nyeIRaekkefolge: Piktogram[]) => Promise<void>
  toggleFavorit: (piktogram: Piktogram) => Promise<FavoritResultat>
  omorganiserSnippen: (nyeIRaekkefolge: Piktogram[]) => Promise<void>
  /** Kaldes når et billede fejler i browseren (fx en afbrudt download) - rydder det lokalt, så synkroniseringen prøver at hente det igen. */
  markerPiktogramBilledeOdelagt: (id: string) => Promise<void>
  markerKategoriBilledeOdelagt: (id: string) => Promise<void>
  fasteValg: FastValg[]
  opretFastValg: (navn: string, sporgsmaal: string, piktogramIds: string[]) => Promise<FastValg>
  opdaterFastValg: (fastValg: FastValg) => Promise<void>
  sletFastValg: (id: string) => Promise<void>
  omorganiserFasteValg: (nyeIRaekkefolge: FastValg[]) => Promise<void>
  valgRegistreringer: ValgRegistrering[]
  tilfoejValgRegistrering: (
    registrering: Omit<ValgRegistrering, 'id' | 'opdateret' | 'synket'>,
  ) => Promise<void>
  genindlaesFraDatabase: () => Promise<void>
}

const DataContext = createContext<DataContextVaerdi | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [klarTilBrug, setKlarTilBrug] = useState(false)
  const [kategorier, setKategorier] = useState<Kategori[]>([])
  const [piktogrammer, setPiktogrammer] = useState<Piktogram[]>([])
  const [fasteValg, setFasteValg] = useState<FastValg[]>([])
  const [valgRegistreringer, setValgRegistreringer] = useState<ValgRegistrering[]>([])

  const indlaesAlt = useCallback(async () => {
    const [nyeKategorier, nyePiktogrammer, nyeFasteValg, nyeValgRegistreringer] = await Promise.all([
      kategoriRepo.hentAlleKategorier(),
      piktogramRepo.hentAllePiktogrammer(),
      fastValgRepo.hentAlleFasteValg(),
      valgRegistreringRepo.hentAlleValgRegistreringer(),
    ])
    setKategorier(nyeKategorier)
    setPiktogrammer(nyePiktogrammer)
    setFasteValg(nyeFasteValg)
    setValgRegistreringer(nyeValgRegistreringer)
  }, [])

  useEffect(() => {
    void (async () => {
      // Med sky-forbindelse skal en helt ny, tom enhed IKKE så sig selv med
      // standardkategorier - den skal have de rigtige kategorier fra skyen i
      // stedet. Sås den lokalt først, ender begge sæt med at ligge der efter
      // den første synkronisering (se SyncProvider.tsx for den anden halvdel
      // af denne rettelse).
      if (!harSkyForbindelse) {
        await saaFoersteGangHvisTomt()
      }
      await indlaesAlt()
      setKlarTilBrug(true)
    })()
  }, [indlaesAlt])

  const piktogrammerForKategori = useCallback(
    (kategoriId: string) =>
      piktogrammer
        .filter((p) => p.kategoriId === kategoriId)
        .sort((a, b) => a.raekkefolge - b.raekkefolge),
    [piktogrammer],
  )

  const favoritter = useMemo(
    () =>
      piktogrammer
        .filter((p) => p.favorit === 1 && p.snippenRaekkefolge !== null)
        .sort((a, b) => (a.snippenRaekkefolge ?? 0) - (b.snippenRaekkefolge ?? 0)),
    [piktogrammer],
  )

  const opretKategori = useCallback(
    async (navn: string, farve: string, billede: Blob | null = null) => {
      const ny: Kategori = {
        id: kategoriRepo.nyKategoriId(),
        navn,
        farve,
        raekkefolge: kategorier.length,
        billede,
        billedeStoragePath: null,
        opdateret: Date.now(),
        slettet: null,
        synket: 0,
      }
      await kategoriRepo.gemKategori(ny)
      setKategorier((forrige) => [...forrige, ny])
      return ny
    },
    [kategorier.length],
  )

  const opdaterKategori = useCallback(async (kategori: Kategori) => {
    await kategoriRepo.gemKategori(kategori)
    setKategorier((forrige) => forrige.map((k) => (k.id === kategori.id ? kategori : k)))
  }, [])

  const sletKategoriOgIndhold = useCallback(
    async (id: string) => {
      const beroerte = piktogrammer.filter((p) => p.kategoriId === id)
      await Promise.all(beroerte.map((p) => piktogramRepo.sletPiktogram(p.id)))
      await kategoriRepo.sletKategori(id)
      setPiktogrammer((forrige) => forrige.filter((p) => p.kategoriId !== id))
      setKategorier((forrige) => forrige.filter((k) => k.id !== id))
    },
    [piktogrammer],
  )

  const omorganiserKategorier = useCallback(async (nyeIRaekkefolge: Kategori[]) => {
    const opdaterede = nyeIRaekkefolge.map((k, index) => ({ ...k, raekkefolge: index }))
    await kategoriRepo.gemFlereKategorier(opdaterede)
    setKategorier(opdaterede)
  }, [])

  const tilfoejPiktogram = useCallback(async (piktogram: Piktogram) => {
    await piktogramRepo.gemPiktogram(piktogram)
    setPiktogrammer((forrige) => [...forrige, piktogram])
  }, [])

  const tilfoejPiktogrammer = useCallback(async (nye: Piktogram[]) => {
    await piktogramRepo.gemFlerePiktogrammer(nye)
    setPiktogrammer((forrige) => [...forrige, ...nye])
  }, [])

  const opdaterPiktogram = useCallback(async (piktogram: Piktogram) => {
    await piktogramRepo.gemPiktogram(piktogram)
    setPiktogrammer((forrige) => forrige.map((p) => (p.id === piktogram.id ? piktogram : p)))
  }, [])

  const sletPiktogram = useCallback(async (id: string) => {
    await piktogramRepo.sletPiktogram(id)
    setPiktogrammer((forrige) => forrige.filter((p) => p.id !== id))
  }, [])

  const omorganiserPiktogrammer = useCallback(
    async (kategoriId: string, nyeIRaekkefolge: Piktogram[]) => {
      const opdaterede = nyeIRaekkefolge.map((p, index) => ({ ...p, raekkefolge: index }))
      await piktogramRepo.gemFlerePiktogrammer(opdaterede)
      setPiktogrammer((forrige) => {
        const uberoerte = forrige.filter((p) => p.kategoriId !== kategoriId)
        return [...uberoerte, ...opdaterede]
      })
    },
    [],
  )

  const toggleFavorit = useCallback(
    async (piktogram: Piktogram): Promise<FavoritResultat> => {
      // Retter kun favorit/snippenRaekkefolge - ikke resten af piktogrammet -
      // så et billede, der er hentet ned i baggrunden siden sidst appen
      // genindlæste sin hukommelse, ikke ved et uheld bliver overskrevet med
      // den forældede udgave, vi selv sidder med i "favoritter" her.
      if (piktogram.favorit === 1) {
        const resterende = favoritter.filter((p) => p.id !== piktogram.id)
        const rettelser = [
          { id: piktogram.id, felter: { favorit: 0 as const, snippenRaekkefolge: null } },
          ...resterende.map((p, index) => ({ id: p.id, felter: { snippenRaekkefolge: index } })),
        ]
        const opdaterede = await piktogramRepo.opdaterFlerePiktogramFelter(rettelser)
        setPiktogrammer((forrige) => forrige.map((p) => opdaterede.find((o) => o.id === p.id) ?? p))
        return { ok: true }
      }

      if (favoritter.length >= SNIPPEN_MAKS) {
        return { ok: false, aarsag: 'snippen-fuld' }
      }

      const [opdateret] = await piktogramRepo.opdaterFlerePiktogramFelter([
        { id: piktogram.id, felter: { favorit: 1, snippenRaekkefolge: favoritter.length } },
      ])
      if (opdateret) setPiktogrammer((forrige) => forrige.map((p) => (p.id === opdateret.id ? opdateret : p)))
      return { ok: true }
    },
    [favoritter],
  )

  const omorganiserSnippen = useCallback(async (nyeIRaekkefolge: Piktogram[]) => {
    const rettelser = nyeIRaekkefolge.map((p, index) => ({ id: p.id, felter: { snippenRaekkefolge: index } }))
    const opdaterede = await piktogramRepo.opdaterFlerePiktogramFelter(rettelser)
    setPiktogrammer((forrige) => forrige.map((p) => opdaterede.find((o) => o.id === p.id) ?? p))
  }, [])

  const opretFastValg = useCallback(
    async (navn: string, sporgsmaal: string, piktogramIds: string[]) => {
      const ny: FastValg = {
        id: fastValgRepo.nytFastValgId(),
        navn,
        sporgsmaal,
        piktogramIds,
        raekkefolge: fasteValg.length,
        opdateret: Date.now(),
        slettet: null,
        synket: 0,
      }
      await fastValgRepo.gemFastValg(ny)
      setFasteValg((forrige) => [...forrige, ny])
      return ny
    },
    [fasteValg.length],
  )

  const opdaterFastValg = useCallback(async (fastValg: FastValg) => {
    await fastValgRepo.gemFastValg(fastValg)
    setFasteValg((forrige) => forrige.map((f) => (f.id === fastValg.id ? fastValg : f)))
  }, [])

  const sletFastValg = useCallback(async (id: string) => {
    await fastValgRepo.sletFastValg(id)
    setFasteValg((forrige) => forrige.filter((f) => f.id !== id))
  }, [])

  const omorganiserFasteValg = useCallback(async (nyeIRaekkefolge: FastValg[]) => {
    const opdaterede = nyeIRaekkefolge.map((f, index) => ({ ...f, raekkefolge: index }))
    await fastValgRepo.gemFlereFasteValg(opdaterede)
    setFasteValg(opdaterede)
  }, [])

  const tilfoejValgRegistrering = useCallback(async (registrering: Omit<ValgRegistrering, 'id' | 'opdateret' | 'synket'>) => {
    const ny: ValgRegistrering = {
      id: valgRegistreringRepo.nyValgRegistreringId(),
      ...registrering,
      opdateret: Date.now(),
      synket: 0,
    }
    await valgRegistreringRepo.gemValgRegistrering(ny)
    setValgRegistreringer((forrige) => [ny, ...forrige])
  }, [])

  const markerPiktogramBilledeOdelagt = useCallback(async (id: string) => {
    await piktogramRepo.ryddOdelagtBilledeLokalt(id)
    setPiktogrammer((forrige) => forrige.map((p) => (p.id === id ? { ...p, billede: null } : p)))
  }, [])

  const markerKategoriBilledeOdelagt = useCallback(async (id: string) => {
    await kategoriRepo.ryddOdelagtBilledeLokalt(id)
    setKategorier((forrige) => forrige.map((k) => (k.id === id ? { ...k, billede: null } : k)))
  }, [])

  const vaerdi: DataContextVaerdi = {
    klarTilBrug,
    kategorier,
    piktogrammer,
    favoritter,
    piktogrammerForKategori,
    opretKategori,
    opdaterKategori,
    sletKategoriOgIndhold,
    omorganiserKategorier,
    tilfoejPiktogram,
    tilfoejPiktogrammer,
    opdaterPiktogram,
    sletPiktogram,
    omorganiserPiktogrammer,
    toggleFavorit,
    omorganiserSnippen,
    markerPiktogramBilledeOdelagt,
    markerKategoriBilledeOdelagt,
    fasteValg,
    opretFastValg,
    opdaterFastValg,
    sletFastValg,
    omorganiserFasteValg,
    valgRegistreringer,
    tilfoejValgRegistrering,
    genindlaesFraDatabase: indlaesAlt,
  }

  return <DataContext.Provider value={vaerdi}>{children}</DataContext.Provider>
}

export function useData(): DataContextVaerdi {
  const vaerdi = useContext(DataContext)
  if (!vaerdi) throw new Error('useData skal bruges inden i en <DataProvider>')
  return vaerdi
}
