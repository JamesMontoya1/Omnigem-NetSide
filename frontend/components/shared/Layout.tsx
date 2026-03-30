import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Sidebar from './Sidebar'
import WorkersContent from './WorkersContent'
import HolidaysContent from './HolidaysContent'
import { PALETTE, btnSmall } from '../../styles/theme'

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const persistent = router.pathname === '/workspace'

  const [showWorkers, setShowWorkers] = useState(false)
  const [showHolidays, setShowHolidays] = useState(false)

  useEffect(() => {
    setOpen(router.pathname === '/workspace')
  }, [router.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!persistent && e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [persistent])

  const openWorkers = () => setShowWorkers(true)
  const closeWorkers = () => setShowWorkers(false)
  const openHolidays = () => setShowHolidays(true)
  const closeHolidays = () => setShowHolidays(false)

  const showBackdrop = open && !persistent

  if (persistent) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: PALETTE.background, color: PALETTE.textPrimary }}>
        <Sidebar open={true} onClose={() => {}} persistent onOpenWorkers={openWorkers} onOpenHolidays={openHolidays} />
        <div style={{ flex: 1 }}>{children}</div>

        {showWorkers && (
          <div
            style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeWorkers() }}
          >
            <div style={{ width: 920, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: PALETTE.cardBg, padding: 20, borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Trabalhadores</h3>
                <button type="button" onClick={closeWorkers} style={btnSmall}>✕ Fechar</button>
              </div>
              <WorkersContent />
            </div>
          </div>
        )}

        {showHolidays && (
          <div
            style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeHolidays() }}
          >
            <div style={{ width: 700, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: PALETTE.cardBg, padding: 20, borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Feriados</h3>
                <button type="button" onClick={closeHolidays} style={btnSmall}>✕ Fechar</button>
              </div>
              <HolidaysContent />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Sidebar open={open} onClose={() => setOpen(false)} onOpenWorkers={openWorkers} onOpenHolidays={openHolidays} />

      {showBackdrop && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1050 }}
        />
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          style={{ position: 'fixed', left: 20, top: 12, zIndex: 1200, ...btnSmall, width: 32, height: 32, padding: 0 }}
        >
          ☰
        </button>
      )}

      <main style={{ minHeight: '100vh', background: PALETTE.background, color: PALETTE.textPrimary }}>{children}</main>

      {showWorkers && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeWorkers() }}
        >
          <div style={{ width: 920, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: PALETTE.cardBg, padding: 20, borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Trabalhadores</h3>
              <button type="button" onClick={closeWorkers} style={btnSmall}>✕ Fechar</button>
            </div>
            <WorkersContent />
          </div>
        </div>
      )}

      {showHolidays && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeHolidays() }}
        >
          <div style={{ width: 700, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: PALETTE.cardBg, padding: 20, borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Feriados</h3>
              <button type="button" onClick={closeHolidays} style={btnSmall}>✕ Fechar</button>
            </div>
            <HolidaysContent />
          </div>
        </div>
      )}
    </>
  )
}
