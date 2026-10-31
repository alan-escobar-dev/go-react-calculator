// Package api exposes the calculator over HTTP as a JSON API.
//
// It owns everything HTTP-specific: routing, decoding and validating requests,
// and mapping errors to status codes. Every response, including errors, is
// JSON.
package api

import (
	"log/slog"
	"maps"
	"net/http"
	"slices"
	"strings"

	"github.com/alan-escobar-dev/go-react-calculator/backend/internal/calculator"
)

// calculateRequest is the JSON body of POST /api/v1/calculate. The operands
// are pointers so that a missing field (nil) can be told apart from 0.
type calculateRequest struct {
	Operation string   `json:"operation"`
	A         *float64 `json:"a"`
	B         *float64 `json:"b"`
}

// calculateResponse is the JSON body of a successful calculation.
type calculateResponse struct {
	Result float64 `json:"result"`
}

// operation is a calculator function exposed by the API. Exactly one field is
// set: binary operations take "a" and "b", unary ones (sqrt) only "a".
type operation struct {
	binary func(a, b float64) (float64, error)
	unary  func(a float64) (float64, error)
}

// operations maps the "operation" field of a request to its function.
var operations = map[string]operation{
	"add":        {binary: calculator.Add},
	"subtract":   {binary: calculator.Subtract},
	"multiply":   {binary: calculator.Multiply},
	"divide":     {binary: calculator.Divide},
	"power":      {binary: calculator.Power},
	"percentage": {binary: calculator.Percentage},
	"sqrt":       {unary: calculator.Sqrt},
}

// supportedOperations lists the operation names for error messages, sorted
// because map iteration order is random.
var supportedOperations = strings.Join(slices.Sorted(maps.Keys(operations)), ", ")

// handler serves the calculator API.
type handler struct {
	logger *slog.Logger
}

// NewHandler returns the calculator API's HTTP handler. The logger records
// unexpected errors, whose details are never sent to clients.
func NewHandler(logger *slog.Logger) http.Handler {
	h := &handler{logger: logger}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", h.calculate)
	// Fallbacks that keep error responses in JSON (Go's defaults are plain
	// text). The most specific matching pattern wins, so these only receive
	// requests that the route above does not match.
	mux.HandleFunc("/api/v1/calculate", methodNotAllowed)
	mux.HandleFunc("/api/", notFound)
	return mux
}

// calculate handles POST /api/v1/calculate.
func (h *handler) calculate(w http.ResponseWriter, r *http.Request) {
	var req calculateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		h.writeError(w, err)
		return
	}
	result, err := evaluate(req)
	if err != nil {
		h.writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

// evaluate validates req and runs the requested operation.
func evaluate(req calculateRequest) (float64, error) {
	if req.Operation == "" {
		return 0, badRequest(`"operation" is required`)
	}
	op, ok := operations[req.Operation]
	if !ok {
		return 0, badRequest("unknown operation %q (supported: %s)", req.Operation, supportedOperations)
	}
	if req.A == nil {
		return 0, badRequest(`"a" is required`)
	}
	if op.unary != nil {
		if req.B != nil {
			return 0, badRequest(`"b" is not allowed for operation %q`, req.Operation)
		}
		return op.unary(*req.A)
	}
	if req.B == nil {
		return 0, badRequest(`"b" is required for operation %q`, req.Operation)
	}
	return op.binary(*req.A, *req.B)
}

// methodNotAllowed answers requests to /api/v1/calculate that are not POST.
func methodNotAllowed(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Allow", http.MethodPost)
	writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
}

// notFound answers requests to unknown /api/ paths.
func notFound(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusNotFound, errorResponse{Error: "not found"})
}
