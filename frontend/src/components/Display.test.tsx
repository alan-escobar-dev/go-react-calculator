import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Display } from './Display.tsx'

/** Renders the display and returns its main line. */
function mainLine(main: string, error = false) {
  render(<Display lines={{ expression: '', main }} error={error} />)
  return error ? screen.getByRole('alert') : screen.getByRole('status')
}

describe('Display', () => {
  it('keeps the full size for short text', () => {
    expect(mainLine('15 % of 200')).toHaveClass('display-main', { exact: true })
  })

  it('shrinks text longer than 12 characters', () => {
    expect(mainLine('123456789012345')).toHaveClass('display-main--medium')
  })

  it('shrinks text longer than 20 characters further', () => {
    expect(mainLine('-1.23456789012345e+300')).toHaveClass('display-main--small')
  })

  it('marks an error so it gets the error color', () => {
    expect(mainLine('Cannot divide by zero', true)).toHaveClass(
      'display-main--error',
      'display-main--small',
    )
  })
})
