"use client"

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type PrettySelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type PrettySelectProps = {
  id?: string
  value: string
  options: PrettySelectOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  buttonClassName?: string
  menuClassName?: string
  optionClassName?: string
  disabled?: boolean
  dir?: 'ltr' | 'rtl'
  ariaLabel?: string
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function PrettySelect({
  id,
  value,
  options,
  onValueChange,
  placeholder = 'Select an option',
  className,
  buttonClassName,
  menuClassName,
  optionClassName,
  disabled,
  dir = 'ltr',
  ariaLabel,
}: PrettySelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  )
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null
  const firstEnabledIndex = Math.max(0, options.findIndex((option) => !option.disabled))
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex)
  }, [firstEnabledIndex, open, selectedIndex])

  const moveActive = (direction: 1 | -1) => {
    if (!options.length) return

    let next = activeIndex
    for (let i = 0; i < options.length; i += 1) {
      next = (next + direction + options.length) % options.length
      if (!options[next]?.disabled) {
        setActiveIndex(next)
        return
      }
    }
  }

  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onValueChange(option.value)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cx('relative w-full', className)} dir={dir}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!open) setOpen(true)
            else moveActive(1)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) setOpen(true)
            else moveActive(-1)
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (open) choose(activeIndex)
            else setOpen(true)
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
        className={cx(
          'flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border border-[#E2E6EC] bg-white px-4 text-left text-base text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10 disabled:cursor-not-allowed disabled:opacity-60',
          open && 'border-[#E23B2E] ring-4 ring-[#E23B2E]/10',
          dir === 'rtl' && 'text-right',
          buttonClassName,
        )}
      >
        <span className={cx('min-w-0 truncate', (!selected || selected.label === placeholder) && 'text-[#94A3B8]')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={18}
          className={cx(
            'shrink-0 text-[#94A3B8] transition-transform',
            open && 'rotate-180 text-[#E23B2E]',
          )}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="listbox"
          className={cx(
            'absolute left-0 right-0 z-[70] mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#E2E6EC] bg-white p-1.5 shadow-[0_18px_45px_-18px_rgba(15,23,42,0.35),0_0_0_1px_rgba(255,255,255,0.8)_inset]',
            menuClassName,
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex

            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
                className={cx(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#334155] outline-none transition disabled:cursor-not-allowed disabled:text-[#CBD5E1]',
                  isActive && !option.disabled && 'bg-[#FAFBFC]',
                  isSelected && 'bg-[#FDECE9] text-[#E23B2E]',
                  dir === 'rtl' && 'text-right',
                  optionClassName,
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected && <Check size={16} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
