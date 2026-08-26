// Vises i stedet for HELE appen, indtil enheden er logget ind - se
// AuthProvider.tsx. Personalet logger kun ind én gang pr. enhed; herefter
// husker enheden det selv.

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './AuthProvider'
import knap from '../../styles/buttons.module.css'
import editStyles from '../edit/EditSheet.module.css'
import styles from './LoginScreen.module.css'

export function LoginScreen() {
  const { logInd, loginFejl } = useAuth()
  const [email, setEmail] = useState('')
  const [adgangskode, setAdgangskode] = useState('')
  const [loggerInd, setLoggerInd] = useState(false)

  async function haandterSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !adgangskode) return
    setLoggerInd(true)
    await logInd(email.trim(), adgangskode)
    setLoggerInd(false)
  }

  return (
    <div className={styles.side}>
      <form className={styles.boks} onSubmit={(e) => void haandterSubmit(e)}>
        <h1 className={styles.titel}>Piktogram app</h1>
        <p className={styles.hjaelp}>Log ind med den fælles adgangskode for at bruge appen på denne enhed.</p>

        <label className={editStyles.felt}>
          <span>E-mail</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={editStyles.input}
            autoFocus
          />
        </label>

        <label className={editStyles.felt}>
          <span>Adgangskode</span>
          <input
            type="password"
            autoComplete="current-password"
            value={adgangskode}
            onChange={(e) => setAdgangskode(e.target.value)}
            className={editStyles.input}
          />
        </label>

        {loginFejl && <p className={styles.fejl}>{loginFejl}</p>}

        <button type="submit" className={knap.primaer} disabled={loggerInd || !email.trim() || !adgangskode}>
          {loggerInd ? 'Logger ind...' : 'Log ind'}
        </button>
      </form>
    </div>
  )
}
