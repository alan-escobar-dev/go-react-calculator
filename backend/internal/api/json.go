package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"strings"
)

// maxBodyBytes caps the size of request bodies. A valid calculate request is
// under 100 bytes.
const maxBodyBytes = 1 << 10 // 1 KiB

// decodeJSON decodes the request body into dst. The body must hold a single
// JSON object of at most maxBodyBytes with no unknown fields. Problems with the
// body are returned as *requestError values with client-safe messages; any
// other error (such as a failed read) is returned unchanged.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return decodeError(err)
	}
	// Only whitespace may follow the object, so a second Decode must reach
	// the end of the body.
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return badRequest("request body must contain a single JSON object")
	}
	return nil
}

// decodeError translates an error from json.Decoder.Decode into a
// requestError when it describes a problem with the body.
func decodeError(err error) error {
	var (
		tooLarge  *http.MaxBytesError
		syntaxErr *json.SyntaxError
		typeErr   *json.UnmarshalTypeError
	)
	switch {
	case errors.As(err, &tooLarge):
		return &requestError{
			status:  http.StatusRequestEntityTooLarge,
			message: fmt.Sprintf("request body must not be larger than %d bytes", tooLarge.Limit),
		}
	case errors.Is(err, io.EOF):
		return badRequest("request body must not be empty")
	case errors.As(err, &syntaxErr), errors.Is(err, io.ErrUnexpectedEOF):
		return badRequest("request body must be valid JSON")
	case errors.As(err, &typeErr):
		return typeError(typeErr)
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		// encoding/json has no error type for unknown fields, only this message.
		return badRequest("unknown field %s", strings.TrimPrefix(err.Error(), "json: unknown field "))
	default:
		return err
	}
}

// typeError explains a JSON value of the wrong type. The request's fields are
// strings or numbers.
func typeError(err *json.UnmarshalTypeError) error {
	switch {
	case err.Field == "":
		return badRequest("request body must be a JSON object")
	case strings.HasPrefix(err.Value, "number "):
		// encoding/json reports a number that overflows float64 as
		// "number <literal>", e.g. "number 1e400".
		return badRequest("%q is out of range", err.Field)
	case err.Type.Kind() == reflect.String:
		return badRequest("%q must be a string", err.Field)
	default:
		return badRequest("%q must be a number", err.Field)
	}
}

// writeJSON sends v as a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// Encoding cannot fail for our response types (results are always finite),
	// and a failed write means the client is gone, so the error is ignored.
	_ = json.NewEncoder(w).Encode(v)
}
