type MakeDraggableOptions = {
  handleSelector?: string
  margin?: number
  handleExtraHeight?: number
  onFocus?: () => void
  onPositionChange?: (pos: { left: number; top: number }) => void
}

const disposers = new WeakMap<HTMLElement, () => void>()

export function makeModalDraggable(modal: HTMLElement | null, options: MakeDraggableOptions = {}) {
  if (typeof window === 'undefined') return () => {}
  if (!modal) return () => {}
  if (disposers.has(modal)) return disposers.get(modal)!

  const handleSelector = options.handleSelector ?? '[data-draggable-handle]'
  const margin = typeof options.margin === 'number' ? options.margin : 8

  function ensurePositioning() {
    const rect = modal.getBoundingClientRect()
    const computed = window.getComputedStyle(modal)
    if (computed.position === 'static') modal.style.position = 'fixed'
    if (!modal.style.left && !modal.style.top) {
      const left = Math.max(margin, (window.innerWidth - rect.width) / 2)
      const top = Math.max(margin, (window.innerHeight - rect.height) / 2)
      modal.style.left = `${Math.round(left)}px`
      modal.style.top = `${Math.round(top)}px`
      modal.style.transform = 'none'
    } else {
      modal.style.transform = 'none'
    }
  }

  ensurePositioning()

  let dragging: {
    startX: number
    startY: number
    startLeft: number
    startTop: number
    panelWidth: number
    panelHeight: number
    handle: HTMLElement | null
  } | null = null

  const handleEls = Array.from(modal.querySelectorAll<HTMLElement>(handleSelector))
  const listeners: Array<{ el: Element; fn: EventListener }> = []

  function onPointerDown(e: PointerEvent) {
    if ((e as any).button !== undefined && (e as any).button !== 0) return
    e.preventDefault()
    ensurePositioning()
    const rect = modal.getBoundingClientRect()
    dragging = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseFloat(modal.style.left || `${rect.left}`),
      startTop: parseFloat(modal.style.top || `${rect.top}`),
      panelWidth: rect.width,
      panelHeight: rect.height,
      handle: e.currentTarget instanceof HTMLElement ? e.currentTarget : null,
    }
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    if (dragging.handle) dragging.handle.style.cursor = 'grabbing'
    modal.style.zIndex = '2500'
    options.onFocus?.()
  }

  function onPointerMove(ev: PointerEvent) {
    if (!dragging) return
    const dx = ev.clientX - dragging.startX
    const dy = ev.clientY - dragging.startY
    const maxLeft = window.innerWidth - dragging.panelWidth - margin
    const maxTop = window.innerHeight - dragging.panelHeight - margin
    let newLeft = Math.round(dragging.startLeft + dx)
    let newTop = Math.round(dragging.startTop + dy)
    newLeft = Math.max(margin, Math.min(newLeft, maxLeft))
    newTop = Math.max(margin, Math.min(newTop, maxTop))
    modal.style.left = `${newLeft}px`
    modal.style.top = `${newTop}px`
    options.onPositionChange?.({ left: newLeft, top: newTop })
  }

  function onPointerUp() {
    if (dragging && dragging.handle) dragging.handle.style.cursor = 'grab'
    dragging = null
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
  }

  // helper to check for interactive elements that should not start a drag
  function isInteractive(el: Element | null) {
    if (!el) return false
    return !!el.closest('button, [role="button"], a, input, textarea, select, label, [contenteditable]')
  }

  // if the modal has explicit handle elements but we want to extend the vertical area
  // where dragging can start, add a pointerdown listener on the modal that checks
  // whether the click is within the extended top region.
  const extraHeight = typeof options.handleExtraHeight === 'number' ? options.handleExtraHeight : 12
  if (handleEls.length > 0 && extraHeight > 0) {
    const fnModalPointerDown = (e: Event) => {
      const pe = e as PointerEvent
      if ((pe as any).button !== undefined && (pe as any).button !== 0) return
      if (pe.defaultPrevented) return
      ensurePositioning()
      const rect = modal.getBoundingClientRect()
      const handleBottom = Math.max(rect.top, ...handleEls.map(h => h.getBoundingClientRect().bottom))
      if (pe.clientY <= handleBottom + extraHeight) {
        const target = e.target as Element | null
        if (!target) return
        if (target.closest(handleSelector)) return
        if (isInteractive(target)) return
        onPointerDown(pe)
      }
    }
    modal.addEventListener('pointerdown', fnModalPointerDown)
    listeners.push({ el: modal, fn: fnModalPointerDown })

    // change cursor when hovering the extended area for better affordance
    const fnModalPointerMove = (e: Event) => {
      const pe = e as PointerEvent
      const rect = modal.getBoundingClientRect()
      const handleBottom = Math.max(rect.top, ...handleEls.map(h => h.getBoundingClientRect().bottom))
      if (pe.clientY <= handleBottom + extraHeight) {
        modal.style.cursor = 'grab'
      } else {
        modal.style.cursor = ''
      }
    }
    const fnModalPointerLeave = (e: Event) => { modal.style.cursor = '' }
    modal.addEventListener('pointermove', fnModalPointerMove)
    modal.addEventListener('pointerleave', fnModalPointerLeave)
    listeners.push({ el: modal, fn: fnModalPointerMove })
    listeners.push({ el: modal, fn: fnModalPointerLeave })
  }

  if (handleEls.length > 0) {
    handleEls.forEach(h => {
      h.setAttribute('data-draggable-handle', 'true')
      h.style.cursor = 'grab'
      const fn = (e: Event) => onPointerDown(e as PointerEvent)
      h.addEventListener('pointerdown', fn)
      listeners.push({ el: h, fn })
    })
  } else {
    modal.style.cursor = 'grab'
    const fn = (e: Event) => onPointerDown(e as PointerEvent)
    modal.addEventListener('pointerdown', fn)
    listeners.push({ el: modal, fn })
  }

  const dispose = () => {
    listeners.forEach(l => l.el.removeEventListener('pointerdown', l.fn))
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
    disposers.delete(modal)
  }

  disposers.set(modal, dispose)
  return dispose
}

export function initDraggableModals(root: Document | Element = document, options: { handleSelector?: string; margin?: number; handleExtraHeight?: number } = {}) {
  if (typeof window === 'undefined') return () => {}
  const container: Element | Document = root || document
  const nodes = ('querySelectorAll' in container) ? container.querySelectorAll('.draggable-modal') : document.querySelectorAll('.draggable-modal')
  const disposers: Array<() => void> = []
  nodes.forEach((n) => {
    disposers.push(makeModalDraggable(n as HTMLElement, { handleSelector: options.handleSelector, margin: options.margin, handleExtraHeight: options.handleExtraHeight }))
  })
  return () => disposers.forEach(d => d())
}
