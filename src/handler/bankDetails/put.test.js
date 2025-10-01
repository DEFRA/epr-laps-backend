import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { putBankDetails } from './put.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'
import Boom from '@hapi/boom'

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
      auth: { credentials: { localAuthority, role: 'HOF' } },
      payload,
      logger: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn()
      }
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

  it('logs error and throws Boom.internal when fetch rejects', async () => {
    const networkError = new Error('Network down')
    fetch.mockRejectedValueOnce(networkError)

    await expect(putBankDetails(request, h)).rejects.toThrow(
      Boom.internal('Failed to confirm bank details')
    )
    expect(request.logger.error).toHaveBeenCalledWith(
      'Error confirming bank details:',
      networkError
    )
  })

  it('logs error and throws Boom.internal when response.json fails', async () => {
    mockResponse.json.mockRejectedValueOnce(new Error('Bad JSON'))

    await expect(putBankDetails(request, h)).rejects.toThrow(
      Boom.internal('Failed to confirm bank details')
    )
    expect(request.logger.error).toHaveBeenCalled()
  })
})
