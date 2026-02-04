import {
  describe,
  it,
  vi,
  expect,
  beforeEach,
  afterEach,
  beforeAll
} from 'vitest'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  writeAuditLog,
  Outcome,
  ActionKind
} from '../../common/helpers/audit-logging.js'

vi.mock('node-fetch', async () => ({ default: vi.fn() }))
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

let getDocument
let writeDocumentAccessedAuditLog

beforeAll(async () => {
  const module = await import('./getDocument.js')
  getDocument = module.getDocument
  writeDocumentAccessedAuditLog = module.writeDocumentAccessedAuditLog
})

describe('getDocument', () => {
  let mockRequest, mockH, mockBuffer

  beforeEach(() => {
    mockRequest = {
      params: { id: 'file-123' },
      logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
      auth: { isAuthorized: true, credentials: { role: 'admin' } }
    }
    mockBuffer = new ArrayBuffer(8)
    mockH = {
      response: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis()
    }
    vi.clearAllMocks()
  })

  afterEach(() => vi.resetAllMocks())

  it('fetches a PDF successfully and returns proper response', async () => {
    const fetchMock = (await import('node-fetch')).default
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => mockBuffer,
      text: async () => ''
    })

    const result = await getDocument(mockRequest, mockH)

    expect(fetchMock).toHaveBeenCalled()
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

  it('handles fetch rejection and throws Boom', async () => {
    const fetchMock = (await import('node-fetch')).default
    fetchMock.mockRejectedValueOnce(new Error('Network error'))

    await expect(getDocument(mockRequest, mockH)).rejects.toMatchObject({
      isBoom: true,
      message: 'Error fetching file'
    })
    expect(mockRequest.logger.error).toHaveBeenCalled()
    expect(writeAuditLog).toHaveBeenCalledWith(
      mockRequest,
      ActionKind.DocumentAccessed,
      Outcome.Failure
    )
  })

  it('handles fetch resolving with non-ok response', async () => {
    const fetchMock = (await import('node-fetch')).default
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Server error'
    })

    const result = await getDocument(mockRequest, mockH)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(500)
    expect(result.message).toBe('Error fetching file:')

    expect(writeAuditLog).toHaveBeenCalledWith(
      mockRequest,
      ActionKind.DocumentAccessed,
      Outcome.Failure
    )
  })

  it('returns forbidden for unauthorized user', async () => {
    mockRequest.auth.isAuthorized = false
    const result = await getDocument(mockRequest, mockH)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(403)
    expect(mockRequest.logger.warn).toHaveBeenCalled()
  })

  it('writeDocumentAccessedAuditLog calls writeAuditLog for both true/false', () => {
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
