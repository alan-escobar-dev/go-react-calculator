import type { DisplayLines } from '../state/calculatorReducer.ts'

interface DisplayProps {
  lines: DisplayLines
  /** The main line holds an error message instead of a number. */
  error: boolean
}

/**
 * The two-line display. The main line is an <output>, a live region, so
 * screen readers announce results; errors use role="alert" instead.
 */
export function Display({ lines, error }: DisplayProps) {
  const size = textSize(lines.main)
  const mainClass = size ? `display-main display-main--${size}` : 'display-main'

  return (
    <div className="display">
      <p className="display-expression">{lines.expression}</p>
      {error ? (
        <p className={`${mainClass} display-main--error`} role="alert">
          {lines.main}
        </p>
      ) : (
        <output className={mainClass} aria-live="polite">
          {lines.main}
        </output>
      )}
    </div>
  )
}

/** Long text gets a smaller font, so it fits instead of overflowing. */
function textSize(text: string): 'medium' | 'small' | null {
  if (text.length > 20) {
    return 'small'
  }
  if (text.length > 12) {
    return 'medium'
  }
  return null
}
