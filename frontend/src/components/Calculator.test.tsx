import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from '../api/calculator.ts'
import { Calculator } from './Calculator.tsx'

// Keep the real ApiError, but replace the network call with a mock.
vi.mock('../api/calculator.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/calculator.ts')>()),
  calculate: vi.fn(),
}))

const calculateMock = vi.mocked(calculate)

afterEach(() => {
  calculateMock.mockReset()
})

/**
 * Makes every API call wait until the test settles it, so a test can look
 * at the calculator while a request is in flight.
 */
function controlApi() {
  let resolveLatest: (result: number) => void = () => {}
  let rejectLatest: (error: unknown) => void = () => {}
  calculateMock.mockImplementation(
    () =>
      new Promise<number>((resolve, reject) => {
        resolveLatest = resolve
        rejectLatest = reject
      }),
  )
  return {
    resolve: (result: number) => act(async () => resolveLatest(result)),
    reject: (error: unknown) => act(async () => rejectLatest(error)),
  }
}

/** Renders the calculator; `press` clicks keys by their accessible name. */
function setup() {
  const user = userEvent.setup()
  const view = render(<Calculator />)
  return {
    ...view,
    press: async (...names: string[]) => {
      for (const name of names) {
        await user.click(screen.getByRole('button', { name }))
      }
    },
  }
}

/** The large line of the display while it shows a number or expression. */
function mainLine() {
  return screen.getByRole('status')
}

describe('Calculator', () => {
  it('has a labelled key for every button of the keypad', () => {
    setup()
    const names = [
      'clear', 'square root', 'power', 'percent of',
      '7', '8', '9', 'divide',
      '4', '5', '6', 'multiply',
      '1', '2', '3', 'subtract',
      'toggle sign', '0', 'decimal point', 'add',
      'equals',
    ]

    expect(screen.getAllByRole('button')).toHaveLength(names.length)
    for (const name of names) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('shows the result of 12 ÷ 4 =', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('1', '2', 'divide', '4', 'equals')
    expect(calculateMock).toHaveBeenCalledWith(
      { operation: 'divide', a: 12, b: 4 },
      expect.any(AbortSignal),
    )
    await api.resolve(3)

    expect(screen.getByText('12 ÷ 4 =')).toBeInTheDocument()
    expect(mainLine()).toHaveTextContent(/^3$/)
  })

  it('shows the full expression for 15 % 200 =', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('1', '5', 'percent of', '2', '0', '0')
    expect(mainLine()).toHaveTextContent(/^15 % of 200$/)
    await press('equals')
    await api.resolve(30)

    expect(screen.getByText('15 % of 200 =')).toBeInTheDocument()
    expect(mainLine()).toHaveTextContent(/^30$/)
  })

  it('calculates a square root as soon as √ is pressed', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('9', 'square root')
    expect(calculateMock).toHaveBeenCalledWith(
      { operation: 'sqrt', a: 9 },
      expect.any(AbortSignal),
    )
    await api.resolve(3)

    expect(screen.getByText('√(9) =')).toBeInTheDocument()
    expect(mainLine()).toHaveTextContent(/^3$/)
  })

  it('uses a result as the first number of the next calculation', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('1', '2', 'divide', '4', 'equals')
    await api.resolve(3)
    await press('multiply', '2', 'equals')

    expect(calculateMock).toHaveBeenLastCalledWith(
      { operation: 'multiply', a: 3, b: 2 },
      expect.any(AbortSignal),
    )
  })

  it('shows the error message from the API', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('1', 'divide', '0', 'equals')
    await api.reject(new ApiError('cannot divide by zero'))

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot divide by zero')
    expect(screen.getByText('1 ÷ 0 =')).toBeInTheDocument()
  })

  it('shows a network error', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('1', 'add', '2', 'equals')
    await api.reject(new ApiError("can't reach the calculator service"))

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Can't reach the calculator service",
    )
  })

  it('shows a generic message for an unexpected error', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('1', 'add', '2', 'equals')
    await api.reject(new Error('bug'))

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('ignores keys while waiting for the API', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('1', 'add', '2', 'equals')
    await press('7', 'multiply', 'equals')

    expect(mainLine()).toHaveTextContent(/^1 \+ 2$/)
    expect(calculateMock).toHaveBeenCalledTimes(1)
    await api.resolve(3)
    expect(mainLine()).toHaveTextContent(/^3$/)
  })

  it('cancels the request when C is pressed', async () => {
    const api = controlApi()
    const { press } = setup()

    await press('1', 'add', '2', 'equals')
    const signal = calculateMock.mock.calls[0]?.[1]
    await press('clear')

    expect(signal?.aborted).toBe(true)
    await api.resolve(3) // the late answer must be ignored
    expect(mainLine()).toHaveTextContent(/^0$/)
  })

  it('cancels the request when the calculator unmounts', async () => {
    controlApi()
    const { press, unmount } = setup()

    await press('1', 'add', '2', 'equals')
    const signal = calculateMock.mock.calls[0]?.[1]
    unmount()

    expect(signal?.aborted).toBe(true)
  })
})
