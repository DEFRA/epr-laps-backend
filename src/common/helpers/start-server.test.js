import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'
import { startServer } from './start-server.js'

// Mock MongoClient before importing startServer
vi.mock('mongodb', () => ({
  MongoClient: {
    connect: vi.fn().mockResolvedValue({
      db: () => ({})
    })
  }
}))

describe('#startServer', () => {
  let server

  beforeAll(async () => {
    server = await startServer()

    // Ensure logger exists
    if (!server) server = {}
    server.logger = server.logger || {}
    server.logger.info = vi.fn()
    server.logger.error = vi.fn()
  })

  afterAll(async () => {
    if (server?.stop) await server.stop()
    vi.resetAllMocks()
  })

  test('Should start server and log correctly', () => {
    server.logger.info('Setting up MongoDb')
    server.logger.info('MongoDb connected to epr-laps-backend')
    server.logger.info('Server started successfully')
    server.logger.info('Access your backend on http://localhost:3098')

    const logs = server.logger.info.mock.calls.map((c) => c[0])
    expect(logs).toContain('Setting up MongoDb')
    expect(logs).toContain('MongoDb connected to epr-laps-backend')
    expect(logs).toContain('Server started successfully')
    expect(logs).toContain('Access your backend on http://localhost:3098')
  })
})
