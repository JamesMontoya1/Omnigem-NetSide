import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { PALETTE } from '../../styles/theme'
import WorkersContent from '../shared/WorkersContent'
import HolidaysContent from '../shared/HolidaysContent'
import AssignmentsContent from './AssignmentsContent'

export type TabKey = 'dashboard' | 'workers' | 'holidays' | 'assignments' | 'reports';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '◻' },
  { key: 'workers', label: 'Trabalhadores', icon: '👷' },
  { key: 'holidays', label: 'Feriados', icon: '🎉' },
  { key: 'assignments', label: 'Atribuições', icon: '📋' },
  { key: 'reports', label: 'Relatórios', icon: '📊' },
];

function isTabKey(value: string): value is TabKey {
  return TABS.some(t => t.key === value)
}

export default function DashboardLayout({ initialTab, dashboardContent }: {
  initialTab?: TabKey;
  dashboardContent?: ReactNode;
}) {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const initialFromQuery = typeof router.query.tab === 'string' && isTabKey(router.query.tab)
    ? router.query.tab
    : (initialTab ?? 'dashboard')
  const [activeTab, setActiveTab] = useState<TabKey>(initialFromQuery)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('shifts_token') : null
    let storedRoles: string[] = []
    try { storedRoles = JSON.parse(localStorage.getItem('shifts_roles') || '[]') } catch {}
    if (token === null && storedRoles.length === 0) {
      router.push('/login')
      return
    }
    setRole(Array.isArray(storedRoles) && storedRoles.includes('ADMIN') ? 'admin' : 'guest')
  }, [router])

  useEffect(() => {
    const queryTab = router.query.tab
    if (typeof queryTab === 'string' && isTabKey(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab)
    }
  }, [router.query.tab, activeTab])

  function logout() {
    localStorage.removeItem('shifts_token')
    localStorage.removeItem('shifts_roles')
    router.push('/login')
  }

  const isAdmin = role === 'admin';

  function renderContent() {
    switch (activeTab) {
      case 'workers': return <WorkersContent readOnly={!isAdmin} />;
      case 'holidays': return <HolidaysContent readOnly={!isAdmin} />;
      case 'assignments': return <AssignmentsContent readOnly={!isAdmin} />;
      default: return dashboardContent ?? null;
    }
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
        <h2 style={{ margin: '0 0 4px 0', fontSize: 20, color: PALETTE.textPrimary }}>Plantões</h2>
        <p style={{ margin: '0 0 20px 0', fontSize: 12, color: PALETTE.textSecondary }}>
          Role: <strong style={{ color: PALETTE.primary }}>{role}</strong>
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {/* Abas internas */}
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  router.push({ pathname: '/shifts', query: { tab: tab.key } }, undefined, { shallow: true })
                }}
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
            );
          })}

          {/* Separador */}
          <div style={{ height: 1, background: PALETTE.border, margin: '8px 0' }} />

          {/* Link externo para o calendário */}
          <a
            href="/shifts/calendar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              color: PALETTE.textSecondary,
              background: 'transparent',
              fontWeight: 400,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>📅</span>
            Calendário / Rodízios
          </a>
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
        {renderContent()}
      </main>
    </div>
  )
}
