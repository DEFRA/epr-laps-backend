import { describe, it, expect, beforeAll, vi } from 'vitest'
import { MongoClient } from 'mongodb'
import Wreck from '@hapi/wreck'
import { __setCachedDiscovery } from '../../plugins/auth.js'

// ----------------------------
// Mock Wreck to prevent real HTTP requests
// ----------------------------
vi.mock('@hapi/wreck', () => ({
  default: { get: vi.fn() }
}))

beforeAll(() => {
  // Provide a fake discovery document so authPlugin doesn't fetch real URL
  __setCachedDiscovery({
    jwks_uri: 'https://example.com/.well-known/jwks.json',
    issuer: 'https://example.com/'
  })

  // Mock Wreck.get to resolve with dummy JWKS
  Wreck.get.mockResolvedValue({
    payload: {
      keys: [{ kty: 'RSA', n: 'n', e: 'AQAB' }]
    }
  })
})

// ----------------------------
// MongoDB helper test
// ----------------------------
describe('#mongoDb', () => {
  let client

  it('Should setup MongoDb without errors', async () => {
    const mongoUri = 'mongodb://localhost:27017/testdb'

    client = new MongoClient(mongoUri)
    await expect(client.connect()).resolves.not.toThrow()

    const db = client.db()
    const collections = await db.listCollections().toArray()
    expect(collections).toBeInstanceOf(Array)

    await client.close()
  })
})
