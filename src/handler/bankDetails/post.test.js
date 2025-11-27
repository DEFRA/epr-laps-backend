import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { postBankDetails } from './post.js'
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

describe('postBankDetails', () => {
  let request, h, mockResponse, payload

  beforeEach(() => {
    payload = {
      localAuthority: 'Some Local Authority',
      accountName: 'John Doe',
      sortCode: '12-34-56',
      accountNumber: '12345678',
      requesterEmail: 'jane.smith@test.com'
    }

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
      json: vi.fn().mockResolvedValue({ success: true }),
      status: 201,
      ok: true
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
    await postBankDetails(request, h)
    expect(fetch).toHaveBeenCalledWith(
      'http://api.example.com/bank-details',
      expect.objectContaining({
        method: 'post',
        headers: {
          'x-api-key': 'some-api-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    )
  })

  it('returns the response data and status', async () => {
    await postBankDetails(request, h)
    expect(h.response).toHaveBeenCalledWith({ success: true })
    expect(h.code).toHaveBeenCalledWith(201)
  })

  it('logs error and throws Boom.internal when fetch rejects', async () => {
    const networkError = new Error('Network down')
    fetch.mockRejectedValueOnce(networkError)

    await expect(postBankDetails(request, h)).rejects.toThrow(
      Boom.internal('Failed to create bank details')
    )
    expect(request.logger.error).toHaveBeenCalledWith(
      'Error creating bank details:',
      networkError
    )
  })

  it('logs error and throws Boom.internal when response.json fails', async () => {
    mockResponse.json.mockRejectedValueOnce(new Error('Bad JSON'))

    await expect(postBankDetails(request, h)).rejects.toThrow(
      Boom.internal('Failed to create bank details')
    )
    expect(request.logger.error).toHaveBeenCalled()
  })

  it('returns 201 when response is successful', async () => {
    await postBankDetails(request, h)
    expect(h.code).toHaveBeenCalledWith(201)
  })

  it('calls writeAuditLog on success', async () => {
    await postBankDetails(request, h)
    expect(writeAuditLog).toHaveBeenCalledTimes(1)
    expect(writeAuditLog).toHaveBeenCalledWith(
      request,
      ActionKind.BankDetailsCreated,
      Outcome.Success
    )
  })

  it('calls writeAuditLog on failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network down'))

    await expect(postBankDetails(request, h)).rejects.toThrow(
      'Failed to create bank details'
    )

    expect(writeAuditLog).toHaveBeenCalledTimes(1)
    expect(writeAuditLog).toHaveBeenCalledWith(
      request,
      ActionKind.BankDetailsCreated,
      Outcome.Failure
    )
  })

  it('should return forbidden if user is not authorized', async () => {
    request.auth.isAuthorized = false
    request.auth.credentials.role = roles.CEO

    const response = await postBankDetails(request, h)

    expect(response.isBoom).toBe(true)
    expect(response.output.statusCode).toBe(403)
  })

  it('logs error and returns Boom.badRequest when response.ok is false', async () => {
    const failedData = { message: 'Invalid payload' }
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Bad Request',
      json: async () => failedData
    })

    const result = await postBankDetails(request, h)

    expect(request.logger.error).toHaveBeenCalledWith(
      `Failed to create bank details: 500 Bad Request`,
      failedData
    )
    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(500)
    expect(result.output.payload.message).toBe(
      'An internal server error occurred'
    )
  })
})
