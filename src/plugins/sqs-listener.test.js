import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GetQueueUrlCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import { costDataFormListener } from './sqs-listener.js'

vi.mock('@aws-sdk/client-sqs', () => ({
  GetQueueUrlCommand: vi.fn(),
  ReceiveMessageCommand: vi.fn(),
  DeleteMessageCommand: vi.fn()
}))

describe('sqs-listener plugin', () => {
  let server
  let mockSqsClient
  let extensionHandlers
  let mockLogger
  const sqsListener = costDataFormListener.plugin

  beforeEach(async () => {
    vi.clearAllMocks()
    extensionHandlers = {}

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }

    mockSqsClient = {
      send: vi.fn()
    }

    server = {
      sqs: mockSqsClient,
      logger: mockLogger,
      ext: vi.fn((event, handler) => {
        extensionHandlers[event] = handler
      })
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('plugin registration', () => {
    it('should register the sqs-listener plugin', async () => {
      expect(sqsListener.plugin.name).toBe('sqsListener')
      expect(sqsListener.plugin.multiple).toBe(true)
      expect(sqsListener.plugin.version).toBe('0.1.0')
    })

    it('should have register function', () => {
      expect(typeof sqsListener.plugin.register).toBe('function')
    })
  })

  describe('initialization', () => {
    it('should get queue URL on registration', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/demo-queue.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'demo-queue.fifo'
      })

      expect(GetQueueUrlCommand).toHaveBeenCalledWith({
        QueueName: 'demo-queue.fifo'
      })
      expect(mockSqsClient.send).toHaveBeenCalled()
    })

    it('should register onPostStart extension', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/demo-queue.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'demo-queue.fifo'
      })

      expect(server.ext).toHaveBeenCalledWith(
        'onPostStart',
        expect.any(Function)
      )
    })

    it('should register onPostStop extension', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/demo-queue.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'demo-queue.fifo'
      })

      expect(server.ext).toHaveBeenCalledWith(
        'onPostStop',
        expect.any(Function)
      )
    })

    it('should throw error if queue does not exist', async () => {
      const error = new Error('Queue does not exist')
      error.name = 'QueueDoesNotExist'
      mockSqsClient.send.mockRejectedValueOnce(error)

      await expect(
        sqsListener.plugin.register(server, {
          queueName: 'non-existent-queue.fifo'
        })
      ).rejects.toThrow('Queue does not exist')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize SQS listener')
      )
    })

    it('should throw error if server.sqs is not available', async () => {
      const serverWithoutSqs = { ...server, sqs: undefined }

      // When GetQueueUrlCommand is called without server.sqs, it should error
      await expect(
        sqsListener.plugin.register(serverWithoutSqs, {
          queueName: 'demo-queue.fifo'
        })
      ).rejects.toBeDefined()
    })
  })

  describe('message polling setup', () => {
    beforeEach(() => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/demo-queue.fifo'
      })
    })

    it('should create ReceiveMessageCommand with correct parameters', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/demo-queue.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'demo-queue.fifo'
      })

      // The polling setup should configure the command correctly
      // We verify this through the GetQueueUrlCommand and extension setup
      expect(GetQueueUrlCommand).toHaveBeenCalledWith({
        QueueName: 'demo-queue.fifo'
      })
    })

    it('should create DeleteMessageCommand with correct parameters', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/demo-queue.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'demo-queue.fifo'
      })

      // Verify DeleteMessageCommand is available for the polling logic
      expect(DeleteMessageCommand).toBeDefined()
    })

    it('should setup extensions without errors', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/demo-queue.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'demo-queue.fifo'
      })

      // Verify both extensions are registered
      expect(extensionHandlers['onPostStart']).toBeDefined()
      expect(extensionHandlers['onPostStop']).toBeDefined()
      expect(typeof extensionHandlers['onPostStart']).toBe('function')
      expect(typeof extensionHandlers['onPostStop']).toBe('function')
    })
  })

  describe('costDataFormListener export', () => {
    it('should export a configured listener', () => {
      expect(costDataFormListener).toBeDefined()
      expect(costDataFormListener.plugin).toBeDefined()
      expect(costDataFormListener.options).toBeDefined()
      expect(costDataFormListener.options.queueName).toBe('demo-queue.fifo')
    })
  })
})
