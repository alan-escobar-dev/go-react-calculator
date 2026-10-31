import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from './calculator.ts'

/** Replaces the global fetch with a mock that resolves to `response`. */
function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Asserts that `promise` rejects with an ApiError carrying `message`. */
async function expectApiError(promise: Promise<number>, message: string) {
  await expect(promise).rejects.toBeInstanceOf(ApiError)
  await expect(promise).rejects.toHaveProperty('message', message)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('calculate', () => {
  it('posts the request as JSON and resolves with the result', async () => {
    const fetchMock = stubFetch(jsonResponse({ result: 2.5 }))

    await expect(calculate({ operation: 'divide', a: 10, b: 4 })).resolves.toBe(2.5)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calculate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"operation":"divide","a":10,"b":4}',
      }),
    )
  })

  it('sends only a for sqrt', async () => {
    const fetchMock = stubFetch(jsonResponse({ result: 3 }))

    await expect(calculate({ operation: 'sqrt', a: 9 })).resolves.toBe(3)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calculate',
      expect.objectContaining({ body: '{"operation":"sqrt","a":9}' }),
    )
  })

  it('rejects with the message from an API error response', async () => {
    stubFetch(jsonResponse({ error: 'cannot divide by zero' }, 400))

    await expectApiError(
      calculate({ operation: 'divide', a: 1, b: 0 }),
      'cannot divide by zero',
    )
  })

  it('treats a non-JSON error page from a proxy as unreachable', async () => {
    stubFetch(new Response('<html>Bad Gateway</html>', { status: 502 }))

    await expectApiError(
      calculate({ operation: 'add', a: 1, b: 2 }),
      "can't reach the calculator service",
    )
  })

  it('treats a network failure as unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expectApiError(
      calculate({ operation: 'add', a: 1, b: 2 }),
      "can't reach the calculator service",
    )
  })

  it('rejects a success response without a numeric result', async () => {
    stubFetch(jsonResponse({ value: 3 }))

    await expectApiError(
      calculate({ operation: 'add', a: 1, b: 2 }),
      'unexpected response from the calculator service',
    )
  })

  it('passes the abort signal to fetch and rethrows its AbortError', async () => {
    const controller = new AbortController()
    controller.abort()
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(abortError)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      calculate({ operation: 'add', a: 1, b: 2 }, controller.signal),
    ).rejects.toBe(abortError)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calculate',
      expect.objectContaining({ signal: controller.signal }),
    )
  })
})
