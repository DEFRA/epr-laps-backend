import { vi, describe, it, expect, beforeEach } from 'vitest'
import fetch from 'node-fetch'

import { getDocumentMetadata } from './getMetadata.js'
import { processDocumentsByFinancialYear } from '../../common/helpers/utils/process-document-details.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock config
vi.mock('../../config.js', () => ({
  config: {
    get: vi.fn().mockImplementation((key) => {
      if (key === 'fssApiUrl') return 'https://fss-api.test'
      if (key === 'fssAPIKey') return 'fake-api-key'
    })
  }
}))

// Mock fetch
vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

// Mock processDocumentsByFinancialYear
vi.mock('../../common/helpers/utils/process-document-details.js', () => ({
  processDocumentsByFinancialYear: vi.fn()
}))

describe('getDocumentMetadata', () => {
  let h
  let logger

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }

    h = {
      response: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnValue('finalResponse')
    }

    vi.clearAllMocks()
  })

  it('calls external API and returns processed response', async () => {
    const mockData = [{ id: 1 }]
    const processedData = { 2024: mockData }

    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockData)
    })

    processDocumentsByFinancialYear.mockReturnValue(processedData)

    const request = { params: { localAuthority: 'TestLA' }, logger }

    const result = await getDocumentMetadata(request, h)

    expect(fetch).toHaveBeenCalledWith(
      'https://fss-api.test/file/metadata/TestLA',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'fake-api-key',
          'Content-Type': 'application/json'
        })
      })
    )

    expect(processDocumentsByFinancialYear).toHaveBeenCalledWith(mockData)
    expect(logger.info).toHaveBeenCalledWith(
      'Processed document details response:',
      processedData
    )
    expect(h.response).toHaveBeenCalledWith(processedData)
    expect(h.code).toHaveBeenCalledWith(statusCodes.ok)
    expect(result).toBe('finalResponse')
  })

  it('throws Boom.internal when fetch returns !ok', async () => {
    fetch.mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Some error')
    })

    const request = { params: { localAuthority: 'TestLA' }, logger }

    await expect(getDocumentMetadata(request, h)).rejects.toMatchObject({
      isBoom: true,
      isServer: true,
      output: { statusCode: 500 }
    })

    expect(logger.error).toHaveBeenCalled()
  })

  it('throws Boom.internal when fetch rejects (network error)', async () => {
    fetch.mockRejectedValue(new Error('Network failure'))

    const request = { params: { localAuthority: 'TestLA' }, logger }

    await expect(getDocumentMetadata(request, h)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })

    expect(logger.error).toHaveBeenCalled()
  })

  it('throws Boom.internal when processing documents fails', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ id: 1 }])
    })

    processDocumentsByFinancialYear.mockImplementation(() => {
      throw new Error('Processor failed')
    })

    const request = { params: { localAuthority: 'TestLA' }, logger }

    await expect(getDocumentMetadata(request, h)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })

    expect(logger.error).toHaveBeenCalled()
  })
})
