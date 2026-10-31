// Package calculator implements the arithmetic behind the calculator API.
//
// It is deliberately pure: plain functions on float64 values with no knowledge
// of HTTP or JSON. Each operation returns either a finite result or one of the
// sentinel errors below; the api package decides which HTTP status each error
// maps to.
//
// Inputs are assumed to be finite. The API guarantees this, because JSON cannot
// encode NaN or ±Infinity.
package calculator

import (
	"errors"
	"math"
)

// Sentinel errors returned by the operations. Compare them with errors.Is.
var (
	// ErrDivisionByZero is returned when dividing by zero (or negative zero).
	ErrDivisionByZero = errors.New("cannot divide by zero")

	// ErrZeroToNegativePower is returned when zero is raised to a negative
	// power, which would mean dividing by zero.
	ErrZeroToNegativePower = errors.New("cannot raise zero to a negative power")

	// ErrComplexResult is returned when a negative number is raised to a
	// fractional power, which has no real-number result.
	ErrComplexResult = errors.New("cannot raise a negative number to a fractional power")

	// ErrNegativeSquareRoot is returned for the square root of a negative
	// number.
	ErrNegativeSquareRoot = errors.New("cannot take the square root of a negative number")

	// ErrOverflow is returned when a result is too large in magnitude for a
	// float64 (beyond about ±1.8e308).
	ErrOverflow = errors.New("result is out of range")
)

// Add returns a + b.
func Add(a, b float64) (float64, error) {
	return checkResult(a + b)
}

// Subtract returns a - b.
func Subtract(a, b float64) (float64, error) {
	return checkResult(a - b)
}

// Multiply returns a * b.
func Multiply(a, b float64) (float64, error) {
	return checkResult(a * b)
}

// Divide returns a / b, or ErrDivisionByZero when b is zero.
func Divide(a, b float64) (float64, error) {
	if b == 0 { // also true for negative zero
		return 0, ErrDivisionByZero
	}
	return checkResult(a / b)
}

// Power returns base raised to the power exponent. It returns
// ErrZeroToNegativePower when base is zero and exponent is negative, and
// ErrComplexResult when base is negative and exponent is fractional.
// As in Go's math.Pow and JavaScript, 0^0 is 1.
func Power(base, exponent float64) (float64, error) {
	if base == 0 && exponent < 0 {
		return 0, ErrZeroToNegativePower
	}
	if base < 0 && exponent != math.Trunc(exponent) {
		return 0, ErrComplexResult
	}
	return checkResult(math.Pow(base, exponent))
}

// Sqrt returns the square root of x, or ErrNegativeSquareRoot when x is
// negative.
func Sqrt(x float64) (float64, error) {
	if x < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return checkResult(math.Sqrt(x))
}

// Percentage returns percent % of base, that is percent * base / 100
// (15 % of 200 is 30).
func Percentage(percent, base float64) (float64, error) {
	// Multiplying first keeps everyday results free of rounding noise:
	// 7 * 3 / 100 is 0.21, while 7 / 100 * 3 is 0.21000000000000002.
	r := percent * base / 100
	if math.IsInf(r, 0) {
		// The product overflowed. Dividing first avoids that intermediate
		// overflow; checkResult still reports a result that is itself out
		// of range.
		r = percent / 100 * base
	}
	return checkResult(r)
}

// checkResult rejects an overflowed (infinite) result and normalizes negative
// zero. With finite inputs, NaN cannot occur: the operations reject the inputs
// that would produce it (0 / 0, √-1, (-8)^0.5) before computing.
func checkResult(r float64) (float64, error) {
	if math.IsInf(r, 0) {
		return 0, ErrOverflow
	}
	if r == 0 {
		// IEEE 754 has a negative zero (-5 * 0 is -0), which JSON would print
		// as "-0". Since -0 == 0, this branch returns a plain 0 for both.
		return 0, nil
	}
	return r, nil
}
