import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { PALETTE } from '../../styles/theme'

export type FeriasTab = 'dashboard' | 'list'

const TABS: { key: FeriasTab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Painel', icon: '📊' },
  { key: 'list', label: 'Lançamentos', icon: '📋' },
]

export default function FeriasLayout({
  activeTab,
  onTabChange,
  isAdmin,
  children,
  headerActions,
}: {
  activeTab: FeriasTab
  onTabChange: (tab: FeriasTab) => void
  isAdmin: boolean
  children: ReactNode
  headerActions?: ReactNode
}) {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    let storedRoles: string[] = []
    try { storedRoles = JSON.parse(localStorage.getItem('plantoes_roles') || '[]') } catch {}
    setRole(Array.isArray(storedRoles) && storedRoles.includes('ADMIN') ? 'admin' : 'guest')
  }, [])

  function logout() {
    localStorage.removeItem('plantoes_token')
    localStorage.removeItem('plantoes_roles')
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: PALETTE.background, fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{
        width: 240,
        padding: 20,
        backgroundColor: PALETTE.backgroundSecondary,
        borderRight: `1px solid ${PALETTE.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'auto',
        flexShrink: 0,
      }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: 20, color: PALETTE.textPrimary }}>Férias</h2>
        <p style={{ margin: '0 0 20px 0', fontSize: 12, color: PALETTE.textSecondary }}>
          Role: <strong style={{ color: PALETTE.primary }}>{role}</strong>
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  color: isActive ? PALETTE.textPrimary : PALETTE.textSecondary,
                  background: isActive ? PALETTE.hoverBg : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}

          {/* Actions within sidebar when admin */}
          {headerActions && (
            <>
              <div style={{ height: 1, background: PALETTE.border, margin: '8px 0' }} />
              {headerActions}
            </>
          )}
        </nav>

        <div style={{ paddingTop: 16, borderTop: `1px solid ${PALETTE.border}` }}>
          <button
            onClick={() => router.push('/selection')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              color: PALETTE.textSecondary,
              border: `1px solid ${PALETTE.border}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            Voltar para seleção
          </button>

          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              color: PALETTE.error,
              border: `1px solid ${PALETTE.error}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Sair
          </button>
        </div>
      </aside>
      <main style={{
        flex: 1,
        padding: 24,
        color: PALETTE.textPrimary,
        overflow: 'auto',
      }}>
        {children}
      </main>
    </div>
  )
}
