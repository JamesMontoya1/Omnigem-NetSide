import React, { useEffect, useRef, useState } from 'react'
import { formatTwo } from './formatUtils'

interface Props {
  value: string
  onChange: (v: string) => void
  inputStyle?: React.CSSProperties
  onRawChange?: (v: string) => void
  rightButton?: React.ReactNode
  showPrefix?: boolean
}

export default function CurrencyInput({ value, onChange, inputStyle, onRawChange, rightButton, showPrefix = true }: Props) {
  const prefixed = (v: any) => {
    const f = formatTwo(v)
    if (!f) return ''
    return showPrefix ? `R$ ${f}` : f
  }

  const [display, setDisplay] = useState<string>(prefixed(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setDisplay(prefixed(value))
  }, [value, showPrefix])

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onFocus={() => { focusedRef.current = true; setDisplay(showPrefix ? (value ?? '') : (value ?? '')) }}
        onChange={e => { setDisplay(e.target.value); onChange(e.target.value); if (onRawChange) onRawChange(e.target.value) }}
        onBlur={() => { focusedRef.current = false; const f = formatTwo(display); const out = f ? (showPrefix ? `R$ ${f}` : f) : ''; setDisplay(out); onChange(f) }}
        style={{ ...(inputStyle || {}), paddingRight: rightButton ? 44 : undefined }}
      />
      {rightButton && (
        <div style={{ position: 'absolute', right: 1, top: '50%', transform: 'translateY(-50%)' }}>
          {rightButton}
        </div>
      )}
    </div>
  )
}
