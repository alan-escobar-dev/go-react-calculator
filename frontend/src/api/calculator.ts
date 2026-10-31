/** A two-operand operation: the request needs both `a` and `b`. */
export type BinaryOperation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'percentage'

/** Every operation supported by the calculator API. */
export type Operation = BinaryOperation | 'sqrt'

/**
 * The body of POST /api/v1/calculate. The union mirrors the API's rule that
 * `sqrt` takes only `a`, so a request with the wrong operands does not compile.
 */
export type CalculateRequest =
  | { operation: BinaryOperation; a: number; b: number }
  | { operation: 'sqrt'; a: number }

/**
 * An error meant for the user: the API's own message (such as "cannot divide
 * by zero") or a problem reaching the API.
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const CALCULATE_URL = '/api/v1/calculate'
const UNREACHABLE = "can't reach the calculator service"
const UNEXPECTED_RESPONSE = 'unexpected response from the calculator service'

/**
 * Sends a calculation to the backend and resolves with its result. Rejects
 * with an ApiError for anything the user should see, or with fetch's
 * AbortError when `signal` cancels the request.
 */
export async function calculate(
  request: CalculateRequest,
  signal?: AbortSignal,
): Promise<number> {
  let response: Response
  try {
    response = await fetch(CALCULATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }
    throw new ApiError(UNREACHABLE)
  }

  const body = await readJson(response)
  if (response.ok) {
    if (isResultBody(body)) {
      return body.result
    }
    throw new ApiError(UNEXPECTED_RESPONSE)
  }
  // API errors carry a message. Anything else (an HTML error page from a
  // proxy, an empty body) means the request never reached the API.
  throw new ApiError(isErrorBody(body) ? body.error : UNREACHABLE)
}

/** Parses the response body as JSON, or returns undefined if it is not JSON. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function isResultBody(body: unknown): body is { result: number } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'result' in body &&
    typeof body.result === 'number'
  )
}

function isErrorBody(body: unknown): body is { error: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  )
}
