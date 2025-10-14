import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import Boom from '@hapi/boom'
import { getDocument, writeDocumentAccessedAuditLog } from './getDocument'
import fetch from 'node-fetch'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  writeAuditLog,
  Outcome,
  ActionKind
} from '../../common/helpers/audit-logging.js'

vi.mock('node-fetch', async () => {
  const actual = await import('node-fetch')
  return { ...actual, default: vi.fn() }
})

vi.mock('../../config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'fssApiUrl') return 'http://mock-api.com'
      if (key === 'fssAPIKey') return 'mock-api-key'
    })
  }
}))

vi.mock('../../common/helpers/audit-logging.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    writeAuditLog: vi.fn(),
    Outcome: { Success: 'Success', Failure: 'Failure' },
    ActionKind: { DocumentAccessed: 'DocumentAccessed' }
  }
})

describe('getDocument', () => {
  let mockRequest
  let mockH
  let mockBuffer

  beforeEach(() => {
    mockRequest = {
      params: { id: 'file-123' },
      logger: { error: vi.fn() },
      auth: { isAuthorized: true }
    }

    mockBuffer = new ArrayBuffer(8)
    mockH = {
      response: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis()
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should fetch a PDF successfully and return proper response', async () => {
    fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockBuffer
    })

    const result = await getDocument(mockRequest, mockH)

    expect(fetch).toHaveBeenCalledWith(
      'http://mock-api.com/file/file-123',
      expect.objectContaining({
        method: 'GET',
        headers: { 'x-api-key': 'mock-api-key' }
      })
    )

    expect(writeAuditLog).toHaveBeenCalledWith(
      mockRequest,
      ActionKind.DocumentAccessed,
      Outcome.Success
    )

    expect(mockH.response).toHaveBeenCalledWith(Buffer.from(mockBuffer))
    expect(mockH.type).toHaveBeenCalledWith('application/pdf')
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.ok)
    expect(result).toBe(mockH)
  })

  it('should handle fetch errors and throw Boom', async () => {
    fetch.mockRejectedValue(new Error('Network error'))

    await expect(getDocument(mockRequest, mockH)).rejects.toThrow(
      Boom.internal('Error fetching file')
    )

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      'Error fetching file:',
      expect.any(Error)
    )

    expect(writeAuditLog).toHaveBeenCalledWith(
      mockRequest,
      ActionKind.DocumentAccessed,
      Outcome.Failure
    )
  })

  it('writeDocumentAccessedAuditLog should call writeAuditLog correctly', () => {
    writeDocumentAccessedAuditLog(true, mockRequest, Outcome.Success)
    writeDocumentAccessedAuditLog(false, mockRequest, Outcome.Failure)

    expect(writeAuditLog).toHaveBeenCalledTimes(2)
    expect(writeAuditLog).toHaveBeenNthCalledWith(
      1,
      mockRequest,
      ActionKind.DocumentAccessed,
      Outcome.Success
    )
    expect(writeAuditLog).toHaveBeenNthCalledWith(
      2,
      mockRequest,
      ActionKind.DocumentAccessed,
      Outcome.Failure
    )
  })
})
