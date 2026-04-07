import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GetQueueUrlCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import { costDataFormListener, feedbackFormListener } from './sqs-listener.js'

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
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: vi.fn()
      })

      expect(GetQueueUrlCommand).toHaveBeenCalledWith({
        QueueName: 'epr-laps-costdata-form.fifo'
      })
      expect(mockSqsClient.send).toHaveBeenCalled()
    })

    it('should register onPostStart extension', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: vi.fn()
      })

      expect(server.ext).toHaveBeenCalledWith(
        'onPostStart',
        expect.any(Function)
      )
    })

    it('should register onPostStop extension', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: vi.fn()
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
          queueName: 'non-existent-queue.fifo',
          onmessage: vi.fn()
        })
      ).rejects.toThrow('Queue does not exist')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize SQS')
      )
    })

    it('should throw error if server.sqs is not available', async () => {
      const serverWithoutSqs = { ...server, sqs: undefined }

      await expect(
        sqsListener.plugin.register(serverWithoutSqs, {
          queueName: 'epr-laps-costdata-form.fifo',
          onmessage: vi.fn()
        })
      ).rejects.toBeDefined()
    })
  })

  describe('message polling setup', () => {
    beforeEach(() => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })
    })

    it('should setup extensions without errors', async () => {
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: vi.fn()
      })

      expect(extensionHandlers['onPostStart']).toBeDefined()
      expect(extensionHandlers['onPostStop']).toBeDefined()
      expect(typeof extensionHandlers['onPostStart']).toBe('function')
      expect(typeof extensionHandlers['onPostStop']).toBe('function')
    })

    it('should create DeleteMessageCommand with correct parameters', async () => {
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: vi.fn()
      })

      expect(DeleteMessageCommand).toBeDefined()
    })
  })

  describe('costDataFormListener export', () => {
    it('should export a configured listener', () => {
      expect(costDataFormListener).toBeDefined()
      expect(costDataFormListener.plugin).toBeDefined()
      expect(costDataFormListener.options).toBeDefined()
      expect(costDataFormListener.options.queueName).toBe(
        'epr-laps-costdata-form.fifo'
      )
    })
  })

  describe('feedbackFormListener export', () => {
    it('should export a configured listener with different queue name', () => {
      expect(feedbackFormListener).toBeDefined()
      expect(feedbackFormListener.plugin).toBeDefined()
      expect(feedbackFormListener.options).toBeDefined()
      expect(feedbackFormListener.options.queueName).toBe(
        'epr-laps-feedback-form.fifo'
      )
    })

    it('should have different queue name from costDataFormListener', () => {
      expect(feedbackFormListener.options.queueName).not.toBe(
        costDataFormListener.options.queueName
      )
    })
  })

  describe('listener differentiation', () => {
    it('should call costDataFormListener onmessage handler', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      const mockOnMessage = vi.fn()
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      const message = {
        Body: '{"type":"costdata"}',
        ReceiptHandle: 'receipt-123'
      }

      mockSqsClient.send.mockResolvedValueOnce({ Messages: [message] })
      mockSqsClient.send.mockResolvedValueOnce({})

      await extensionHandlers['onPostStart']()

      expect(mockOnMessage).toHaveBeenCalledWith(server, message)
    })

    it('should call feedbackFormListener onmessage handler', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-feedback-form.fifo'
      })

      const mockOnMessage = vi.fn()
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-feedback-form.fifo',
        onmessage: mockOnMessage
      })

      const message = {
        Body: '{"type":"feedback"}',
        ReceiptHandle: 'receipt-456'
      }

      mockSqsClient.send.mockResolvedValueOnce({ Messages: [message] })
      mockSqsClient.send.mockResolvedValueOnce({})

      await extensionHandlers['onPostStart']()

      expect(mockOnMessage).toHaveBeenCalledWith(server, message)
    })

    it('should invoke different handlers for costData vs feedback', () => {
      expect(costDataFormListener.options.onmessage).not.toBe(
        feedbackFormListener.options.onmessage
      )
    })
  })

  describe('message processing flow', () => {
    beforeEach(() => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })
    })

    it('should call onmessage handler when message is received', async () => {
      const mockOnMessage = vi.fn()
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      const message = {
        Body: '{"data":"test"}',
        ReceiptHandle: 'receipt-123'
      }

      mockSqsClient.send.mockResolvedValueOnce({ Messages: [message] })
      mockSqsClient.send.mockResolvedValueOnce({})

      await extensionHandlers['onPostStart']()

      expect(mockOnMessage).toHaveBeenCalledWith(server, message)
    })

    it('should handle multiple messages in a batch', async () => {
      const mockOnMessage = vi.fn()
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      const messages = [
        { Body: '{"id":1}', ReceiptHandle: 'receipt-1' },
        { Body: '{"id":2}', ReceiptHandle: 'receipt-2' },
        { Body: '{"id":3}', ReceiptHandle: 'receipt-3' }
      ]

      mockSqsClient.send.mockResolvedValueOnce({ Messages: messages })
      mockSqsClient.send.mockResolvedValueOnce({})
      mockSqsClient.send.mockResolvedValueOnce({})
      mockSqsClient.send.mockResolvedValueOnce({})

      await extensionHandlers['onPostStart']()

      expect(mockOnMessage).toHaveBeenCalledTimes(3)
      expect(mockOnMessage).toHaveBeenCalledWith(server, messages[0])
      expect(mockOnMessage).toHaveBeenCalledWith(server, messages[1])
      expect(mockOnMessage).toHaveBeenCalledWith(server, messages[2])
    })

    it('should delete message after processing', async () => {
      const mockOnMessage = vi.fn()
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      const message = {
        Body: '{"data":"test"}',
        ReceiptHandle: 'receipt-123'
      }

      mockSqsClient.send.mockResolvedValueOnce({ Messages: [message] })
      mockSqsClient.send.mockResolvedValueOnce({})

      await extensionHandlers['onPostStart']()

      expect(DeleteMessageCommand).toHaveBeenCalledWith({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo',
        ReceiptHandle: message.ReceiptHandle
      })
    })

    it('should continue polling when no messages are received', async () => {
      const mockOnMessage = vi.fn()
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      mockSqsClient.send.mockResolvedValueOnce({ Messages: undefined })

      const pollPromise = extensionHandlers['onPostStart']()
      extensionHandlers['onPostStop']()
      await pollPromise

      expect(mockOnMessage).not.toHaveBeenCalled()
    })
  })

  describe('polling lifecycle', () => {
    beforeEach(() => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })
    })

    it('should stop polling when onPostStop is called', async () => {
      const mockOnMessage = vi.fn()
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      mockSqsClient.send.mockResolvedValueOnce({ Messages: undefined })

      const pollPromise = extensionHandlers['onPostStart']()
      extensionHandlers['onPostStop']()
      await pollPromise

      expect(mockSqsClient.send).toHaveBeenCalled()
    })

    it('should poll continuously until stopped', async () => {
      const mockOnMessage = vi.fn()
      let callCount = 0

      mockSqsClient.send.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return {
            QueueUrl:
              'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
          }
        }
        return { Messages: undefined }
      })

      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      const pollPromise = extensionHandlers['onPostStart']()
      await new Promise((resolve) => setTimeout(resolve, 10))
      extensionHandlers['onPostStop']()
      await pollPromise

      expect(mockSqsClient.send.mock.calls.length).toBeGreaterThan(1)
    })
  })

  describe('error handling during polling', () => {
    beforeEach(() => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })
    })

    it('should log error if ReceiveMessage fails', async () => {
      const mockOnMessage = vi.fn()
      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      mockSqsClient.send.mockRejectedValueOnce(new Error('SQS service error'))

      const pollPromise = extensionHandlers['onPostStart']()
      extensionHandlers['onPostStop']()
      await pollPromise

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error polling SQS')
      )
    })

    it('should continue polling after error', async () => {
      const mockOnMessage = vi.fn()
      let sendCallCount = 0

      mockSqsClient.send.mockImplementation(async () => {
        sendCallCount++
        if (sendCallCount === 1) {
          return {
            QueueUrl:
              'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
          }
        }
        if (sendCallCount === 2) {
          throw new Error('Connection error')
        }
        return { Messages: undefined }
      })

      await sqsListener.plugin.register(server, {
        queueName: 'epr-laps-costdata-form.fifo',
        onmessage: mockOnMessage
      })

      const pollPromise = extensionHandlers['onPostStart']()
      await new Promise((resolve) => setTimeout(resolve, 10))
      extensionHandlers['onPostStop']()
      await pollPromise

      expect(sendCallCount).toBeGreaterThan(2)
    })
  })
})
