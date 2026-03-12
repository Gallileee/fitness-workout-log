// src/components/Login.jsx
import { useState } from "react"
import { supabase } from "../supabaseClient"

function Login({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
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
      alert("Chyba při přihlášení: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error

      const user = data.user
      if (!user) {
        alert(
          "Registrace proběhla, ale nelze se přihlásit. Zkontroluj email pro ověření."
        )
        return
      }

      onLogin({
        userId: user.id,
        email: user.email,
      })
    } catch (err) {
      alert("Chyba při registraci: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Přihlášení</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label">Heslo</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Probíhá..." : "Přihlásit se"}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleRegister}
            disabled={loading}
          >
            Registrovat
          </button>
        </div>
      </form>
    </div>
  )
}

export default Login
