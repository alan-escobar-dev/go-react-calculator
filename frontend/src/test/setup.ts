import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only cleans up automatically when the test runner exposes
// global hooks; this project imports them explicitly, so unmount here.
afterEach(() => {
  cleanup()
})
