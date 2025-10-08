import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fetch from 'node-fetch'
import { getDocumentMetadata } from './getMetadata.js'

vi.mock('node-fetch', () => ({ default: vi.fn() }))

vi.mock('../../common/helpers/utils/process-document-details.js', () => ({
  processDocumentDetails: vi.fn().mockReturnValue('processedData')
}))

describe('getDocumentMetadata', () => {
  let mockResponse

  beforeEach(() => {
    vi.resetAllMocks()

    mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([
        {
          id: '12345-abcde-67890-fghij',
          fileName: 'file_report_2024.pdf',
          localAuthority: 'Newcastle City Council',
          financialYear: '2024',
          quarter: 'Q2',
          creationDate: '20/10/2024',
          documentType: 'grant',
          language: 'EN'
        }
      ]),
      text: vi.fn().mockResolvedValue('Not Found')
    }

    fetch.mockResolvedValue(mockResponse)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call the external API with correct URL', async () => {
    const request = {
      params: { localAuthority: 'Newcastle City Council' },
      logger: { info: vi.fn(), error: vi.fn() }
    }

    const codeMock = vi.fn().mockReturnValue('finalResponse')
    const h = { response: vi.fn().mockReturnValue({ code: codeMock }) }

    await getDocumentMetadata(request, h)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/file/metadata/Newcastle City Council'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': expect.any(String),
          'Content-Type': 'application/json'
        })
      })
    )
  })

  it('should return data from the external API', async () => {
    const request = {
      params: { localAuthority: 'Newcastle City Council' },
      logger: { info: vi.fn(), error: vi.fn() }
    }

    const codeMock = vi.fn().mockReturnValue('finalResponse')
    const h = { response: vi.fn().mockReturnValue({ code: codeMock }) }

    const result = await getDocumentMetadata(request, h)

    expect(h.response).toHaveBeenCalledWith(await mockResponse.json())
    expect(codeMock).toHaveBeenCalledWith(200)
    expect(result).toBe('finalResponse')
  })

  it('should throw Boom.internal on non-OK responses', async () => {
    mockResponse.ok = false
    mockResponse.status = 404
    mockResponse.text = vi.fn().mockResolvedValue('Not Found')

    const request = {
      params: { localAuthority: 'Unknown Council' },
      logger: { info: vi.fn(), error: vi.fn() }
    }

    const h = {}

    await expect(getDocumentMetadata(request, h)).rejects.toMatchObject({
      isBoom: true,
      isServer: true
    })

    expect(request.logger.error).toHaveBeenCalledWith(
      'Error fetching file metadata:',
      expect.any(Error)
    )
  })

  it('should throw Boom.internal on fetch errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const request = {
      params: { localAuthority: 'Newcastle City Council' },
      logger: { info: vi.fn(), error: vi.fn() }
    }

    const h = {}

    await expect(getDocumentMetadata(request, h)).rejects.toMatchObject({
      isBoom: true,
      isServer: true
    })

    expect(request.logger.error).toHaveBeenCalledWith(
      'Error fetching file metadata:',
      expect.any(Error)
    )
  })
})
