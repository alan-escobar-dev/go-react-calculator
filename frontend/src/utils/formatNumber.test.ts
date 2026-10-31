import { describe, expect, it } from 'vitest'
import { formatNumber } from './formatNumber.ts'

describe('formatNumber', () => {
  it.each([
    { why: 'integer', value: 30, expected: '30' },
    { why: 'negative decimal', value: -2.5, expected: '-2.5' },
    { why: 'binary rounding noise is hidden', value: 0.1 + 0.2, expected: '0.3' },
    { why: 'repeating decimal', value: 1 / 3, expected: '0.333333333333333' },
    { why: 'negative zero', value: -0, expected: '0' },
    { why: 'largest plain integer', value: 999999999999999, expected: '999999999999999' },
    { why: 'more than 15 digits', value: 2 ** 53, expected: '9.00719925474099e+15' },
    { why: 'very large', value: 1e21, expected: '1e+21' },
    { why: 'smallest plain decimal', value: 0.000001, expected: '0.000001' },
    { why: 'very small', value: 1e-7, expected: '1e-7' },
    {
      why: 'largest float64 does not round up to Infinity',
      value: Number.MAX_VALUE,
      expected: '1.7976931348623157e+308',
    },
  ])('$why: $expected', ({ value, expected }) => {
    expect(formatNumber(value)).toBe(expected)
  })
})
