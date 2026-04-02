import React, { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/router'
import { PALETTE, btnSmall, btnSmallBlue, btnNav } from '../../styles/theme'

type Props = {
  open: boolean
  onClose: () => void
  persistent?: boolean
  onOpenWorkers?: () => void
  onOpenHolidays?: () => void
}

const IconClock = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
)
const IconCalendar = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 3H8v4"/></svg>
)
const IconTrip = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2 16l20-8-9 9-3-6-8-1z"/></svg>
)
const IconSped = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
)
const IconUsers = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H11a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="17" cy="7" r="4"/></svg>
)
const IconBack = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
)
const IconLogout = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/><path d="M9 5v14"/></svg>
)
const IconPunch = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 7v5l3 3"/></svg>
)

function Sidebar({ open, onClose, persistent = false, onOpenWorkers, onOpenHolidays }: Props) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    try {
      setIsAdmin(localStorage.getItem('shifts_isAdmin') === 'true')
      const perms = JSON.parse(localStorage.getItem('shifts_permissions') || '[]')
      setPermissions(Array.isArray(perms) ? perms : [])
    } catch {
      setIsAdmin(false)
      setPermissions([])
    }
  }, [])

  const iconStyle = useMemo<React.CSSProperties>(() => ({ width: 18, height: 18, marginRight: 8, verticalAlign: 'middle' }), [])

  const overlayStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 260,
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
    }),
    [open]
  )

  const persistentStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'relative',
      width: 260,
      height: '100vh',
      transform: 'translateX(0)',
      transition: 'none',
      background: PALETTE.cardBg,
      borderRight: `1px solid ${PALETTE.border}`,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }),
    []
  )

  const isWorkspace = router.pathname === '/workspace'

  const nav = useCallback(
    (path: string) => {
      router.push(path)
      if (!persistent) onClose()
    },
    [router, persistent, onClose]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const routes = ['/shifts', '/vacations', '/trips', '/sped-control', '/time-punches']
    const prefetchAll = () => {
      routes.forEach((r) => {
        try {
          router.prefetch(r)
        } catch {}
      })
    }
    if ((window as any).requestIdleCallback) {
      const id = (window as any).requestIdleCallback(prefetchAll, { timeout: 2000 })
      return () => {
        if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id)
      }
    }
    const t = setTimeout(prefetchAll, 1000)
    return () => clearTimeout(t)
  }, [router])

  const hasPerm = (base: string) => isAdmin || permissions.some(p => p.startsWith(base + '.'))

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
        {hasPerm('shifts') && (
          <button onMouseEnter={() => router.prefetch('/shifts')} onClick={() => nav('/shifts')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconClock style={iconStyle} />
              Plantões
            </span>
          </button>
        )}
        {hasPerm('vacations') && (
          <button onMouseEnter={() => router.prefetch('/vacations')} onClick={() => nav('/vacations')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconCalendar style={iconStyle} />
              Férias
            </span>
          </button>
        )}
        {hasPerm('trips') && (
          <button onMouseEnter={() => router.prefetch('/trips')} onClick={() => nav('/trips')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconTrip style={iconStyle} />
              Viagens
            </span>
          </button>
        )}
        {hasPerm('sped_control') && (
          <button onMouseEnter={() => router.prefetch('/sped-control')} onClick={() => nav('/sped-control')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconSped style={iconStyle} />
              Controle SPED
            </span>
          </button>
        )}
        {hasPerm('time_punches') && (
          <button onMouseEnter={() => router.prefetch('/time-punches')} onClick={() => nav('/time-punches')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconPunch style={iconStyle} />
              Registro de Ponto
            </span>
          </button>
        )}
        {hasPerm('users') && (
          <button onMouseEnter={() => router.prefetch('/users')} onClick={() => nav('/users')} style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconUsers style={iconStyle} />
              Gerenciar Usuários
            </span>
          </button>
        )}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8 }}>
          {hasPerm('workers') && (
            <button
              type="button"
              onClick={() => {
                if (onOpenWorkers) {
                  onOpenWorkers()
                  if (!persistent) onClose()
                } else {
                  nav('/users')
                }
              }}
              style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IconUsers style={iconStyle} />
                Trabalhadores
              </span>
            </button>
          )}

          {hasPerm('holidays') && (
            <button
              type="button"
              onClick={() => {
                if (onOpenHolidays) {
                  onOpenHolidays()
                  if (!persistent) onClose()
                } else {
                  nav('/vacations')
                }
              }}
              style={{ ...btnSmall, textAlign: 'left', fontSize: 15 }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IconCalendar style={iconStyle} />
                Feriados
              </span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!isWorkspace && (
            <button onMouseEnter={() => router.prefetch('/workspace')} onClick={() => nav('/workspace')} style={{ ...btnNav, background: 'transparent', color: '#FF3B30', border: '2px solid #FF3B30', fontWeight: 700, fontSize: 15 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IconBack style={iconStyle} />
                Voltar
              </span>
            </button>
          )}

          <button
            onMouseEnter={() => router.prefetch('/login')}
            onClick={() => {
              try {
                localStorage.removeItem('shifts_token')
                localStorage.removeItem('shifts_permissions')
                localStorage.removeItem('shifts_isAdmin')
              } catch (e) {}
              router.push('/login')
              if (!persistent) onClose()
            }}
            style={{ ...btnSmallBlue, flex: 1, fontSize: 15 }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconLogout style={iconStyle} />
              Sair
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default memo(Sidebar)
