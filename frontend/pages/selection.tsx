import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { PALETTE, btnPrimary, btnCancel } from '../styles/theme'

export default function Selection() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    try {
      const roles = JSON.parse(localStorage.getItem('shifts_roles') || '[]')
      setIsAdmin(Array.isArray(roles) && roles.includes('ADMIN'))
    } catch { setIsAdmin(false) }
  }, [])

  const handleLogout = () => {
    try {
      localStorage.removeItem('shifts_token')
      localStorage.removeItem('shifts_roles')
    } catch (e) {}
    router.push('/login')
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
        width: 420,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 8px 0', color: PALETTE.textPrimary, fontSize: 22 }}>Escolha o sistema</h1>
        <p style={{ margin: '0 0 20px 0', color: PALETTE.textSecondary }}>Selecione uma opção</p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => router.push('/shifts')} style={{ ...btnPrimary, flex: 1 }}>Plantões</button>
          <button onClick={() => router.push('/vacations')} style={{ ...btnPrimary, flex: 1 }}>Férias</button>
          <button onClick={() => router.push('/trips')} style={{ ...btnPrimary, flex: 1 }}>Viagens</button>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
            <button onClick={() => router.push('/users')} style={{ ...btnPrimary, flex: 1 }}>Gerenciar Usuários</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
          <button onClick={handleLogout} style={{ ...btnCancel, flex: 1 }}>Sair</button>
        </div>
      </div>
    </main>
  )
}
