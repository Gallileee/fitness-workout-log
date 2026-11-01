// src/components/Login.jsx
import { useState } from "react"
import { supabase } from "../supabaseClient"
import Icon from "./Icon"

function Login({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setInfo("")
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      const user = data.user
      onLogin({
        userId: user.id,
        email: user.email,
      })
    } catch (err) {
      setError("Chyba při přihlášení: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    setError("")
    setInfo("")
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error

      const user = data.user
      if (!user) {
        setInfo("Registrace proběhla, ale nelze se přihlásit. Zkontroluj email pro ověření.")
        return
      }

      onLogin({
        userId: user.id,
        email: user.email,
      })
    } catch (err) {
      setError("Chyba při registraci: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth-card card card-featured">
        <div className="brand brand-large">
          <span className="brand-mark">
            <Icon name="brand" size={22} />
          </span>
          Fitness tracker
        </div>
        <p className="muted">Přihlas se a zapisuj tréninky, rekordy a týdenní plán.</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="login-password">
              Heslo
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="alert" role="status">
              {info}
            </p>
          )}

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Probíhá…" : "Přihlásit se"}
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={handleRegister} disabled={loading}>
              Vytvořit účet
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default Login
