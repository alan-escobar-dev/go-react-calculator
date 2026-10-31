import type { CalculatorAction, Digit } from '../state/calculatorReducer.ts'

interface Key {
  label: string
  /** Accessible name, for keys whose label is a symbol. */
  name?: string
  action: CalculatorAction
}

function digit(value: Digit): Key {
  return { label: value, action: { type: 'digit', digit: value } }
}

/** The keys in reading order: four per row, then "=" on its own. */
const KEYS: Key[] = [
  { label: 'C', name: 'clear', action: { type: 'clear' } },
  { label: '√', name: 'square root', action: { type: 'sqrt' } },
  { label: 'xʸ', name: 'power', action: { type: 'operator', operator: 'power' } },
  {
    label: '%',
    name: 'percent of',
    action: { type: 'operator', operator: 'percentage' },
  },
  digit('7'),
  digit('8'),
  digit('9'),
  { label: '÷', name: 'divide', action: { type: 'operator', operator: 'divide' } },
  digit('4'),
  digit('5'),
  digit('6'),
  { label: '×', name: 'multiply', action: { type: 'operator', operator: 'multiply' } },
  digit('1'),
  digit('2'),
  digit('3'),
  { label: '−', name: 'subtract', action: { type: 'operator', operator: 'subtract' } },
  { label: '±', name: 'toggle sign', action: { type: 'toggleSign' } },
  digit('0'),
  { label: '.', name: 'decimal point', action: { type: 'decimal' } },
  { label: '+', name: 'add', action: { type: 'operator', operator: 'add' } },
  { label: '=', name: 'equals', action: { type: 'equals' } },
]

interface KeypadProps {
  onPress: (action: CalculatorAction) => void
}

export function Keypad({ onPress }: KeypadProps) {
  return (
    <div className="keypad">
      {KEYS.map(({ label, name, action }) => (
        <button
          key={label}
          type="button"
          aria-label={name}
          onClick={() => onPress(action)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
