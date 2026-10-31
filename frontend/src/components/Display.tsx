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
  return (
    <div className="display">
      <p className="display-expression">{lines.expression}</p>
      {error ? (
        <p className="display-main" role="alert">
          {lines.main}
        </p>
      ) : (
        <output className="display-main" aria-live="polite">
          {lines.main}
        </output>
      )}
    </div>
  )
}
