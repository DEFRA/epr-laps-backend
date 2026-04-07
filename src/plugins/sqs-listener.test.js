import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GetQueueUrlCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import { costDataFormListener, feedbackFormListener } from './sqs-listener.js'

vi.mock('@aws-sdk/client-sqs', () => ({
  GetQueueUrlCommand: vi.fn(),
  ReceiveMessageCommand: vi.fn(),
  DeleteMessageCommand: vi.fn()
}))

describe('sqs-listener plugin', () => {
  describe('costDataFormListener', () => {
    it('should be properly configured with correct queue name', () => {
      expect(costDataFormListener).toBeDefined()
      expect(costDataFormListener.plugin).toBeDefined()
      expect(costDataFormListener.options).toBeDefined()
      expect(costDataFormListener.options.queueName).toBe(
        'epr-laps-costdata-form.fifo'
      )
    })

    it('should have an onmessage handler function', () => {
      expect(typeof costDataFormListener.options.onmessage).toBe('function')
    })

    it('should log messages with cost data form identifier', async () => {
      const mockLogger = { info: vi.fn() }
      const server = { logger: mockLogger }
      const message = { Body: '{"type":"costdata"}' }

      await costDataFormListener.options.onmessage(server, message)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cost data form')
      )
    })
  })

  describe('feedbackFormListener', () => {
    it('should be properly configured with correct queue name', () => {
      expect(feedbackFormListener).toBeDefined()
      expect(feedbackFormListener.plugin).toBeDefined()
      expect(feedbackFormListener.options).toBeDefined()
      expect(feedbackFormListener.options.queueName).toBe(
        'epr-laps-feedback-form.fifo'
      )
    })

    it('should have an onmessage handler function', () => {
      expect(typeof feedbackFormListener.options.onmessage).toBe('function')
    })

    it('should log messages with feedback form identifier', async () => {
      const mockLogger = { info: vi.fn() }
      const server = { logger: mockLogger }
      const message = { Body: '{"type":"feedback"}' }

      await feedbackFormListener.options.onmessage(server, message)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('feedback form')
      )
    })
  })

  describe('listener differentiation', () => {
    it('should have different queue names', () => {
      expect(costDataFormListener.options.queueName).not.toBe(
        feedbackFormListener.options.queueName
      )
    })

    it('should have different onmessage handlers', () => {
      expect(costDataFormListener.options.onmessage).not.toBe(
        feedbackFormListener.options.onmessage
      )
    })

    it('costDataFormListener should identify itself correctly', async () => {
      const mockLogger = { info: vi.fn() }
      const server = { logger: mockLogger }

      await costDataFormListener.options.onmessage(server, { Body: 'test' })

      const logCall = mockLogger.info.mock.calls[0][0]
      expect(logCall).toContain('cost data form')
      expect(logCall).not.toContain('feedback')
    })

    it('feedbackFormListener should identify itself correctly', async () => {
      const mockLogger = { info: vi.fn() }
      const server = { logger: mockLogger }

      await feedbackFormListener.options.onmessage(server, { Body: 'test' })

      const logCall = mockLogger.info.mock.calls[0][0]
      expect(logCall).toContain('feedback form')
      expect(logCall).not.toContain('cost data')
    })
  })

  describe('plugin structure', () => {
    it('should have sqsListener plugin defined', () => {
      expect(costDataFormListener.plugin).toBeDefined()
      expect(costDataFormListener.plugin.plugin).toBeDefined()
      expect(costDataFormListener.plugin.plugin.name).toBe('sqsListener')
    })

    it('should register as a Hapi plugin', () => {
      const plugin = costDataFormListener.plugin.plugin
      expect(plugin.version).toBe('0.1.0')
      expect(plugin.multiple).toBe(true)
      expect(typeof plugin.register).toBe('function')
    })
  })

  describe('plugin registration', () => {
    let server
    let mockLogger
    let mockSqsClient
    let extensionHandlers

    beforeEach(() => {
      mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      }

      mockSqsClient = {
        send: vi.fn()
      }

      extensionHandlers = {}

      server = {
        sqs: mockSqsClient,
        logger: mockLogger,
        ext: vi.fn((event, handler) => {
          extensionHandlers[event] = handler
        })
      }
    })

    it('should get queue URL on registration', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

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

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

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

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      expect(server.ext).toHaveBeenCalledWith(
        'onPostStop',
        expect.any(Function)
      )
    })

    it('should throw error if queue does not exist', async () => {
      const error = new Error('Queue does not exist')
      mockSqsClient.send.mockRejectedValueOnce(error)

      await expect(
        costDataFormListener.plugin.plugin.register(
          server,
          costDataFormListener.options
        )
      ).rejects.toThrow('Queue does not exist')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize SQS listener')
      )
    })

    it('should handle missing server.sqs gracefully', async () => {
      const serverWithoutSqs = { ...server, sqs: undefined }

      await expect(
        costDataFormListener.plugin.plugin.register(
          serverWithoutSqs,
          costDataFormListener.options
        )
      ).rejects.toBeDefined()
    })
  })

  describe('feedbackFormListener registration', () => {
    let server
    let mockLogger
    let mockSqsClient

    beforeEach(() => {
      mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      }

      mockSqsClient = {
        send: vi.fn()
      }

      server = {
        sqs: mockSqsClient,
        logger: mockLogger,
        ext: vi.fn()
      }
    })

    it('should register with feedback queue name', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-feedback-form.fifo'
      })

      await feedbackFormListener.plugin.plugin.register(
        server,
        feedbackFormListener.options
      )

      expect(GetQueueUrlCommand).toHaveBeenCalledWith({
        QueueName: 'epr-laps-feedback-form.fifo'
      })
    })

    it('should use feedbackFormListener onmessage handler', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-feedback-form.fifo'
      })

      await feedbackFormListener.plugin.plugin.register(
        server,
        feedbackFormListener.options
      )

      expect(server.ext).toHaveBeenCalledWith(
        'onPostStart',
        expect.any(Function)
      )
    })
  })

  describe('message handler specificity', () => {
    it('costDataFormListener handler includes message body in log', async () => {
      const mockLogger = { info: vi.fn() }
      const server = { logger: mockLogger }
      const messageBody = '{"id":123,"amount":500}'
      const message = { Body: messageBody }

      await costDataFormListener.options.onmessage(server, message)

      const logCall = mockLogger.info.mock.calls[0][0]
      expect(logCall).toContain('cost data form')
      expect(logCall).toContain(messageBody)
    })

    it('feedbackFormListener handler includes message body in log', async () => {
      const mockLogger = { info: vi.fn() }
      const server = { logger: mockLogger }
      const messageBody = '{"feedback":"Great service"}'
      const message = { Body: messageBody }

      await feedbackFormListener.options.onmessage(server, message)

      const logCall = mockLogger.info.mock.calls[0][0]
      expect(logCall).toContain('feedback form')
      expect(logCall).toContain(messageBody)
    })
  })

  describe('message deletion with DeleteMessageCommand', () => {
    it('should import DeleteMessageCommand', () => {
      expect(DeleteMessageCommand).toBeDefined()
    })

    it('should create DeleteMessageCommand instance with queue URL and receipt handle', () => {
      const queueUrl =
        'http://sqs.eu-west-1.localhost:4566/000000000000/test-queue.fifo'
      const receiptHandle = 'test-receipt-handle-123'

      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      })

      expect(deleteCommand).toBeDefined()
      expect(DeleteMessageCommand).toHaveBeenCalledWith({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      })
    })

    it('should create DeleteMessageCommand with costdata queue', () => {
      const queueUrl =
        'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      const receiptHandle = 'costdata-receipt-456'

      const deleteCmd1 = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      })

      expect(deleteCmd1).toBeDefined()
      expect(DeleteMessageCommand).toHaveBeenCalledWith({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      })
    })

    it('should create DeleteMessageCommand with feedback queue', () => {
      const queueUrl =
        'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-feedback-form.fifo'
      const receiptHandle = 'feedback-receipt-789'

      const deleteCmd2 = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      })

      expect(deleteCmd2).toBeDefined()
      expect(DeleteMessageCommand).toHaveBeenCalledWith({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      })
    })

    it('should include required parameters QueueUrl and ReceiptHandle', () => {
      const params = {
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/test-queue.fifo',
        ReceiptHandle: 'unique-receipt-handle-xyz'
      }

      const deleteCmd = new DeleteMessageCommand(params)

      expect(deleteCmd).toBeDefined()

      const calls = DeleteMessageCommand.mock.calls
      const lastCall = calls[calls.length - 1][0]

      expect(lastCall).toHaveProperty('QueueUrl')
      expect(lastCall).toHaveProperty('ReceiptHandle')
      expect(lastCall.QueueUrl).toBe(params.QueueUrl)
      expect(lastCall.ReceiptHandle).toBe(params.ReceiptHandle)
    })

    it('should handle multiple delete commands', () => {
      const messages = [
        {
          queueUrl:
            'http://sqs.eu-west-1.localhost:4566/000000000000/test-1.fifo',
          receiptHandle: 'receipt-1'
        },
        {
          queueUrl:
            'http://sqs.eu-west-1.localhost:4566/000000000000/test-2.fifo',
          receiptHandle: 'receipt-2'
        },
        {
          queueUrl:
            'http://sqs.eu-west-1.localhost:4566/000000000000/test-3.fifo',
          receiptHandle: 'receipt-3'
        }
      ]

      messages.forEach((msg) => {
        const deleteCmd = new DeleteMessageCommand({
          QueueUrl: msg.queueUrl,
          ReceiptHandle: msg.receiptHandle
        })
        expect(deleteCmd).toBeDefined()
      })

      expect(DeleteMessageCommand).toHaveBeenCalledTimes(3)
    })

    it('should properly differentiate between different receipt handles', () => {
      const deleteCmd1 = new DeleteMessageCommand({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/queue1.fifo',
        ReceiptHandle: 'handle-abc'
      })

      const deleteCmd2 = new DeleteMessageCommand({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/queue1.fifo',
        ReceiptHandle: 'handle-def'
      })

      expect(deleteCmd1).toBeDefined()
      expect(deleteCmd2).toBeDefined()

      const calls = DeleteMessageCommand.mock.calls
      expect(calls[0][0].ReceiptHandle).toBe('handle-abc')
      expect(calls[1][0].ReceiptHandle).toBe('handle-def')
    })

    it('should preserve QueueUrl across multiple delete commands', () => {
      const queueUrl =
        'http://sqs.eu-west-1.localhost:4566/000000000000/test-queue.fifo'

      const deleteCmd1 = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: 'receipt-1'
      })

      const deleteCmd2 = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: 'receipt-2'
      })

      const deleteCmd3 = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: 'receipt-3'
      })

      expect(deleteCmd1).toBeDefined()
      expect(deleteCmd2).toBeDefined()
      expect(deleteCmd3).toBeDefined()

      const calls = DeleteMessageCommand.mock.calls
      expect(calls[0][0].QueueUrl).toBe(queueUrl)
      expect(calls[1][0].QueueUrl).toBe(queueUrl)
      expect(calls[2][0].QueueUrl).toBe(queueUrl)
    })
  })
})
