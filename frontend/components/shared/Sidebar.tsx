import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { PALETTE, btnSmall, btnSmallBlue, btnNav } from '../../styles/theme'

type Props = {
  open: boolean
  onClose: () => void
  persistent?: boolean
  onOpenWorkers?: () => void
  onOpenHolidays?: () => void
}

export default function Sidebar({ open, onClose, persistent = false, onOpenWorkers, onOpenHolidays }: Props) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    try {
      const roles = JSON.parse(localStorage.getItem('shifts_roles') || '[]')
      setIsAdmin(Array.isArray(roles) && roles.includes('ADMIN'))
    } catch {
      setIsAdmin(false)
    }
  }, [])

  const nav = (path: string) => {
    router.push(path)
    if (!persistent) onClose()
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    transform: open ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 220ms ease',
    background: PALETTE.cardBg,
    borderRight: `1px solid ${PALETTE.border}`,
    zIndex: 1100,
    padding: 16,
    boxShadow: '2px 0 16px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  }

  const persistentStyle: React.CSSProperties = {
    position: 'relative',
    width: 300,
    height: '100vh',
    transform: 'translateX(0)',
    transition: 'none',
    background: PALETTE.cardBg,
    borderRight: `1px solid ${PALETTE.border}`,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  }

  const isWorkspace = router.pathname === '/workspace'
  const iconStyle: React.CSSProperties = { width: 18, height: 18, marginRight: 8, verticalAlign: 'middle' }

  return (
    <aside aria-hidden={persistent ? false : !open} style={persistent ? persistentStyle : overlayStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img
          src="https://images2.imgbox.com/c6/a3/Xsc0Qn8X_o.png"
          alt="Omnigem NETSide"
          style={{ height: 80, objectFit: 'contain' }}
        />
      </div>

      <div style={{ height: 1, background: PALETTE.border, margin: '8px 0' }} />

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <button onClick={() => nav('/shifts')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Plantões
          </span>
        </button>
        <button onClick={() => nav('/vacations')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 3H8v4"/></svg>
            Férias
          </span>
        </button>
        <button onClick={() => nav('/trips')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2 16l20-8-9 9-3-6-8-1z"/></svg>
            Viagens
          </span>
        </button>
        {isAdmin && (
          <button onClick={() => nav('/users')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H11a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="17" cy="7" r="4"/></svg>
              Gerenciar Usuários
            </span>
          </button>
        )}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              try { onOpenWorkers?.() } catch (e) {}
              if (!persistent) onClose()
            }}
            style={{ ...btnSmall, flex: 1, fontSize: 15 }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>
              Trabalhadores
            </span>
          </button>
          <button
            onClick={() => {
              try { onOpenHolidays?.() } catch (e) {}
              if (!persistent) onClose()
            }}
            style={{ ...btnSmall, flex: 1, fontSize: 15 }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Feriados
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!isWorkspace && (
            <button onClick={() => nav('/workspace')} style={{ ...btnNav, background: 'transparent', color: '#FF3B30', border: '2px solid #FF3B30', fontWeight: 700, fontSize: 15 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Voltar
              </span>
            </button>
          )}

          <button
            onClick={() => {
              try {
                localStorage.removeItem('shifts_token')
                localStorage.removeItem('shifts_roles')
              } catch (e) {}
              router.push('/login')
              if (!persistent) onClose()
            }}
            style={{ ...btnSmallBlue, flex: 1, fontSize: 15 }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/><path d="M9 5v14"/></svg>
              Sair
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
