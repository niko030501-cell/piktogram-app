// Holder styr på, om denne enhed er logget ind til sky-synkronisering.
// Login er en spærre UDEN OM resten af appen (se App.tsx) - er man ikke
// logget ind, vises intet som helst, hverken billeder eller navne. Det er
// noget andet end Leyla-tilstand, som kun spærrer for redigering, efter
// man allerede er logget ind.
//
// Er appen slet ikke sat op med en sky-forbindelse (se supabaseClient.ts),
// kræves der intet login - appen virker så bare rent lokalt, som før denne
// funktion fandtes.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { harSkyForbindelse, supabase } from '../../sync/supabaseClient'

interface AuthContextVaerdi {
  klarTilBrug: boolean
  loggetInd: boolean
  loginFejl: string | null
  logInd: (email: string, adgangskode: string) => Promise<void>
  logUd: () => Promise<void>
}

const AuthContext = createContext<AuthContextVaerdi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Uden sky-forbindelse er der intet at vente på - appen er "klar" med det samme.
  const [klarTilBrug, setKlarTilBrug] = useState(!harSkyForbindelse)
  const [session, setSession] = useState<Session | null>(null)
  const [loginFejl, setLoginFejl] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    // Læses fra enhedens egen lager, ikke over nettet - virker derfor også
    // helt uden forbindelse, hvis man allerede har logget ind før.
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setKlarTilBrug(true)
    })

    const { data: lytter } = supabase.auth.onAuthStateChange((_haendelse, nySession) => {
      setSession(nySession)
    })
    return () => lytter.subscription.unsubscribe()
  }, [])

  async function logInd(email: string, adgangskode: string) {
    if (!supabase) return
    setLoginFejl(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: adgangskode })
    if (error) setLoginFejl('Forkert e-mail eller adgangskode.')
  }

  async function logUd() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const vaerdi: AuthContextVaerdi = {
    klarTilBrug,
    loggetInd: !harSkyForbindelse || session !== null,
    loginFejl,
    logInd,
    logUd,
  }

  return <AuthContext.Provider value={vaerdi}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextVaerdi {
  const vaerdi = useContext(AuthContext)
  if (!vaerdi) throw new Error('useAuth skal bruges inden i en <AuthProvider>')
  return vaerdi
}
