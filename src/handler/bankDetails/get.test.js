import { describe, it, beforeEach, vi, expect } from 'vitest'
import fetch from 'node-fetch'
import { getBankDetails } from './get.js'
import Boom from '@hapi/boom'

// ----- Mock fetch -----
vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

// ----- Mock logger -----
const mockLogger = { error: vi.fn(), info: vi.fn(), debug: vi.fn() }

// ----- Mock request helper -----
const makeRequest = (
  role = 'Chief Executive Officer',
  localAuthority = 'Glamshire County Council'
) => ({
  auth: { credentials: { role, localAuthority } },
  logger: mockLogger
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBankDetails', () => {
  it('throws Boom.internal when external API returns non-OK', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({})
    })

    const request = makeRequest()

    await expect(getBankDetails(request, {})).rejects.toThrowError(Boom.Boom)

    try {
      await getBankDetails(request, {})
    } catch (err) {
      expect(err.isBoom).toBe(true)
      expect(err.output.statusCode).toBe(500) // internal
      expect(err.message).toBe('Failed to fetch bank details')
    }
  })

  it('throws Boom.internal when fetch rejects', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const request = makeRequest()

    await expect(getBankDetails(request, {})).rejects.toThrowError(Boom.Boom)

    try {
      await getBankDetails(request, {})
    } catch (err) {
      expect(err.isBoom).toBe(true)
      expect(err.output.statusCode).toBe(500) // internal
      expect(err.message).toBe('Failed to fetch bank details')
    }
  })
})
