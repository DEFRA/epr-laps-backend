import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDocument } from './getDocument.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'
import { statusCodes } from '../../common/constants/status-codes.js'

vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

vi.mock('../../config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

describe('getDocument', () => {
  const mockRequest = {
    params: { id: '123' },
    logger: { error: vi.fn() }
  }

  const mockH = {
    response: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch the document successfully', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'fssApiUrl') return 'https://example.com'
      if (key === 'fssAPIKey') return 'apikey'
    })

    const mockArrayBuffer = new ArrayBuffer(8)
    fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer)
    })

    const result = await getDocument(mockRequest, mockH)

    expect(fetch).toHaveBeenCalledWith('https://example.com/file/123', {
      method: 'GET',
      headers: { 'x-api-key': 'apikey' }
    })

    expect(mockH.response).toHaveBeenCalledWith(Buffer.from(mockArrayBuffer))
    expect(mockH.type).toHaveBeenCalledWith('application/pdf')
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.ok)
    expect(result).toBe(mockH)
  })

  it('should throw Boom.internal if fetch fails', async () => {
    const mockRequest = {
      params: { id: '12345' },
      logger: { error: vi.fn() }
    }

    const mockH = {}
    fetch.mockRejectedValue(new Error('Network error'))

    await expect(getDocument(mockRequest, mockH)).rejects.toMatchObject({
      isBoom: true,
      isServer: true
    })

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      'Error fetching file:',
      expect.any(Error)
    )
  })

  it('should throw Boom.internal on unexpected error', async () => {
    const mockRequest = {
      params: { id: '12345' },
      logger: { error: vi.fn() }
    }

    const mockH = {}
    fetch.mockRejectedValue(new Error('Network error'))

    await expect(getDocument(mockRequest, mockH)).rejects.toMatchObject({
      isBoom: true,
      isServer: true
    })

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      'Error fetching file:',
      expect.any(Error)
    )
  })
})
