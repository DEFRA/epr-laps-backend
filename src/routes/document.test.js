// src/routes/document.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import { fileRoutes } from './documents.js'
import * as getModule from '../handler/documents/getMetadata.js'

vi.mock('../handler/documents/getMetadata.js', () => ({
  getDocumentMetadata: vi.fn().mockResolvedValue([
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
}))

describe('fileRoutes routes', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()
    server = Hapi.server()
    server.route(fileRoutes)
  })

  it('GET /file/metadata/{localAuthority} calls getDocumentMetadata', async () => {
    await server.inject({
      method: 'GET',
      url: '/file/metadata/Westshire'
    })

    expect(getModule.getDocumentMetadata).toHaveBeenCalledTimes(1)
    expect(getModule.getDocumentMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ params: { localAuthority: 'Westshire' } }),
      expect.any(Object)
    )
  })
})
