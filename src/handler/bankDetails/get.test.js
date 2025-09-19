import { describe, it, beforeEach, vi, expect } from 'vitest'
import fetch from 'node-fetch'
import { getBankDetails } from './get.js'

// ----- Mock fetch -----
vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

// ----- Mock h.response -----
const createH = () => ({
  response: vi.fn(function (payload) {
    return { code: vi.fn().mockReturnValue(payload) }
  })
})

// ----- Mock logger -----
vi.mock('./logging/logger.js', () => ({
  createLogger: () => ({ error: vi.fn() })
}))

const mockLogger = { error: vi.fn() }

// ----- Mock request helper -----
const makeRequest = (
  role = 'Chief Executive Officer',
  localAuthority = 'Glamshire County Council'
) => ({
  auth: { credentials: { role, localAuthority } },
  logger: mockLogger
})


// ----- Reset mocks -----
beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBankDetails', () => {
  it('handles external API errors', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const h = createH()
    const request = makeRequest(
      'Chief Executive Officer',
      'Glamshire County Council'
    )

    await getBankDetails(request, h)

    const responseArg = h.response.mock.calls[0][0]
    expect(responseArg.error).toBe('Failed to fetch bank details')
  })

  it('handles fetch exceptions', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const h = createH()
    const request = makeRequest(
      'Chief Executive Officer',
      'Glamshire County Council'
    )

    await getBankDetails(request, h)

    const responseArg = h.response.mock.calls[0][0]
    expect(responseArg.error).toBe('Failed to fetch bank details')
  })
})
