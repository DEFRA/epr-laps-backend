import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fetch from 'node-fetch'
import { getDocumentMetadata } from './getMetadata.js'

vi.mock('node-fetch', () => ({ default: vi.fn() }))

describe('getDocumentMetadata', () => {
  let mockResponse

  beforeEach(() => {
    vi.resetAllMocks()

    mockResponse = {
      ok: true,
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
      text: vi.fn().mockResolvedValue('Not Found'),
      status: 404
    }

    fetch.mockResolvedValue(mockResponse)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call the external API with correct URL', async () => {
    const request = { params: { localAuthority: 'Newcastle City Council' } }
    const h = { response: vi.fn().mockReturnValue({ code: vi.fn() }) }

    await getDocumentMetadata(request, h)

    expect(fetch).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/file/metadata/Newcastle%20City%20Council'),
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
    const request = { params: { localAuthority: 'Newcastle City Council' } }
    const codeMock = vi.fn()
    const responseMock = { code: codeMock }
    const h = { response: vi.fn().mockReturnValue(responseMock) }

    await getDocumentMetadata(request, h)

    expect(h.response).toHaveBeenCalledWith(await mockResponse.json())
    expect(codeMock).toHaveBeenCalledWith(200)
  })

  it('should handle non-OK responses', async () => {
    mockResponse.ok = false
    mockResponse.text = vi.fn().mockResolvedValue('Not Found')

    const request = { params: { localAuthority: 'Unknown Council' } }
    const codeMock = vi.fn()
    const h = { response: vi.fn().mockReturnValue({ code: codeMock }) }

    await getDocumentMetadata(request, h)

    expect(h.response).toHaveBeenCalledWith({ error: 'Not Found' })
    expect(codeMock).toHaveBeenCalledWith(mockResponse.status)
  })

  it('should handle fetch errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const request = { params: { localAuthority: 'Newcastle City Council' } }
    const codeMock = vi.fn()
    const h = { response: vi.fn().mockReturnValue({ code: codeMock }) }

    await getDocumentMetadata(request, h)

    expect(h.response).toHaveBeenCalledWith({ error: 'Internal Server Error' })
    expect(codeMock).toHaveBeenCalledWith(500)
  })
})
