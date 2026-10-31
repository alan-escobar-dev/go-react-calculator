import { describe, expect, it } from 'vitest'
import {
  calculatorReducer,
  displayLines,
  initialState,
  type CalculatorAction,
  type CalculatorState,
  type Digit,
} from './calculatorReducer.ts'

/** Keypad labels used in these tests, mapped to the actions they dispatch. */
const KEYS: Record<string, CalculatorAction> = {
  '.': { type: 'decimal' },
  '±': { type: 'toggleSign' },
  '+': { type: 'operator', operator: 'add' },
  '−': { type: 'operator', operator: 'subtract' },
  '×': { type: 'operator', operator: 'multiply' },
  '÷': { type: 'operator', operator: 'divide' },
  '^': { type: 'operator', operator: 'power' },
  '%': { type: 'operator', operator: 'percentage' },
  '√': { type: 'sqrt' },
  '=': { type: 'equals' },
  C: { type: 'clear' },
}

function isDigit(key: string): key is Digit {
  return /^\d$/.test(key)
}

function toAction(key: string): CalculatorAction {
  if (isDigit(key)) {
    return { type: 'digit', digit: key }
  }
  const action = KEYS[key]
  if (!action) {
    throw new Error(`no action for key ${key}`)
  }
  return action
}

/** Presses each character of `keys` in order, starting from `state`. */
function press(keys: string, state: CalculatorState = initialState): CalculatorState {
  return [...keys].reduce(
    (current, key) => calculatorReducer(current, toAction(key)),
    state,
  )
}

/** The display after pressing `keys` on a fresh calculator. */
function lines(keys: string, state?: CalculatorState) {
  return displayLines(press(keys, state))
}

function resolve(state: CalculatorState, result: number): CalculatorState {
  return calculatorReducer(state, { type: 'resolved', result })
}

function reject(state: CalculatorState, message: string): CalculatorState {
  return calculatorReducer(state, { type: 'rejected', message })
}

describe('entering a number', () => {
  it('starts at 0', () => {
    expect(lines('')).toEqual({ expression: '', main: '0' })
  })

  it('appends digits', () => {
    expect(lines('123').main).toBe('123')
  })

  it('collapses leading zeros', () => {
    expect(lines('007').main).toBe('7')
    expect(lines('000').main).toBe('0')
  })

  it('accepts a single decimal point', () => {
    expect(lines('1.5.2').main).toBe('1.52')
  })

  it('starts a decimal from 0', () => {
    expect(lines('.5').main).toBe('0.5')
  })

  it('keeps trailing zeros while typing', () => {
    expect(lines('0.50').main).toBe('0.50')
  })

  it('stops at 15 digits', () => {
    expect(lines('1234567890123456').main).toBe('123456789012345')
    expect(lines('1.234567890123456').main).toBe('1.23456789012345')
  })

  it('toggles the sign with ±', () => {
    expect(lines('5±').main).toBe('-5')
    expect(lines('5±±').main).toBe('5')
    expect(lines('±5').main).toBe('-5')
  })
})

describe('operators', () => {
  it('turn the number into a and show the operator', () => {
    expect(lines('15%')).toEqual({ expression: '', main: '15 % of' })
  })

  it('use the displayed 0 when nothing was typed', () => {
    expect(lines('+').main).toBe('0 +')
  })

  it('replace each other before b is typed', () => {
    expect(lines('15+×').main).toBe('15 ×')
  })

  it('are ignored once b is typed (one operation at a time)', () => {
    expect(press('2+3×')).toEqual(press('2+3'))
  })

  it('show the whole expression while b is typed', () => {
    expect(lines('15%200')).toEqual({ expression: '', main: '15 % of 200' })
  })

  it('bracket a negative operand', () => {
    expect(lines('2×±3').main).toBe('2 × (-3)')
  })
})

describe('equals', () => {
  it('sends the request and keeps showing the expression', () => {
    const state = press('15%200=')

    expect(state).toEqual({
      phase: 'pending',
      request: { operation: 'percentage', a: 15, b: 200 },
    })
    expect(displayLines(state)).toEqual({ expression: '', main: '15 % of 200' })
  })

  it('shows the result under the expression', () => {
    expect(displayLines(resolve(press('15%200='), 30))).toEqual({
      expression: '15 % of 200 =',
      main: '30',
    })
  })

  it('is ignored before the second number', () => {
    expect(press('15%=')).toEqual(press('15%'))
    expect(press('15=')).toEqual(press('15'))
  })
})

describe('square root', () => {
  it('sends the request right away', () => {
    const state = press('9√')

    expect(state).toEqual({ phase: 'pending', request: { operation: 'sqrt', a: 9 } })
    expect(displayLines(resolve(state, 3))).toEqual({ expression: '√(9) =', main: '3' })
  })

  it('is ignored while an operator is pending', () => {
    expect(press('2+√')).toEqual(press('2+'))
    expect(press('2+9√')).toEqual(press('2+9'))
  })
})

describe('after a result', () => {
  const result = resolve(press('15%200='), 30)

  it('starts a new calculation on a digit or decimal point', () => {
    expect(lines('7', result)).toEqual({ expression: '', main: '7' })
    expect(lines('.', result).main).toBe('0.')
  })

  it('uses the result as a for the next operator', () => {
    expect(lines('+', result)).toEqual({ expression: '', main: '30 +' })
  })

  it('takes the square root of the result', () => {
    expect(press('√', result)).toEqual({
      phase: 'pending',
      request: { operation: 'sqrt', a: 30 },
    })
  })

  it('negates the result with ±', () => {
    expect(lines('±', result)).toEqual({ expression: '', main: '-30' })
  })

  it('keeps the exact value, not the rounded display', () => {
    const noisy = resolve(press('1+2='), 0.30000000000000004)

    expect(displayLines(noisy).main).toBe('0.3')
    expect(press('×3=', noisy)).toEqual({
      phase: 'pending',
      request: { operation: 'multiply', a: 0.30000000000000004, b: 3 },
    })
  })
})

describe('waiting for the API', () => {
  const pending = press('1÷0=')

  it('ignores every key except C', () => {
    expect(press('5+=√±.', pending)).toBe(pending)
  })

  it('cancels with C', () => {
    expect(press('C', pending)).toBe(initialState)
  })
})

describe('errors', () => {
  const failed = reject(press('1÷0='), 'cannot divide by zero')

  it('show the message where the result would be', () => {
    expect(displayLines(failed)).toEqual({
      expression: '1 ÷ 0 =',
      main: 'Cannot divide by zero',
    })
  })

  it('are cleared by the next key, as if C was pressed first', () => {
    expect(lines('5', failed)).toEqual({ expression: '', main: '5' })
    expect(lines('+', failed).main).toBe('0 +')
    expect(press('C', failed)).toBe(initialState)
  })
})

describe('API answers', () => {
  it('are ignored when no request is pending', () => {
    const typing = press('5')

    expect(resolve(typing, 42)).toBe(typing)
    expect(reject(typing, 'too late')).toBe(typing)
  })
})
