// Foreslår et navn til et piktogram ud fra filnavnet på det billede, der
// blev valgt. "toilet.png" bliver til "toilet", "vaske_hænder.jpg" bliver
// til "vaske hænder". Personalet retter selv til, hvis forslaget ikke passer.

export function filnavnTilNavn(filnavn: string): string {
  const udenEndelse = filnavn.replace(/\.[^./\\]+$/, '')
  return udenEndelse.replace(/[-_]+/g, ' ').trim().toLowerCase()
}
