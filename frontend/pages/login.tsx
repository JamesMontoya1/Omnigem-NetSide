import { useState } from 'react'
import { useRouter } from 'next/router'
import { PALETTE, btnPrimary, btnCancel, inputStyle } from '../styles/theme'
import { API_BASE } from '../config/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e:any) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.message || 'Credenciais inválidas')
        return
      }
      const data = await res.json()
      localStorage.setItem('shifts_token', data.accessToken)
      localStorage.setItem('shifts_permissions', JSON.stringify(data.permissions ?? []))
      localStorage.setItem('shifts_isAdmin', String(data.isAdmin ?? false))
      router.push('/workspace')
    } catch (err) {
      setError('Erro de conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  function handleGuestAccess() {
    localStorage.setItem('shifts_token', '')
    localStorage.setItem('shifts_permissions', JSON.stringify([]))
    localStorage.setItem('shifts_isAdmin', 'false')
    router.push('/workspace')
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: PALETTE.background,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: PALETTE.cardBg,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 12,
        padding: '40px 36px',
        width: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <h1 style={{ margin: '0 0 8px 0', color: PALETTE.textPrimary, fontSize: 24 }}>Login</h1>
        <p style={{ margin: '0 0 24px 0', color: PALETTE.textSecondary, fontSize: 14 }}>Acesse o sistema de plantões</p>
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Usuário</label>
            <input
              placeholder="admin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Senha</label>
            <input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={loading} style={{ ...btnPrimary, flex: 1, opacity: loading ? 0.6 : 1 }}>{loading ? 'Entrando...' : 'Entrar'}</button>
            <button type="button" onClick={handleGuestAccess} style={{ ...btnCancel, flex: 1, fontSize: 13 }}>Acessar como convidado</button>
          </div>
        </form>
        {error && <p style={{ color: PALETTE.error, fontSize: 13, marginTop: 12, padding: '8px 10px', background: `${PALETTE.error}18`, borderRadius: 6, border: `1px solid ${PALETTE.error}44` }}>{error}</p>}
      </div>
    </main>
  )
}
