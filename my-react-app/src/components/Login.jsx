// src/components/Login.jsx
import { useState } from "react"

function Login({ onLogin, onRegister }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmitLogin = (e) => {
    e.preventDefault()
    onLogin(email, password)
  }

  const handleSubmitRegister = (e) => {
    e.preventDefault()
    onRegister(email, password)
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
      <h2>Přihlášení</h2>
      <form>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Heslo</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="submit"
            className="btn"
            onClick={handleSubmitLogin}
          >
            Login
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleSubmitRegister}
          >
            Registrovat
          </button>
        </div>
      </form>
    </div>
  )
}

export default Login
