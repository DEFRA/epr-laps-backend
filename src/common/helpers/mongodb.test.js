// src/common/helpers/mongodb.test.js
import { mongoDb } from './mongodb.js'
import { createServer } from '../../server.js'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

// ----------------------------
// Mock config.get for auth discovery URL
// ----------------------------
vi.mock('./../config.js', () => ({
  config: {
    get: vi.fn().mockImplementation((key) => {
      if (key === 'auth.discoveryUrl') {
        return 'https://example.com/.well-known/openid-configuration'
      }
      return ''
    })
  }
}))

// ----------------------------
// Mock fetch for JWKS
// ----------------------------
vi.mock('node-fetch', () => ({
  default: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      jwks_uri: 'https://example.com/.well-known/jwks.json'
    })
  })
}))

// ----------------------------
// Mock MongoClient
// ----------------------------
vi.mock('mongodb', () => ({
  MongoClient: {
    connect: vi.fn().mockResolvedValue({
      db: () => ({
        collection: () => ({
          createIndex: vi.fn().mockResolvedValue(true)
        })
      }),
      topology: { isConnected: () => true },
      close: vi.fn()
    })
  }
}))

// ----------------------------
// Mock LockManager (mongo-locks)
// ----------------------------
vi.mock('mongo-locks', () => ({
  LockManager: vi.fn().mockImplementation(() => ({
    acquire: vi.fn(),
    release: vi.fn()
  }))
}))

// ----------------------------
// Tests
// ----------------------------
describe('#mongoDb', () => {
  let server

  beforeEach(async () => {
    server = await createServer()

    // Ensure logger exists
    server.logger = server.logger || {}
    server.logger.info = vi.fn()
    server.logger.error = vi.fn()
  })

  afterEach(async () => {
    if (server?.stop) await server.stop()
    vi.resetAllMocks()
  })

  test('Should setup MongoDb without errors', async () => {
    await mongoDb.plugin.register(server, {
      mongoUrl: 'mongodb://localhost:27017/test',
      mongoOptions: {},
      databaseName: 'test'
    })

    const logs = server.logger.info.mock.calls.map((c) => c[0])
    expect(logs.join('')).toContain('Setting up MongoDb')
    expect(logs.join('')).toContain('MongoDb connected to test')

    // Ensure server decorated
    expect(server.mongoClient).toBeDefined()
    expect(server.db).toBeDefined()

    // Locker mock check
    expect(server.locker).toHaveProperty('acquire')
    expect(server.locker).toHaveProperty('release')

    // Request decorations
    expect(typeof server.decorate).toBe('function')
  })
})
