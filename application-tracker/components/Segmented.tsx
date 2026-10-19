'use client'

import { useLayoutEffect, useRef } from 'react'

type Option<T extends string> = {
  value: T
  label: React.ReactNode
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
}

/**
 * A segmented control whose selected pill slides between options. An
 * aria-hidden copy of the options, styled as selected, sits on top and is
 * clipped to the selected option, so text color and background move as one.
 */
export function Segmented<T extends string>({ kind, options, value, onChange, ...groupProps }: {
  kind: 'tab' | 'radio'
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label'?: string
  'aria-labelledby'?: string
}) {
  const groupRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const group = groupRef.current
    const copy = copyRef.current
    if (!group || !copy) return
    const place = () => {
      const selected = group.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`)
      if (!selected) return
      const top = selected.offsetTop
      const left = selected.offsetLeft
      const right = group.clientWidth - left - selected.offsetWidth
      const bottom = group.clientHeight - top - selected.offsetHeight
      copy.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round 9px)`
    }
    place()
    // The first placement must not animate in from wherever the clip was.
    const frame = requestAnimationFrame(() => { copy.dataset.ready = '' })
    const observer = new ResizeObserver(place)
    observer.observe(group)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [value])

  return (
    <div {...groupProps} ref={groupRef} role={kind === 'tab' ? 'tablist' : 'radiogroup'} className="segmented">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role={kind}
          {...(kind === 'tab' ? { 'aria-selected': option.value === value } : { 'aria-checked': option.value === value })}
          data-value={option.value}
          onClick={() => onChange(option.value)}
          {...option.buttonProps}
        >
          {option.label}
        </button>
      ))}
      <div ref={copyRef} aria-hidden="true" className="segmented-active">
        {options.map(option => <span key={option.value}>{option.label}</span>)}
      </div>
    </div>
  )
}
