import { useEffect, useReducer } from 'react'
import { ApiError, calculate } from '../api/calculator.ts'
import {
  calculatorReducer,
  initialState,
  type CalculatorAction,
} from './calculatorReducer.ts'

/**
 * Connects the keypad's state machine to the API. The reducer decides what to
 * calculate by moving to the pending phase; this hook's effect sends that
 * request and reports the outcome back to the reducer as an action.
 */
export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const request = state.phase === 'pending' ? state.request : null

  useEffect(() => {
    if (!request) {
      return
    }
    const controller = new AbortController()
    calculate(request, controller.signal)
      .then((result): CalculatorAction => ({ type: 'resolved', result }))
      .catch((error: unknown): CalculatorAction => ({
        type: 'rejected',
        message: errorMessage(error),
      }))
      .then((outcome) => {
        // A cancelled request (C pressed, or the calculator unmounted) must
        // not change the state, whatever its outcome.
        if (!controller.signal.aborted) {
          dispatch(outcome)
        }
      })
    // React runs this cleanup when `request` changes or on unmount.
    return () => controller.abort()
  }, [request])

  return { state, dispatch }
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'something went wrong'
}
