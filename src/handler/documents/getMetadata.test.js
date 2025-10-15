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
      auth: { isAuthorized: true },
      logger: { info: vi.fn(), error: vi.fn() }
    }

    mockH = {
      response: vi.fn(() => ({
        code: vi.fn().mockReturnThis()
      }))
    }
  })

  it('should return metadata successfully', async () => {
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
      'https://mock-fss-api/file/metadata/LA123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'mock-api-key'
        })
      })
    )
    expect(processDocumentsByFinancialYear).toHaveBeenCalledWith(mockData)
    expect(writeAuditLog).toHaveBeenCalledWith(
      mockRequest,
      'DocumentsListed',
      Outcome.Success
    )
    expect(mockH.response).toHaveBeenCalledWith([{ year: '2024', files: [] }])
  })

  it('should throw Boom error when fetch returns non-ok response', async () => {
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
})
