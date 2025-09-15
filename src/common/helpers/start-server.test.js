import hapi from '@hapi/hapi'
import { vi, describe, beforeAll, afterAll, test, expect } from 'vitest'

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()
const mockHapiLoggerInfo = vi.fn()
const mockHapiLoggerError = vi.fn()

// Mock hapi-pino plugin
vi.mock('hapi-pino', () => ({
  default: {
    register: (server) => {
      server.decorate('server', 'logger', {
        info: mockHapiLoggerInfo,
        error: mockHapiLoggerError
      })
    },
    name: 'mock-hapi-pino'
  }
}))

// Mock custom logger
vi.mock('./logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

describe('#startServer', () => {
  let createServerModule
  let startServerModule
  let createServerSpy
  let hapiServerSpy
  let serverInstance

  beforeAll(async () => {
    // Ensure environment variable
    vi.stubEnv('PORT', '3098')

    // Import modules
    createServerModule = await import('../../server.js')
    startServerModule = await import('./start-server.js')

    // Spies
    createServerSpy = vi.spyOn(createServerModule, 'createServer')
    hapiServerSpy = vi.spyOn(hapi, 'server')
  })

  afterAll(async () => {
    // Stop server if running
    if (serverInstance) {
      await serverInstance.stop({ timeout: 0 })
    }

    // Reset all mocks
    vi.resetAllMocks()
  })

  describe('When server starts successfully', () => {
    test('Should start server and log correctly', async () => {
      serverInstance = await startServerModule.startServer()

      expect(createServerSpy).toHaveBeenCalled()
      expect(hapiServerSpy).toHaveBeenCalled()
      expect(mockHapiLoggerInfo).toHaveBeenCalledWith('Setting up MongoDb')
      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'MongoDb connected to epr-laps-backend'
      )
      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'Server started successfully'
      )
      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'Access your backend on http://localhost:3098'
      )
    })
  })

  describe('When server fails to start', () => {
    beforeAll(() => {
      createServerSpy.mockRejectedValue(new Error('Server failed to start'))
    })

    test('Should log failure messages', async () => {
      await startServerModule.startServer()

      expect(mockLoggerInfo).toHaveBeenCalledWith('Server failed to start :(')
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Server failed to start')
      )
    })
  })
})
