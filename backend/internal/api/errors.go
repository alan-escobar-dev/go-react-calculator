package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/alan-escobar-dev/go-react-calculator/backend/internal/calculator"
)

// errorResponse is the JSON body of every error response.
type errorResponse struct {
	Error string `json:"error"`
}

// requestError is a problem with the client's request. Its message is safe to
// show to the client.
type requestError struct {
	status  int
	message string
}

func (e *requestError) Error() string { return e.message }

// badRequest returns a 400 requestError with a formatted message.
func badRequest(format string, args ...any) error {
	return &requestError{status: http.StatusBadRequest, message: fmt.Sprintf(format, args...)}
}

// statusFor maps an error to its HTTP status code. Request errors carry their
// own status; calculator errors are the client's input, so 400; anything else
// is unexpected, so 500.
func statusFor(err error) int {
	var reqErr *requestError
	switch {
	case errors.As(err, &reqErr):
		return reqErr.status
	case errors.Is(err, calculator.ErrDivisionByZero),
		errors.Is(err, calculator.ErrZeroToNegativePower),
		errors.Is(err, calculator.ErrComplexResult),
		errors.Is(err, calculator.ErrNegativeSquareRoot),
		errors.Is(err, calculator.ErrOverflow):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}

// writeError sends err as a JSON error response. Request and calculator errors
// keep their message; anything else is logged and replaced with a generic
// message, so internal details never reach the client.
func (h *handler) writeError(w http.ResponseWriter, err error) {
	status := statusFor(err)
	message := err.Error()
	if status == http.StatusInternalServerError {
		h.logger.Error("unexpected error", "error", err)
		message = "internal server error"
	}
	writeJSON(w, status, errorResponse{Error: message})
}
