package calculator_test

import (
	"errors"
	"math"
	"testing"

	"github.com/alan-escobar-dev/go-react-calculator/backend/internal/calculator"
)

// negZero is IEEE 754 negative zero. Writing -0.0 in Go source gives a plain
// 0, because constant arithmetic is exact and has no negative zero.
var negZero = math.Copysign(0, -1)

// binaryCase is one row of a table-driven test for a two-operand operation.
type binaryCase struct {
	name    string
	a, b    float64
	want    float64
	wantErr error
}

// assertResult fails the test when an operation's result or error differs
// from the expected one.
func assertResult(t *testing.T, got float64, err error, want float64, wantErr error) {
	t.Helper()
	if !errors.Is(err, wantErr) {
		t.Fatalf("error = %v, want %v", err, wantErr)
	}
	if got != want {
		t.Errorf("result = %v, want %v", got, want)
	}
	// -0 == 0, so the comparison above cannot tell them apart.
	if got == 0 && math.Signbit(got) {
		t.Error("result is negative zero, want 0")
	}
}

func TestAdd(t *testing.T) {
	cases := []binaryCase{
		{"positive numbers", 2, 3, 5, nil},
		{"negative numbers", -2, -3, -5, nil},
		{"mixed signs", -2, 3, 1, nil},
		{"decimals carry binary rounding", 0.1, 0.2, 0.30000000000000004, nil},
		{"largest float64 is in range", math.MaxFloat64, 0, math.MaxFloat64, nil},
		{"overflow", math.MaxFloat64, math.MaxFloat64, 0, calculator.ErrOverflow},
		{"negative overflow", -math.MaxFloat64, -math.MaxFloat64, 0, calculator.ErrOverflow},
		{"negative zero result becomes zero", negZero, negZero, 0, nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calculator.Add(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestSubtract(t *testing.T) {
	cases := []binaryCase{
		{"positive result", 5, 3, 2, nil},
		{"negative result", 3, 5, -2, nil},
		{"subtracting a negative", 3, -5, 8, nil},
		{"decimals carry binary rounding", 0.3, 0.1, 0.19999999999999998, nil},
		{"overflow", math.MaxFloat64, -math.MaxFloat64, 0, calculator.ErrOverflow},
		{"negative overflow", -math.MaxFloat64, math.MaxFloat64, 0, calculator.ErrOverflow},
		{"negative zero result becomes zero", negZero, 0, 0, nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calculator.Subtract(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestMultiply(t *testing.T) {
	cases := []binaryCase{
		{"positive numbers", 4, 2.5, 10, nil},
		{"negative and positive", -4, 2.5, -10, nil},
		{"two negatives", -4, -2.5, 10, nil},
		{"decimals carry binary rounding", 0.1, 3, 0.30000000000000004, nil},
		{"overflow", 1e308, 10, 0, calculator.ErrOverflow},
		{"negative overflow", -1e308, 10, 0, calculator.ErrOverflow},
		{"underflow becomes zero", 1e-200, 1e-200, 0, nil},
		{"negative zero result becomes zero", -5, 0, 0, nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calculator.Multiply(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestDivide(t *testing.T) {
	cases := []binaryCase{
		{"exact result", 10, 4, 2.5, nil},
		{"negative result", -9, 3, -3, nil},
		{"repeating decimal", 1, 3, 0.3333333333333333, nil},
		{"overflow", math.MaxFloat64, 0.5, 0, calculator.ErrOverflow},
		{"negative overflow", -math.MaxFloat64, 0.5, 0, calculator.ErrOverflow},
		{"negative zero result becomes zero", 0, -5, 0, nil},
		{"division by zero", 1, 0, 0, calculator.ErrDivisionByZero},
		{"zero divided by zero", 0, 0, 0, calculator.ErrDivisionByZero},
		{"division by negative zero", 1, negZero, 0, calculator.ErrDivisionByZero},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calculator.Divide(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestPower(t *testing.T) {
	cases := []binaryCase{
		{"positive integer exponent", 2, 10, 1024, nil},
		{"negative exponent", 2, -2, 0.25, nil},
		{"fractional exponent", 4, 0.5, 2, nil},
		{"negative base with odd exponent", -2, 3, -8, nil},
		{"negative base with even exponent", -2, 4, 16, nil},
		{"zero to the zero is one", 0, 0, 1, nil},
		{"zero to a positive power", 0, 5, 0, nil},
		{"negative zero result becomes zero", negZero, 3, 0, nil},
		{"underflow becomes zero", 10, -400, 0, nil},
		{"overflow", 10, 400, 0, calculator.ErrOverflow},
		{"negative overflow", -10, 401, 0, calculator.ErrOverflow},
		{"zero to a negative power", 0, -1, 0, calculator.ErrZeroToNegativePower},
		{"negative zero to a negative power", negZero, -1, 0, calculator.ErrZeroToNegativePower},
		{"negative base with fractional exponent", -8, 0.5, 0, calculator.ErrComplexResult},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calculator.Power(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestSqrt(t *testing.T) {
	cases := []struct {
		name    string
		x       float64
		want    float64
		wantErr error
	}{
		{"perfect square", 9, 3, nil},
		{"irrational result", 2, 1.4142135623730951, nil},
		{"fraction", 0.25, 0.5, nil},
		{"zero", 0, 0, nil},
		{"negative zero becomes zero", negZero, 0, nil},
		{"largest float64", math.MaxFloat64, 1.3407807929942596e154, nil},
		{"negative number", -1, 0, calculator.ErrNegativeSquareRoot},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calculator.Sqrt(tc.x)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestPercentage(t *testing.T) {
	cases := []binaryCase{
		{"percent of a number", 15, 200, 30, nil},
		{"no rounding noise on everyday inputs", 7, 3, 0.21, nil},
		{"more than one hundred percent", 150, 40, 60, nil},
		{"negative percent", -15, 200, -30, nil},
		{"percent of a negative number", 15, -200, -30, nil},
		{"negative zero result becomes zero", 0, -200, 0, nil},
		{"intermediate overflow falls back to dividing first", 1e307, 50, 5e306, nil},
		{"overflow", math.MaxFloat64, 200, 0, calculator.ErrOverflow},
		{"negative overflow", -math.MaxFloat64, 200, 0, calculator.ErrOverflow},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calculator.Percentage(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}
