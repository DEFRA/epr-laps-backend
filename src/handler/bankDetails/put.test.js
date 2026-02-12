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
    payload = { accountNumber: '12345678', sortcode: '12-34-56' }

    request = {
      auth: { credentials: { role: roles.HOF }, isAuthorized: true },
      payload,
      logger: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn()
      }
    }

    mockResponse = {
      ok: true,
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
      'http://api.example.com/sn_gsm/bank_details/confirm_bank_details',
      expect.objectContaining({
        method: 'put',
        headers: {
          'x-sn-apikey': 'some-api-key',
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

  it('logs error and throws Boom.internal when fetch rejects', async () => {
    const networkError = new Error('Network down')
    fetch.mockRejectedValueOnce(networkError)

    await expect(putBankDetails(request, h)).rejects.toThrow(
      Boom.internal('Failed to confirm bank details')
    )
    expect(request.logger.error).toHaveBeenCalledWith(
      'Error confirming bank details: {}'
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
      Outcome.Success,
      true
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
      Outcome.Failure,
      500
    )
  })

  it('should return forbidden if user is not authorized', async () => {
    request.auth.isAuthorized = false
    request.auth.credentials.role = roles.CEO

    const response = await putBankDetails(request, h)

    expect(response.isBoom).toBe(true)
    expect(response.output.statusCode).toBe(403)
  })

  it('logs API error and throws when response is not ok', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: vi.fn().mockResolvedValue('service exploded')
    })

    await expect(putBankDetails(request, h)).rejects.toThrow(
      'Failed to confirm bank details'
    )

    expect(request.logger.error).toHaveBeenCalledWith(
      'Error confirming bank details: 500 Internal Server Error: service exploded'
    )

    expect(writeAuditLog).toHaveBeenCalledWith(
      request,
      ActionKind.BankDetailsConfirmed,
      Outcome.Failure,
      500
    )
  })
})
