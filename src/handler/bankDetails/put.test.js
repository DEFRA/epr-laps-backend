import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { putBankDetails } from './put.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'
import Boom from '@hapi/boom'
import { roles } from '../../common/constants/constants.js'
import {
  writeAuditLog,
  Outcome,
  ActionKind
} from '../../common/helpers/audit-logging.js'

vi.mock('node-fetch', () => ({
  default: vi.fn()
}))
vi.mock('../../config.js', () => ({
  config: { get: vi.fn() }
}))
vi.mock('../../common/helpers/audit-logging.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    writeAuditLog: vi.fn()
  }
})

describe('putBankDetails', () => {
  let request, h, mockResponse, payload

  beforeEach(() => {
    const localAuthority = 'Some Local Authority'
    payload = { accountNumber: '12345678', sortcode: '12-34-56' }

    request = {
      auth: { credentials: { role: roles.HOF }, isAuthorized: true },
      params: { localAuthority },
      payload,
      logger: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn()
      }
    }

    mockResponse = {
      json: vi.fn().mockResolvedValue({ success: true }),
      status: 200
    }

    fetch.mockResolvedValue(mockResponse)
    config.get.mockImplementation((key) => {
      if (key === 'fssApiUrl') return 'http://api.example.com'
      if (key === 'fssAPIKey') return 'some-api-key'
    })

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
    request.params = { localAuthority: 'A B&C' }
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

  it('returns status.ok when response is successful', async () => {
    await putBankDetails(request, h)
    expect(h.code).toHaveBeenCalledWith(200)
  })

  it('calls writeAuditLog on success', async () => {
    await putBankDetails(request, h)
    expect(writeAuditLog).toHaveBeenCalledTimes(1)
    expect(writeAuditLog).toHaveBeenCalledWith(
      request,
      ActionKind.BankDetailsConfirmed,
      Outcome.Success
    )
  })

  it('calls writeAuditLog on failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network down'))

    await expect(putBankDetails(request, h)).rejects.toThrow(
      'Failed to confirm bank details'
    )

    expect(writeAuditLog).toHaveBeenCalledTimes(1)
    expect(writeAuditLog).toHaveBeenCalledWith(
      request,
      ActionKind.BankDetailsConfirmed,
      Outcome.Failure
    )
  })

  it('should return forbidden if user is not authorized', async () => {
    request.auth.isAuthorized = false
    request.auth.credentials.role = roles.CEO

    const response = await putBankDetails(request, h)

    expect(response.isBoom).toBe(true)
    expect(response.output.statusCode).toBe(403)
  })
})
