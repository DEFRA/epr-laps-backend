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

// ----- Mock request helper -----
const makeRequest = (
  role = 'Chief Executive Officer',
  localAuthority = 'Glamshire County Council'
) => ({
  auth: { credentials: { role, localAuthority } }
})

// ----- Mock logger -----
vi.mock('./logging/logger.js', () => ({
  createLogger: () => ({ error: vi.fn() })
}))

// ----- Reset mocks -----
beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBankDetails', () => {
  it('returns unmasked sortcode for CEO role', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sortcode: '654321', confirmed: false })
    })

    const h = createH()
    const request = makeRequest(
      'Chief Executive Officer',
      'Glamshire County Council'
    )

    await getBankDetails(request, h)

    const responseArg = h.response.mock.calls[0][0]
    expect(responseArg.sortcode).toBe('654321')
    expect(responseArg.showDropdownDetails).toBe(true)
    expect(responseArg.showNotificationBanner).toBe(true)
  })

  it('masks sortcode for non-CEO roles', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sortcode: '123456', confirmed: true })
    })

    const h = createH()
    const request = makeRequest('Staff', 'Test Organization')

    await getBankDetails(request, h)

    const responseArg = h.response.mock.calls[0][0]
    expect(responseArg.sortcode).toBe('ending with 56')
    expect(responseArg.showDropdownDetails).toBe(false)
    expect(responseArg.showNotificationBanner).toBe(false)
  })

  it('sets flags correctly for HOF when confirmed is false', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sortcode: '987654', confirmed: false })
    })

    const h = createH()
    const request = makeRequest('Head Of Finance', 'Some Authority')

    await getBankDetails(request, h)

    const responseArg = h.response.mock.calls[0][0]
    expect(responseArg.showNotificationBanner).toBe(true)
    expect(responseArg.showConfirmBankDetails).toBe(true)
    expect(responseArg.showDropdownDetails).toBe(true)
  })

  it('does not show notification for HOF when confirmed is true', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sortcode: '987654', confirmed: true })
    })

    const h = createH()
    const request = makeRequest('Head Of Finance', 'Some Authority')

    await getBankDetails(request, h)

    const responseArg = h.response.mock.calls[0][0]
    expect(responseArg.showNotificationBanner).toBe(false)
    expect(responseArg.showConfirmBankDetails).toBe(false)
    expect(responseArg.showDropdownDetails).toBe(true)
  })

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
