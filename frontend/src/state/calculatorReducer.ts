import type { BinaryOperation, CalculateRequest } from '../api/calculator.ts'
import { formatNumber } from '../utils/formatNumber.ts'

/**
 * Most digits a typed number may have: any decimal with up to 15 significant
 * digits survives the round trip through a float64 unchanged.
 */
const MAX_DIGITS = 15

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** A number shown on its own: digits being typed, or an exact API result. */
export type Entry =
  | { kind: 'typed'; text: string }
  | { kind: 'value'; value: number }

/**
 * Everything the keypad remembers. Each phase holds only the data that is
 * valid in it, so impossible combinations cannot be represented.
 */
export type CalculatorState =
  // Entering the first number, or showing a result (`source` produced it).
  | { phase: 'first'; entry: Entry; source: CalculateRequest | null }
  // `a` and an operator are chosen; the second number has not started.
  | { phase: 'operator'; a: number; operator: BinaryOperation }
  // Typing the second number `b`.
  | { phase: 'second'; a: number; operator: BinaryOperation; b: string }
  // `request` was sent to the API; waiting for the answer.
  | { phase: 'pending'; request: CalculateRequest }
  // The API, or the network, rejected `request` with `message`.
  | { phase: 'error'; request: CalculateRequest; message: string }

export type CalculatorAction =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'sqrt' }
  | { type: 'equals' }
  | { type: 'clear' }
  // Dispatched with the outcome of the pending request.
  | { type: 'resolved'; result: number }
  | { type: 'rejected'; message: string }

/** The phases in which key presses are accepted. */
type InputState = Extract<CalculatorState, { phase: 'first' | 'operator' | 'second' }>

/** Every action that comes from a key other than C. */
type KeyAction = Exclude<CalculatorAction, { type: 'clear' | 'resolved' | 'rejected' }>

export const initialState: InputState = {
  phase: 'first',
  entry: { kind: 'typed', text: '0' },
  source: null,
}

/**
 * Returns the state after `action`. It is pure: no side effects, and the same
 * inputs always give the same output, so every rule is easy to test.
 */
export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'clear':
      return initialState
    case 'resolved':
      return state.phase === 'pending'
        ? {
            phase: 'first',
            entry: { kind: 'value', value: action.result },
            source: state.request,
          }
        : state
    case 'rejected':
      return state.phase === 'pending'
        ? { phase: 'error', request: state.request, message: action.message }
        : state
    default:
      if (state.phase === 'pending') {
        return state // keys are ignored while waiting for the API
      }
      // After an error, any key behaves as if C had been pressed first.
      return pressKey(state.phase === 'error' ? initialState : state, action)
  }
}

function pressKey(state: InputState, action: KeyAction): CalculatorState {
  switch (action.type) {
    case 'digit':
      return editNumber(state, (text) => appendDigit(text, action.digit))
    case 'decimal':
      return editNumber(state, appendDecimal)
    case 'toggleSign':
      // A result is negated exactly; typed digits gain or lose their "-".
      if (state.phase === 'first' && state.entry.kind === 'value') {
        return {
          phase: 'first',
          entry: { kind: 'value', value: -state.entry.value },
          source: null,
        }
      }
      return editNumber(state, negateText)
    case 'operator':
      return pressOperator(state, action.operator)
    case 'sqrt':
      return pressSqrt(state)
    case 'equals':
      return pressEquals(state)
  }
}

/**
 * Applies `edit` to the number being typed. A result shown on its own, or a
 * second number that has not started yet, is replaced by one starting at "0".
 */
function editNumber(
  state: InputState,
  edit: (text: string) => string,
): CalculatorState {
  switch (state.phase) {
    case 'first': {
      const text = state.entry.kind === 'typed' ? state.entry.text : '0'
      return { phase: 'first', entry: { kind: 'typed', text: edit(text) }, source: null }
    }
    case 'operator':
      return { ...state, phase: 'second', b: edit('0') }
    case 'second':
      return { ...state, b: edit(state.b) }
  }
}

function pressOperator(
  state: InputState,
  operator: BinaryOperation,
): CalculatorState {
  switch (state.phase) {
    case 'first':
      return { phase: 'operator', a: entryValue(state.entry), operator }
    case 'operator':
      return { ...state, operator } // change of mind: replace the operator
    case 'second':
      return state // one operation at a time: press = first
  }
}

function pressSqrt(state: InputState): CalculatorState {
  if (state.phase !== 'first') {
    return state // √ applies only to a number on its own
  }
  return {
    phase: 'pending',
    request: { operation: 'sqrt', a: entryValue(state.entry) },
  }
}

function pressEquals(state: InputState): CalculatorState {
  if (state.phase !== 'second') {
    return state // nothing to calculate yet
  }
  return {
    phase: 'pending',
    request: { operation: state.operator, a: state.a, b: Number(state.b) },
  }
}

function entryValue(entry: Entry): number {
  return entry.kind === 'typed' ? Number(entry.text) : entry.value
}

function appendDigit(text: string, digit: Digit): string {
  if (text === '0' || text === '-0') {
    return text.slice(0, -1) + digit // replace the leading zero: "0" → "7"
  }
  if (text.replace(/\D/g, '').length >= MAX_DIGITS) {
    return text
  }
  return text + digit
}

function appendDecimal(text: string): string {
  return text.includes('.') ? text : `${text}.`
}

function negateText(text: string): string {
  return text.startsWith('-') ? text.slice(1) : `-${text}`
}

/** The two lines of the calculator display. */
export interface DisplayLines {
  /** Small line: the calculation behind the value below, e.g. "15 % of 200 =". */
  expression: string
  /** Large line: what is being typed, a result, or an error message. */
  main: string
}

const SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  percentage: '% of',
}

/** Derives what the display shows from the state. */
export function displayLines(state: CalculatorState): DisplayLines {
  switch (state.phase) {
    case 'first':
      return {
        expression: state.source ? `${formatRequest(state.source)} =` : '',
        main:
          state.entry.kind === 'typed'
            ? state.entry.text
            : formatNumber(state.entry.value),
      }
    case 'operator':
      return {
        expression: '',
        main: `${operandText(state.a)} ${SYMBOLS[state.operator]}`,
      }
    case 'second':
      return {
        expression: '',
        main: `${operandText(state.a)} ${SYMBOLS[state.operator]} ${bracketNegative(state.b)}`,
      }
    case 'pending':
      return { expression: '', main: formatRequest(state.request) }
    case 'error':
      return {
        expression: `${formatRequest(state.request)} =`,
        main: capitalize(state.message),
      }
  }
}

/** Writes a request the way the display shows it: "15 % of 200", "√(9)". */
function formatRequest(request: CalculateRequest): string {
  if (request.operation === 'sqrt') {
    return `√(${formatNumber(request.a)})`
  }
  const symbol = SYMBOLS[request.operation]
  return `${operandText(request.a)} ${symbol} ${operandText(request.b)}`
}

function operandText(value: number): string {
  return bracketNegative(formatNumber(value))
}

/** Brackets negative operands so signs are not confused with operators. */
function bracketNegative(text: string): string {
  return text.startsWith('-') ? `(${text})` : text
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
