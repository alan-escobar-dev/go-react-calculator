import { displayLines } from '../state/calculatorReducer.ts'
import { useCalculator } from '../state/useCalculator.ts'
import { Display } from './Display.tsx'
import { Keypad } from './Keypad.tsx'

/** The calculator: a display and a keypad driven by one state machine. */
export function Calculator() {
  const { state, dispatch } = useCalculator()

  return (
    <div className="calculator">
      <Display lines={displayLines(state)} error={state.phase === 'error'} />
      <Keypad onPress={dispatch} />
    </div>
  )
}
