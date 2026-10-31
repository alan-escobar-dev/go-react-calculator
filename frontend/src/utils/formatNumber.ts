/** Significant digits shown: enough for any number typed on the keypad. */
const SIGNIFICANT_DIGITS = 15

/**
 * Formats a number for the display. Rounding to 15 significant digits hides
 * binary floating-point noise (0.30000000000000004 becomes "0.3") without
 * hiding any digit the user could type. Very large or very small numbers use
 * exponent notation, so no made-up trailing digits are shown.
 */
export function formatNumber(value: number): string {
  const rounded = Number(value.toPrecision(SIGNIFICANT_DIGITS))
  // Rounding up can push the largest float64 values past the limit.
  const shown = Number.isFinite(rounded) ? rounded : value
  if (shown === 0) {
    return '0' // also turns -0 into "0"
  }
  const magnitude = Math.abs(shown)
  if (magnitude >= 1e15 || magnitude < 1e-6) {
    return shown.toExponential()
  }
  return String(shown)
}
