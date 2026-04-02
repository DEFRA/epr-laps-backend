import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Hapi from '@hapi/hapi'
import { sqsClient } from './sqs-client.js'

let lastMockInstanceCreated

vi.mock('@aws-sdk/client-sqs', () => {
  class MockSQSClient {
    destroy = vi.fn()

    constructor(config) {
      this.config = config
      lastMockInstanceCreated = this
    }
  }

  return {
    SQSClient: MockSQSClient
  }
})

vi.mock('../config.js', () => ({
  config: {
    get: vi.fn((key) => {
      const configMap = {
        awsRegion: 'eu-west-1',
        sqsEndpoint: 'http://localhost:9324'
      }
      return configMap[key]
    })
  }
}))

describe('sqs-client plugin', () => {
  let server

  beforeEach(async () => {
    vi.clearAllMocks()
    lastMockInstanceCreated = null

    // Create a Hapi server
    server = Hapi.server({
      debug: false
    })

    // Register a fake logger plugin before registering SQS client
    // This ensures server.logger is available when stop event fires
    await server.register({
      plugin: {
        name: 'fakeLogger',
        register(srv) {
          srv.decorate('server', 'logger', {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn()
          })
        }
      }
    })
  })

  afterEach(async () => {
    if (server) {
      try {
        await server.stop()
      } catch (e) {
        // Suppress stop errors
      }
    }
  })

  describe('plugin registration', () => {
    it('should register the sqs-client plugin', async () => {
      await server.register(sqsClient)
      expect(server.registrations).toHaveProperty('sqsClient')
    })

    it('should have correct plugin metadata', () => {
      expect(sqsClient.plugin.name).toBe('sqsClient')
      expect(sqsClient.plugin.version).toBe('0.1.0')
      expect(typeof sqsClient.plugin.register).toBe('function')
    })
  })

  describe('SQSClient initialization', () => {
    it('should instantiate SQSClient with correct config', async () => {
      await server.register(sqsClient)

      expect(lastMockInstanceCreated).toBeDefined()
      expect(lastMockInstanceCreated.config).toEqual({
        region: 'eu-west-1',
        endpoint: 'http://localhost:9324'
      })
    })

    it('should use config.get() to retrieve awsRegion', async () => {
      const { config } = await import('../config.js')
      await server.register(sqsClient)

      expect(config.get).toHaveBeenCalledWith('awsRegion')
    })

    it('should use config.get() to retrieve sqsEndpoint', async () => {
      const { config } = await import('../config.js')
      await server.register(sqsClient)

      expect(config.get).toHaveBeenCalledWith('sqsEndpoint')
    })
  })

  describe('server decoration', () => {
    it('should decorate the server with sqs property', async () => {
      await server.register(sqsClient)
      expect(server.sqs).toBeDefined()
      expect(server.sqs).toHaveProperty('config')
      expect(server.sqs).toHaveProperty('destroy')
    })

    it('should make the SQS client accessible via server.sqs', async () => {
      await server.register(sqsClient)
      expect(server.sqs.destroy).toBeDefined()
      expect(typeof server.sqs.destroy).toBe('function')
    })
  })

  describe('cleanup on server stop', () => {
    it('should destroy the SQS client when the server stops', async () => {
      await server.register(sqsClient)
      const mockInstanceBeforeStop = lastMockInstanceCreated
      expect(mockInstanceBeforeStop.destroy).not.toHaveBeenCalled()

      await server.stop()
      expect(mockInstanceBeforeStop.destroy).toHaveBeenCalledTimes(1)
    })

    it('should log message when closing the SQS client', async () => {
      await server.register(sqsClient)

      await server.stop()

      expect(server.logger.info).toHaveBeenCalledWith('Closing sqs client')
    })
  })

  describe('plugin independence', () => {
    it('should not interfere with other server functionality', async () => {
      await server.register(sqsClient)

      server.route({
        method: 'GET',
        path: '/test',
        handler: () => ({ status: 'ok' })
      })

      const response = await server.inject({
        method: 'GET',
        url: '/test'
      })

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload)).toEqual({ status: 'ok' })
    })
  })
})
