'use client'

/**
 * Interrupteur on/off contrôlé, à la charte KOMO. Piste terracotta quand actif.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-terracotta' : 'bg-track'
      }`}
    >
      <span
        className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-transform ${
          checked ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}
