// Lille "nogen har lavet en lokal ændring"-varsling. Repo-filerne kalder
// varslOmLokalAendring(), hver gang de gemmer eller sletter noget lokalt.
// SyncProvider lytter efter det (se pull.ts/push.ts) og sender ændringen
// til skyen kort efter - uden at repo-filerne behøver vide noget om,
// hvordan eller hvornår synkronisering rent faktisk sker.

type Lytter = () => void

const lyttere = new Set<Lytter>()

export function varslOmLokalAendring(): void {
  lyttere.forEach((lytter) => lytter())
}

export function lytEfterLokaleAendringer(lytter: Lytter): () => void {
  lyttere.add(lytter)
  return () => lyttere.delete(lytter)
}
