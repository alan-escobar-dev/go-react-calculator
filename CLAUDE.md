# CLAUDE.md

## Project

Full-stack calculator built as a take-home assessment.

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Go REST microservice
- **Priorities:** correctness, clarity, maintainability and testability over extra features.
  Do not add features beyond the requirements without asking first.

## Repository layout

```
backend/                  Go module
  cmd/server/             entrypoint only (wiring, config, server start)
  internal/calculator/    pure arithmetic logic, no HTTP dependencies
  internal/api/           HTTP handlers, request validation, JSON responses
frontend/                 React + TypeScript (Vite)
  src/api/                typed client for the backend API
  src/components/         UI components
  src/state/              keypad reducer, display selectors, useCalculator hook
  src/utils/              display formatting helpers
docs/                     README screenshots
README.md                 setup, API examples, design decisions
PROMPTS.md                log of prompts used during development
```

## Backend conventions (Go)

- Prefer the standard library (`net/http`, `encoding/json`); use Go 1.22+ `ServeMux` routing.
- Keep `internal/calculator` pure: plain functions, no knowledge of HTTP or JSON.
- Return errors as values. Define sentinel errors (e.g. `ErrDivisionByZero`,
  `ErrNegativeSquareRoot`) in the calculator package and map them to HTTP status
  codes only in the `api` layer.
- Consistent JSON error format: `{"error": "<message>"}`, with `400` for invalid input.
- Use table-driven tests with the standard `testing` package, and `httptest` for handlers.
- Code must pass `gofmt` and `go vet`.

## Frontend conventions (React + TypeScript)

- TypeScript strict mode; avoid `any`.
- Functional components and hooks only.
- All backend calls go through `src/api`; components never call `fetch` directly.
- Validate input on the client for a better UX, but treat the backend as the source of truth.
- Show clear error messages returned by the API.
- Responsive layout with basic mobile support.
- Tests with Vitest + React Testing Library.

## Commands

- Backend tests: `cd backend && go test ./... -cover`
- Backend run: `cd backend && go run ./cmd/server` (port 8081)
- Frontend tests: `cd frontend && npm test`
- Frontend run: `cd frontend && npm run dev` (port 5173, proxy `/api` to the backend)

## Workflow

- Plan before implementing, and work in small, testable steps.
- After each step: run the relevant tests, summarize what changed, and stop so I can
  review before continuing.
- Briefly explain non-obvious decisions so they can be documented in the README.
- Suggest a short, descriptive commit message for each completed step.
