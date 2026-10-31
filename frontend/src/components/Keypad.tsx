import type { BinaryOperation } from '../api/calculator.ts'
import type { CalculatorAction, Digit } from '../state/calculatorReducer.ts'

/** Visual group of a key; each group has its own colors in index.css. */
type Variant = 'number' | 'operator' | 'clear' | 'equals'

interface Key {
  label: string
  /** Accessible name, for keys whose label is a symbol. */
  name?: string
  variant: Variant
  action: CalculatorAction
}

function digit(value: Digit): Key {
  return { label: value, variant: 'number', action: { type: 'digit', digit: value } }
}

function operator(label: string, name: string, operation: BinaryOperation): Key {
  return {
    label,
    name,
    variant: 'operator',
    action: { type: 'operator', operator: operation },
  }
}

/** The keys in reading order: four per row, then "=" on its own. */
const KEYS: Key[] = [
  { label: 'C', name: 'clear', variant: 'clear', action: { type: 'clear' } },
  { label: '√', name: 'square root', variant: 'operator', action: { type: 'sqrt' } },
  operator('xʸ', 'power', 'power'),
  operator('%', 'percent of', 'percentage'),
  digit('7'),
  digit('8'),
  digit('9'),
  operator('÷', 'divide', 'divide'),
  digit('4'),
  digit('5'),
  digit('6'),
  operator('×', 'multiply', 'multiply'),
  digit('1'),
  digit('2'),
  digit('3'),
  operator('−', 'subtract', 'subtract'),
  { label: '±', name: 'toggle sign', variant: 'number', action: { type: 'toggleSign' } },
  digit('0'),
  { label: '.', name: 'decimal point', variant: 'number', action: { type: 'decimal' } },
  operator('+', 'add', 'add'),
  { label: '=', name: 'equals', variant: 'equals', action: { type: 'equals' } },
]

interface KeypadProps {
  onPress: (action: CalculatorAction) => void
}

export function Keypad({ onPress }: KeypadProps) {
  return (
    <div className="keypad">
      {KEYS.map(({ label, name, variant, action }) => (
        <button
          key={label}
          type="button"
          className={`key key--${variant}`}
          aria-label={name}
          onClick={() => onPress(action)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
