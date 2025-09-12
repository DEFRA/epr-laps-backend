import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getBankDetails } from '../../handler/bankDetails/get.js'

describe('getBankDetails', () => {
  let originalFetch

  beforeEach(() => {
    // Mock global fetch
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  const createH = () => ({
    response: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis()
  })

  it('returns masked sortcode for non-CEO roles', async () => {
    const mockRequest = {
      auth: { credentials: { localAuthority: '123', role: 'user' } }
    }
    const h = createH()

    const apiResponse = { sortcode: '123456', confirmed: true }
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(apiResponse)
    })

    await getBankDetails(mockRequest, h)

    expect(h.response).toHaveBeenCalled()
    const responseArg = h.response.mock.calls[0][0]
    expect(responseArg.sortcode).toContain('ending with')
    expect(h.code).toHaveBeenCalledWith(200)
  })

  it('sets flags correctly for HOF role', async () => {
    const mockRequest = {
      auth: { credentials: { localAuthority: '123', role: 'HOF' } }
    }
    const h = createH()

    const apiResponse = { sortcode: '123456', confirmed: false }
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(apiResponse)
    })

    await getBankDetails(mockRequest, h)

    const responseArg = h.response.mock.calls[0][0]
    expect(responseArg.showNotificationBanner).toBe(true)
    expect(responseArg.showConfirmBankDetails).toBe(true)
    expect(h.code).toHaveBeenCalledWith(200)
  })

  it('handles external API errors gracefully', async () => {
    const mockRequest = {
      auth: { credentials: { localAuthority: '123', role: 'user' } }
    }
    const h = createH()

    global.fetch.mockResolvedValue({ ok: false, status: 404 })

    await getBankDetails(mockRequest, h)

    expect(h.response).toHaveBeenCalledWith({
      error: 'Failed to fetch bank details'
    })
    expect(h.code).toHaveBeenCalledWith(500)
  })

  it('handles fetch exceptions gracefully', async () => {
    const mockRequest = {
      auth: { credentials: { localAuthority: '123', role: 'user' } }
    }
    const h = createH()

    global.fetch.mockRejectedValue(new Error('Network error'))

    await getBankDetails(mockRequest, h)

    expect(h.response).toHaveBeenCalledWith({
      error: 'Failed to fetch bank details'
    })
    expect(h.code).toHaveBeenCalledWith(500)
  })
})
