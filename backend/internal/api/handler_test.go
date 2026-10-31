package api_test

import (
	"bytes"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alan-escobar-dev/go-react-calculator/backend/internal/api"
)

// serve sends one request through the API handler, discarding its logs, and
// returns the recorded response.
func serve(method, path string, body io.Reader) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	handler := api.NewHandler(slog.New(slog.DiscardHandler))
	handler.ServeHTTP(rec, httptest.NewRequest(method, path, body))
	return rec
}

// assertResponse checks a response's status code, JSON content type and exact
// body.
func assertResponse(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantBody string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Errorf("status = %d, want %d", rec.Code, wantStatus)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q", got, "application/json")
	}
	// json.Encoder ends every value with a newline.
	if got := strings.TrimSuffix(rec.Body.String(), "\n"); got != wantBody {
		t.Errorf("body = %s\nwant   %s", got, wantBody)
	}
}

func TestCalculate(t *testing.T) {
	cases := []struct {
		name       string
		body       string
		wantStatus int
		wantBody   string
	}{
		// One success per operation.
		{"add", `{"operation":"add","a":2,"b":3}`, http.StatusOK, `{"result":5}`},
		{"subtract", `{"operation":"subtract","a":2,"b":3}`, http.StatusOK, `{"result":-1}`},
		{"multiply", `{"operation":"multiply","a":4,"b":2.5}`, http.StatusOK, `{"result":10}`},
		{"divide", `{"operation":"divide","a":10,"b":4}`, http.StatusOK, `{"result":2.5}`},
		{"power", `{"operation":"power","a":2,"b":10}`, http.StatusOK, `{"result":1024}`},
		{"sqrt", `{"operation":"sqrt","a":9}`, http.StatusOK, `{"result":3}`},
		{"percentage", `{"operation":"percentage","a":15,"b":200}`, http.StatusOK, `{"result":30}`},
		{"zero is a valid operand", `{"operation":"multiply","a":0,"b":5}`, http.StatusOK, `{"result":0}`},
		{"float64 precision is preserved", `{"operation":"add","a":0.1,"b":0.2}`, http.StatusOK, `{"result":0.30000000000000004}`},

		// Invalid input: 400.
		{"empty body", ``, http.StatusBadRequest, `{"error":"request body must not be empty"}`},
		{"truncated JSON", `{"operation":"add",`, http.StatusBadRequest, `{"error":"request body must be valid JSON"}`},
		{"malformed JSON", `{"operation" "add"}`, http.StatusBadRequest, `{"error":"request body must be valid JSON"}`},
		{"body is not an object", `[1,2]`, http.StatusBadRequest, `{"error":"request body must be a JSON object"}`},
		{"data after the object", `{"operation":"add","a":1,"b":2} {}`, http.StatusBadRequest, `{"error":"request body must contain a single JSON object"}`},
		{"unknown field", `{"operation":"add","a":1,"b":2,"c":3}`, http.StatusBadRequest, `{"error":"unknown field \"c\""}`},
		{"operand is a string", `{"operation":"add","a":"5","b":2}`, http.StatusBadRequest, `{"error":"\"a\" must be a number"}`},
		{"operation is not a string", `{"operation":5,"a":1,"b":2}`, http.StatusBadRequest, `{"error":"\"operation\" must be a string"}`},
		{"operand out of float64 range", `{"operation":"add","a":1e400,"b":2}`, http.StatusBadRequest, `{"error":"\"a\" is out of range"}`},
		{"missing operation", `{"a":1,"b":2}`, http.StatusBadRequest, `{"error":"\"operation\" is required"}`},
		{"unknown operation", `{"operation":"modulo","a":1,"b":2}`, http.StatusBadRequest, `{"error":"unknown operation \"modulo\" (supported: add, divide, multiply, percentage, power, sqrt, subtract)"}`},
		{"missing a", `{"operation":"add","b":2}`, http.StatusBadRequest, `{"error":"\"a\" is required"}`},
		{"null counts as missing", `{"operation":"add","a":null,"b":2}`, http.StatusBadRequest, `{"error":"\"a\" is required"}`},
		{"missing b", `{"operation":"divide","a":1}`, http.StatusBadRequest, `{"error":"\"b\" is required for operation \"divide\""}`},
		{"b sent for sqrt", `{"operation":"sqrt","a":9,"b":2}`, http.StatusBadRequest, `{"error":"\"b\" is not allowed for operation \"sqrt\""}`},

		// Calculator errors: 400.
		{"division by zero", `{"operation":"divide","a":1,"b":0}`, http.StatusBadRequest, `{"error":"cannot divide by zero"}`},
		{"zero to a negative power", `{"operation":"power","a":0,"b":-1}`, http.StatusBadRequest, `{"error":"cannot raise zero to a negative power"}`},
		{"negative base, fractional exponent", `{"operation":"power","a":-8,"b":0.5}`, http.StatusBadRequest, `{"error":"cannot raise a negative number to a fractional power"}`},
		{"square root of a negative", `{"operation":"sqrt","a":-1}`, http.StatusBadRequest, `{"error":"cannot take the square root of a negative number"}`},
		{"result overflow", `{"operation":"multiply","a":1e308,"b":10}`, http.StatusBadRequest, `{"error":"result is out of range"}`},

		// Body over 1 KiB: 413.
		{"body too large", `{"operation":"` + strings.Repeat("a", 2000) + `"}`, http.StatusRequestEntityTooLarge, `{"error":"request body must not be larger than 1024 bytes"}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := serve(http.MethodPost, "/api/v1/calculate", strings.NewReader(tc.body))
			assertResponse(t, rec, tc.wantStatus, tc.wantBody)
		})
	}
}

func TestRoutingErrors(t *testing.T) {
	cases := []struct {
		name       string
		method     string
		path       string
		wantStatus int
		wantBody   string
		wantAllow  string
	}{
		{"wrong method", http.MethodGet, "/api/v1/calculate", http.StatusMethodNotAllowed, `{"error":"method not allowed"}`, "POST"},
		{"unknown API path", http.MethodPost, "/api/v1/unknown", http.StatusNotFound, `{"error":"not found"}`, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := serve(tc.method, tc.path, http.NoBody)
			assertResponse(t, rec, tc.wantStatus, tc.wantBody)
			if got := rec.Header().Get("Allow"); got != tc.wantAllow {
				t.Errorf("Allow = %q, want %q", got, tc.wantAllow)
			}
		})
	}
}

// failingReader is a request body whose reads always fail, like a connection
// that drops mid-request.
type failingReader struct{}

func (failingReader) Read([]byte) (int, error) { return 0, errors.New("connection reset") }

func TestUnexpectedErrorIsLoggedButNotSent(t *testing.T) {
	var logs bytes.Buffer
	handler := api.NewHandler(slog.New(slog.NewTextHandler(&logs, nil)))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/calculate", failingReader{}))

	assertResponse(t, rec, http.StatusInternalServerError, `{"error":"internal server error"}`)
	if !strings.Contains(logs.String(), "connection reset") {
		t.Errorf("log = %q, want it to contain the underlying error", logs.String())
	}
}
