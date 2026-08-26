// Talesyntese: siger et ord højt på dansk via browserens indbyggede
// Web Speech API. Ingen eksternt bibliotek eller tjeneste er involveret -
// det er browserens egen, indbyggede stemme.
//
// VIGTIGT om iPhone/iPad: Safari tillader kun at STARTE tale som en direkte
// reaktion på et tryk (samme regel som fx video med lyd). Derfor skal
// sigOrd() altid kaldes direkte inde i en onClick/onPointerUp - aldrig efter
// et "await" eller inde i en useEffect, for så er "trykket" for langt væk,
// og iOS afviser stille og roligt at sige noget.

function findDanskStemme(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const stemmer = window.speechSynthesis.getVoices()
  if (stemmer.length === 0) return null

  const eksakteMatch = stemmer.filter((s) => s.lang === 'da-DK')
  const kandidater = eksakteMatch.length > 0 ? eksakteMatch : stemmer.filter((s) => s.lang.toLowerCase().startsWith('da'))
  if (kandidater.length === 0) return null

  // En stemme der ligger på selve enheden (localService) er mere pålidelig
  // offline end en der kræver internetforbindelse.
  return kandidater.find((s) => s.localService) ?? kandidater[0]
}

/**
 * Siger et ord højt på dansk, hvis tale er slået til OG der findes en dansk
 * stemme på enheden. Findes der ingen dansk stemme, siges der ingenting -
 * det er bedre end at sige ordet forkert på et andet sprog.
 */
export function sigOrd(ord: string, taleAktiveret: boolean): void {
  if (!taleAktiveret) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const stemme = findDanskStemme()
  if (!stemme) return

  window.speechSynthesis.cancel() // afbryd en evt. sætning der stadig taler
  const utterance = new SpeechSynthesisUtterance(ord)
  utterance.lang = 'da-DK'
  utterance.voice = stemme
  window.speechSynthesis.speak(utterance)
}

/**
 * Beder browseren begynde at indlæse stemmelisten, så den forhåbentlig er
 * klar, når personalet trykker på det første piktogram. Stemmelisten
 * indlæses asynkront i browseren, og kaldes bedst tidligt (ved appstart).
 */
export function forbeedTalestemmer(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.getVoices()
}
