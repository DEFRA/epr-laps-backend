import { describe, it, beforeEach, vi, expect } from 'vitest'
import fetch from 'node-fetch'
import { getBankDetails, decryptAndParseResponse } from './get.js'
import Boom from '@hapi/boom'
import * as auditLogging from '../../common/helpers/audit-logging.js'
import * as decryptUtils from '../../common/helpers/utils/decrypt-bank-details.js'

vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

vi.mock('../../common/helpers/utils/process-bank-details.js', () => ({
  processBankDetails: vi.fn((details) => details)
}))

vi.mock('../../common/helpers/utils/decrypt-bank-details.js', () => ({
  decryptBankDetails: vi.fn()
}))

vi.spyOn(auditLogging, 'writeAuditLog')

const mockLogger = { error: vi.fn(), info: vi.fn(), debug: vi.fn() }

// Fixed makeRequest: localAuthority now in params, role in credentials
const makeRequest = (
  role = 'Chief Executive Officer',
  localAuthority = 'Some Local Authority',
  isAuthorized = false
) => ({
  auth: { credentials: { role }, isAuthorized },
  params: { localAuthority },
  logger: mockLogger
})

const makeH = () => ({
  response: (data) => ({
    code: (status) => ({ data, status })
  })
})

describe('getBankDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws Boom.internal when fetch rejects', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const request = makeRequest()
    const h = makeH()

    await expect(getBankDetails(request, h)).rejects.toThrow(Boom.Boom)
    expect(request.logger.error).toHaveBeenCalled()
  })

  it('writes to audit log correctly for CEO', async () => {
    const mockDecryptedData = { account: '12345', sortCode: '11-22-33' }
    decryptUtils.decryptBankDetails.mockReturnValueOnce(
      JSON.stringify(mockDecryptedData)
    )

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          response_data: 'encrypted_bank_data'
        }
      })
    })

    const request = {
      params: { localAuthority: 'Some Local Authority' },
      logger: mockLogger,
      auth: {
        credentials: { role: 'Chief Executive Officer' },
        isAuthorized: true
      }
    }
    const h = makeH()

    const result = await getBankDetails(request, h)

    expect(auditLogging.writeAuditLog).toHaveBeenCalledWith(
      request,
      auditLogging.ActionKind.FullBankDetailsViewed,
      auditLogging.Outcome.Success,
      true
    )
    expect(result.status).toBe(200)
  })

  it('writes to audit log correctly for Waste Officer', async () => {
    const mockDecryptedData = { account: '12345', sortCode: '11-22-33' }
    decryptUtils.decryptBankDetails.mockReturnValueOnce(
      JSON.stringify(mockDecryptedData)
    )

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          response_data: 'encrypted_bank_data'
        }
      })
    })

    const request = {
      params: { localAuthority: 'Some Local Authority' },
      logger: mockLogger,
      auth: { credentials: { role: 'Head of Finance' }, isAuthorized: false }
    }
    const h = makeH()

    const result = await getBankDetails(request, h)

    expect(auditLogging.writeAuditLog).toHaveBeenCalledWith(
      request,
      auditLogging.ActionKind.MaskedBankDetailsViewed,
      auditLogging.Outcome.Success,
      true
    )
    expect(result.status).toBe(200)
  })

  it('writes to audit log correctly for HOF', async () => {
    const mockDecryptedData = { account: '12345', sortCode: '11-22-33' }
    decryptUtils.decryptBankDetails.mockReturnValueOnce(
      JSON.stringify(mockDecryptedData)
    )

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          response_data: 'encrypted_bank_data'
        }
      })
    })

    const request = {
      params: { localAuthority: 'Some Local Authority' },
      logger: mockLogger,
      auth: { credentials: { role: 'Head of Finance' }, isAuthorized: true }
    }
    const h = makeH()

    const result = await getBankDetails(request, h)

    expect(auditLogging.writeAuditLog).toHaveBeenCalledWith(
      request,
      auditLogging.ActionKind.FullBankDetailsViewed,
      auditLogging.Outcome.Success,
      true
    )
    expect(result.status).toBe(200)
  })
})

describe('decryptAndParseResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('decrypts and parses response data successfully', () => {
    const mockDecryptedData = { account: '12345', sortCode: '11-22-33' }
    const mockResponseData = 'encrypted_data'
    decryptUtils.decryptBankDetails.mockReturnValueOnce(
      JSON.stringify(mockDecryptedData)
    )

    const request = {
      logger: mockLogger
    }

    const result = decryptAndParseResponse(mockResponseData, request)

    expect(decryptUtils.decryptBankDetails).toHaveBeenCalledWith(
      mockResponseData,
      expect.any(String)
    )
    expect(result).toEqual(mockDecryptedData)
  })

  it('throws Boom.internal when decryption fails', () => {
    const mockResponseData = 'invalid_encrypted_data'
    decryptUtils.decryptBankDetails.mockImplementationOnce(() => {
      throw new Error('Decryption failed')
    })

    const request = {
      logger: mockLogger
    }

    expect(() => decryptAndParseResponse(mockResponseData, request)).toThrow(
      Boom.Boom
    )
    expect(request.logger.error).toHaveBeenCalled()
  })

  it('throws Boom.internal when JSON parsing fails', () => {
    const mockResponseData = 'encrypted_data'
    decryptUtils.decryptBankDetails.mockReturnValueOnce('invalid json {')

    const request = {
      logger: mockLogger
    }

    expect(() => decryptAndParseResponse(mockResponseData, request)).toThrow(
      Boom.Boom
    )
    expect(request.logger.error).toHaveBeenCalled()
  })

  it('throws Boom.internal when API returns failure status', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Service down'
    })

    const request = makeRequest()
    const h = makeH()

    await expect(getBankDetails(request, h)).rejects.toMatchObject({
      message: 'Failed to fetch bank details'
    })

    expect(request.logger.error).toHaveBeenCalledWith(
      'Error fetching bank details: 500 Internal Server Error: Service down'
    )
  })

  it('uses fallback message when API error.message is missing', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: async () => ''
    })

    const request = makeRequest()
    const h = makeH()

    await expect(getBankDetails(request, h)).rejects.toMatchObject({
      message: 'Failed to fetch bank details'
    })

    expect(request.logger.error).toHaveBeenCalledWith(
      'Error fetching bank details: 502 Bad Gateway: '
    )
  })
})
