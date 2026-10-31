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

// checkResult rejects an overflowed (infinite) result and normalizes negative
// zero. With finite inputs, NaN cannot occur: the operations reject the inputs
// that would produce it (such as 0 / 0) before computing.
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
