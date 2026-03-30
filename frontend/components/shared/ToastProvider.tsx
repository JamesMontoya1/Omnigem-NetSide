import React, { createContext, useCallback, useContext, useState } from 'react'
import { PALETTE } from '../../styles/theme'

type ToastPosition = 'top-right' | 'top-left' | 'bottom-left' | 'bottom-right'
type ToastType = 'info' | 'success' | 'error' | 'warning'

type ToastOffset = { top?: number; right?: number; bottom?: number; left?: number }

type Toast = { id: number; message: string; type: ToastType; position?: ToastPosition; offset?: ToastOffset }

type AddToastOptions = ToastPosition | { position?: ToastPosition; offset?: ToastOffset }

type ToastContextValue = {
  addToast: (message: string, type?: ToastType, timeout?: number, positionOrOptions?: AddToastOptions) => number
  removeToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => 0,
  removeToast: () => {},
})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const [containerOffsets, setContainerOffsets] = useState<Record<ToastPosition, ToastOffset>>({
    'top-right': { top: 16, right: 16 },
    'top-left': { top: 16, left: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
  })

  const removeToast = useCallback((id: number) => {
    setToasts((s) => s.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info', timeout = 5000, positionOrOptions: AddToastOptions = 'top-right') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)

    let position: ToastPosition = 'top-right'
    let offset: ToastOffset | undefined = undefined

    if (typeof positionOrOptions === 'string') {
      position = positionOrOptions
    } else {
      position = positionOrOptions.position ?? 'top-right'
      offset = positionOrOptions.offset
    }

    if (offset) {
      setContainerOffsets((s) => ({ ...s, [position]: { ...s[position], ...offset } }))
    }

    const t: Toast = { id, message, type, position, offset }
    setToasts((s) => [t, ...s])
    if (timeout > 0) setTimeout(() => removeToast(id), timeout)
    return id
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Top-left */}
      <div style={{ position: 'fixed', left: containerOffsets['top-left'].left ?? 16, top: containerOffsets['top-left'].top ?? 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.filter(t => (t.position ?? 'top-right') === 'top-left').map((t) => (
          <div key={t.id} style={{ minWidth: 260, maxWidth: 380, padding: '10px 12px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.2)', color: '#fff', background: t.type === 'error' ? PALETTE.error : t.type === 'success' ? PALETTE.success : t.type === 'warning' ? PALETTE.warning : t.type === 'info' ? PALETTE.info : PALETTE.primary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13 }}>{t.message}</div>
              <button onClick={() => removeToast(t.id)} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Top-right */}
      <div style={{ position: 'fixed', right: containerOffsets['top-right'].right ?? 16, top: containerOffsets['top-right'].top ?? 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.filter(t => (t.position ?? 'top-right') === 'top-right').map((t) => (
          <div key={t.id} style={{ minWidth: 260, maxWidth: 380, padding: '10px 12px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.2)', color: '#fff', background: t.type === 'error' ? PALETTE.error : t.type === 'success' ? PALETTE.success : t.type === 'warning' ? PALETTE.warning : t.type === 'info' ? PALETTE.info : PALETTE.primary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13 }}>{t.message}</div>
              <button onClick={() => removeToast(t.id)} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom-left */}
      <div style={{ position: 'fixed', left: containerOffsets['bottom-left'].left ?? 16, bottom: containerOffsets['bottom-left'].bottom ?? 16, zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8, alignItems: 'flex-start' }}>
        {toasts.filter(t => t.position === 'bottom-left').map((t) => (
          <div key={t.id} style={{ minWidth: 260, maxWidth: 380, padding: '10px 12px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.2)', color: '#fff', background: t.type === 'error' ? PALETTE.error : t.type === 'success' ? PALETTE.success : t.type === 'warning' ? PALETTE.warning : t.type === 'info' ? PALETTE.info : PALETTE.primary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13 }}>{t.message}</div>
              <button onClick={() => removeToast(t.id)} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom-right */}
      <div style={{ position: 'fixed', right: containerOffsets['bottom-right'].right ?? 16, bottom: containerOffsets['bottom-right'].bottom ?? 16, zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8, alignItems: 'flex-end' }}>
        {toasts.filter(t => t.position === 'bottom-right').map((t) => (
          <div key={t.id} style={{ minWidth: 260, maxWidth: 380, padding: '10px 12px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.2)', color: '#fff', background: t.type === 'error' ? PALETTE.error : t.type === 'success' ? PALETTE.success : t.type === 'warning' ? PALETTE.warning : t.type === 'info' ? PALETTE.info : PALETTE.primary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13 }}>{t.message}</div>
              <button onClick={() => removeToast(t.id)} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
