import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { putBankDetails } from './put.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'

vi.mock('node-fetch', () => ({
  default: vi.fn()
}))
vi.mock('../../config.js', () => ({
  config: { get: vi.fn() }
}))

describe('putBankDetails', () => {
  let request, h, mockResponse, localAuthority, payload

  beforeEach(() => {
    localAuthority = 'Some Local Authority'
    payload = { accountNumber: '12345678', sortcode: '12-34-56' }
    request = {
      auth: { credentials: { localAuthority } },
      payload
    }
    mockResponse = {
      json: vi.fn().mockResolvedValue({ success: true }),
      status: 200
    }

    fetch.mockResolvedValue(mockResponse)
    config.get.mockReturnValue('http://api.example.com')

    h = {
      response: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetch with correct URL and options', async () => {
    await putBankDetails(request, h)
    expect(fetch).toHaveBeenCalledWith(
      'http://api.example.com/bank-details/Some%20Local%20Authority',
      expect.objectContaining({
        method: 'put',
        headers: {
          'x-api-key': 'some-api-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    )
  })

  it('returns the response data and status', async () => {
    await putBankDetails(request, h)
    expect(h.response).toHaveBeenCalledWith({ success: true })
    expect(h.code).toHaveBeenCalledWith(200)
  })

  it('encodes the localAuthority in the URL', async () => {
    request.auth.credentials.localAuthority = 'A B&C'
    await putBankDetails(request, h)
    expect(fetch).toHaveBeenCalledWith(
      'http://api.example.com/bank-details/A%20B%26C',
      expect.any(Object)
    )
  })
})
