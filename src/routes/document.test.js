import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import { createFileRoutes } from './documents.js'

const getDocumentMetadata = vi.fn().mockResolvedValue([
  {
    id: '1',
    fileName: 'test.pdf',
    localAuthority: 'Westshire',
    financialYear: '2025',
    quarter: 'Q1',
    creationDate: '2025-10-02',
    documentType: 'report',
    language: 'en'
  }
])

describe('fileRoutes routes', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()
    server = Hapi.server()
    const fileRoutes = createFileRoutes({ getDocumentMetadata })
    server.route(fileRoutes)
  })

  it('GET /file/metadata/{localAuthority} calls getDocumentMetadata', async () => {
    await server.inject({
      method: 'GET',
      url: '/file/metadata/Westshire'
    })

    expect(getDocumentMetadata).toHaveBeenCalledTimes(1)
    expect(getDocumentMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ params: { localAuthority: 'Westshire' } }),
      expect.any(Object)
    )
  })
})
