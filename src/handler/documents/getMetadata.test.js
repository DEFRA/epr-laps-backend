import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDocumentMetadata } from './getMetadata.js'
import { Outcome, writeAuditLog } from '../../common/helpers/audit-logging.js'
import { processDocumentsByFinancialYear } from '../../common/helpers/utils/process-document-details.js'

vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

vi.mock('../../config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'fssApiUrl') return 'https://mock-fss-api'
      if (key === 'fssAPIKey') return 'mock-api-key'
    })
  }
}))

vi.mock('../../common/helpers/audit-logging.js', () => ({
  ActionKind: { DocumentsListed: 'DocumentsListed' },
  Outcome: { Success: 'Success', Failure: 'Failure' },
  writeAuditLog: vi.fn()
}))

vi.mock('../../common/helpers/utils/process-document-details.js', () => ({
  processDocumentsByFinancialYear: vi.fn()
}))

describe('getDocumentMetadata', () => {
  let fetch
  let mockRequest
  let mockH

  beforeEach(async () => {
    const mod = await import('node-fetch')
    fetch = mod.default
    vi.clearAllMocks()

    mockRequest = {
      params: { localAuthority: 'LA123' },
      auth: { isAuthorized: true, credentials: { role: 'admin' } },
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } // added warn for unauthorized case
    }

    mockH = {
      response: vi.fn(() => ({
        code: vi.fn().mockReturnThis()
      }))
    }
  })

  it.skip('should return metadata successfully', async () => {
    const mockData = [{ year: '2024', documents: [] }]
    fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(mockData)
    })
    processDocumentsByFinancialYear.mockReturnValue([
      { year: '2024', files: [] }
    ])

    await getDocumentMetadata(mockRequest, mockH)

    expect(fetch).toHaveBeenCalledWith(
      'https://mock-fss-api/sn_gsm/laps_documents/LA123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'x-sn-apikey': 'mock-api-key' })
      })
    )
    expect(processDocumentsByFinancialYear).toHaveBeenCalledWith(mockData)
    expect(writeAuditLog).toHaveBeenCalledWith(
      mockRequest,
      'DocumentsListed',
      Outcome.Success
    )
    expect(mockH.response).toHaveBeenCalledWith([undefined])
  })

  it('should return Boom error when fetch returns non-ok response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: vi.fn().mockResolvedValue('Server error')
    })

    const result = await getDocumentMetadata(mockRequest, mockH)

    expect(result.isBoom).toBe(true)
    expect(result.message).toBe('Server error')
  })

  it('should throw Boom error when fetch throws', async () => {
    fetch.mockRejectedValueOnce(new Error('Network failure'))

    await expect(getDocumentMetadata(mockRequest, mockH)).rejects.toMatchObject(
      {
        isBoom: true,
        message: 'Error fetching file metadata'
      }
    )

    expect(writeAuditLog).toHaveBeenCalledWith(
      mockRequest,
      'DocumentsListed',
      Outcome.Failure
    )
  })

  it('should return Boom.forbidden if user is not authorized', async () => {
    mockRequest.auth.isAuthorized = false
    mockRequest.auth.credentials.role = 'viewer'

    const result = await getDocumentMetadata(mockRequest, mockH)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(403)
    expect(result.message).toBe('viewer not allowed to get document list')
    expect(mockRequest.logger.warn).toHaveBeenCalledWith(
      'User with role viewer tried to get document list'
    )
    expect(writeAuditLog).not.toHaveBeenCalled()
  })
})
