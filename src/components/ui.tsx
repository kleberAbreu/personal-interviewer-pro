import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div onClick={onClick} className={`bg-slate-900/70 border border-slate-800 rounded-2xl backdrop-blur-sm print-card ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
      {icon}
      {children}
    </h3>
  )
}

export function Badge({ children, tone = 'indigo' }: { children: ReactNode; tone?: 'indigo' | 'green' | 'amber' | 'red' | 'slate' }) {
  const tones = {
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  const variants = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50 disabled:bg-slate-700 disabled:text-slate-400',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectMenuPosition {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
  leadingIcon,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  leadingIcon?: ReactNode
}) {
  const listboxId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuPosition, setMenuPosition] = useState<SelectMenuPosition | null>(null)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selected = options[selectedIndex]

  const updateMenuPosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 8
    const gap = 6
    const availableBelow = window.innerHeight - rect.bottom - gap - viewportPadding
    const availableAbove = rect.top - gap - viewportPadding
    const placeBelow = availableBelow >= 160 || availableBelow >= availableAbove
    const availableHeight = placeBelow ? availableBelow : availableAbove
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2)
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - viewportPadding - width,
    )

    setMenuPosition({
      left,
      width,
      maxHeight: Math.max(96, Math.min(280, availableHeight)),
      ...(placeBelow
        ? { top: rect.bottom + gap }
        : { bottom: window.innerHeight - rect.top + gap }),
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const handleViewportChange = () => updateMenuPosition()

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open])

  const openMenu = (index = selectedIndex) => {
    setActiveIndex(index)
    setOpen(true)
  }

  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const move = (direction: 1 | -1) => {
    if (!options.length) return
    let next = activeIndex
    do {
      next = (next + direction + options.length) % options.length
    } while (options[next]?.disabled && next !== activeIndex)
    setActiveIndex(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openMenu()
      else move(event.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const index = event.key === 'Home'
        ? options.findIndex((option) => !option.disabled)
        : options.findLastIndex((option) => !option.disabled)
      if (index >= 0) {
        if (!open) openMenu(index)
        else setActiveIndex(index)
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(activeIndex)
      else openMenu()
      return
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'Tab') setOpen(false)
  }

  const menuStyle: CSSProperties | undefined = menuPosition
    ? {
        left: menuPosition.left,
        width: menuPosition.width,
        maxHeight: menuPosition.maxHeight,
        top: menuPosition.top,
        bottom: menuPosition.bottom,
      }
    : undefined

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${inputCls} min-h-10 flex items-center justify-between gap-2 text-left ${className}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        title={selected?.label}
        onClick={() => {
          if (open) setOpen(false)
          else openMenu()
        }}
        onKeyDown={handleKeyDown}
      >
        <span className="flex min-w-0 items-center gap-2">
          {leadingIcon && <span className="shrink-0 text-slate-500">{leadingIcon}</span>}
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && menuStyle && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[100] overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 p-1 shadow-2xl shadow-black/60"
          style={menuStyle}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex
            return (
              <button
                key={option.value}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive ? 'bg-slate-700 text-white' : 'text-slate-200 hover:bg-slate-800'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span className="truncate">{option.label}</span>
                <Check className={`w-4 h-4 shrink-0 text-indigo-400 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
