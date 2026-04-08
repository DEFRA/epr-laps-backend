import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GetQueueUrlCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand
} from '@aws-sdk/client-sqs'
import {
  costDataFormListener,
  feedbackFormListener,
  handleMessage
} from './sqs-listener.js'

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

  describe('polling lifecycle and running flag', () => {
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

    it('should register onPostStop handler that stops polling', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      expect(extensionHandlers.onPostStop).toBeDefined()
      expect(typeof extensionHandlers.onPostStop).toBe('function')

      // Call onPostStop - should set running to false
      extensionHandlers.onPostStop()
    })

    it('should register onPostStart handler for polling', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      expect(extensionHandlers.onPostStart).toBeDefined()
      expect(typeof extensionHandlers.onPostStart).toBe('function')
    })

    it('should have both lifecycle handlers registered', async () => {
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
      expect(server.ext).toHaveBeenCalledWith(
        'onPostStop',
        expect.any(Function)
      )

      // Verify both handlers exist in extensionHandlers
      expect(extensionHandlers.onPostStart).toBeDefined()
      expect(extensionHandlers.onPostStop).toBeDefined()
    })

    it('onPostStop should be callable and handle running flag', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      // Calling onPostStop should not throw
      expect(() => {
        extensionHandlers.onPostStop()
      }).not.toThrow()
    })

    it('should call onPostStop multiple times without error', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      // Call onPostStop multiple times - should be idempotent
      expect(() => {
        extensionHandlers.onPostStop()
        extensionHandlers.onPostStop()
        extensionHandlers.onPostStop()
      }).not.toThrow()
    })

    it('should register lifecycle handlers with GetQueueUrlCommand', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      const extensions = []
      server.ext.mockImplementation((event, handler) => {
        extensions.push(event)
        extensionHandlers[event] = handler
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      // Verify GetQueueUrlCommand was called
      expect(GetQueueUrlCommand).toHaveBeenCalledWith({
        QueueName: 'epr-laps-costdata-form.fifo'
      })

      // Verify extensions were registered in correct order
      expect(extensions).toEqual(['onPostStart', 'onPostStop'])
    })

    it('should register onPostStop after onPostStart', async () => {
      const registerSequence = []

      server.ext.mockImplementation((event, handler) => {
        registerSequence.push(event)
        extensionHandlers[event] = handler
      })

      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-costdata-form.fifo'
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      expect(registerSequence).toEqual(['onPostStart', 'onPostStop'])
    })

    it('feedbackFormListener should have same lifecycle behavior', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/epr-laps-feedback-form.fifo'
      })

      await feedbackFormListener.plugin.plugin.register(
        server,
        feedbackFormListener.options
      )

      expect(extensionHandlers.onPostStart).toBeDefined()
      expect(extensionHandlers.onPostStop).toBeDefined()
      expect(typeof extensionHandlers.onPostStop).toBe('function')
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

  describe('polling loop and error handling', () => {
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

    it('should execute polling loop when onPostStart is called', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl:
          'http://sqs.eu-west-1.localhost:4566/000000000000/test-queue.fifo'
      })

      let callCount = 0
      mockSqsClient.send.mockImplementation(async () => {
        callCount++
        // Only allow one poll iteration before stopping
        if (callCount > 1) {
          extensionHandlers.onPostStop()
        }
        return { Messages: [] }
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      // Call onPostStart to start polling - with timeout safety
      const pollPromise = Promise.race([
        extensionHandlers.onPostStart(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Polling loop timeout')), 500)
        )
      ])

      await expect(pollPromise).resolves.toBeUndefined()
    }, 1000)

    it('should handle errors in polling loop and continue', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl: 'http://sqs.eu-west-1.localhost:4566/000000000000/test.fifo'
      })

      let callCount = 0
      mockSqsClient.send.mockImplementation(async () => {
        callCount++
        if (callCount === 2) {
          // First poll fails
          throw new Error('SQS connection error')
        } else if (callCount === 3) {
          // Second poll succeeds but we stop
          extensionHandlers.onPostStop()
        }
        return { Messages: [] }
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      const pollPromise = Promise.race([
        extensionHandlers.onPostStart(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Polling loop timeout')), 500)
        )
      ])

      await expect(pollPromise).resolves.toBeUndefined()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error polling SQS')
      )
    }, 1000)

    it('should stop polling when running flag is set to false', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl: 'http://sqs.eu-west-1.localhost:4566/000000000000/test.fifo'
      })

      let pollCount = 0
      mockSqsClient.send.mockImplementation(async () => {
        pollCount++
        if (pollCount > 2) {
          extensionHandlers.onPostStop()
        }
        return { Messages: [] }
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      const pollPromise = Promise.race([
        extensionHandlers.onPostStart(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Polling loop timeout')), 500)
        )
      ])

      await expect(pollPromise).resolves.toBeUndefined()

      // Should have called send at least once for queue URL and at least once for polling
      expect(mockSqsClient.send.mock.calls.length).toBeGreaterThanOrEqual(2)
    }, 1000)

    it('should catch and log SQS polling errors without stopping', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl: 'http://sqs.eu-west-1.localhost:4566/000000000000/test.fifo'
      })

      let callCount = 0
      mockSqsClient.send.mockImplementation(async () => {
        callCount++
        if (callCount === 2) {
          throw new Error('Network timeout')
        } else if (callCount === 3) {
          extensionHandlers.onPostStop()
        }
        return { Messages: [] }
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      const pollPromise = Promise.race([
        extensionHandlers.onPostStart(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Polling loop timeout')), 500)
        )
      ])

      await expect(pollPromise).resolves.toBeUndefined()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error polling SQS: Network timeout')
      )
    }, 1000)

    it('should keep polling while running flag is true', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl: 'http://sqs.eu-west-1.localhost:4566/000000000000/test.fifo'
      })

      let pollCount = 0
      mockSqsClient.send.mockImplementation(async () => {
        pollCount++
        if (pollCount >= 3) {
          extensionHandlers.onPostStop()
        }
        return { Messages: [] }
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      const pollPromise = Promise.race([
        extensionHandlers.onPostStart(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Polling loop timeout')), 500)
        )
      ])

      await expect(pollPromise).resolves.toBeUndefined()

      // Should have polled multiple times
      expect(pollCount).toBeGreaterThan(1)
    }, 1000)

    it('should exit polling loop on onPostStop call', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl: 'http://sqs.eu-west-1.localhost:4566/000000000000/test.fifo'
      })

      let pollCount = 0
      mockSqsClient.send.mockImplementation(async () => {
        pollCount++
        if (pollCount >= 2) {
          extensionHandlers.onPostStop()
        }
        return { Messages: [] }
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      const pollPromise = Promise.race([
        extensionHandlers.onPostStart(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Polling loop timeout')), 500)
        )
      ])

      await expect(pollPromise).resolves.toBeUndefined()

      // Should have completed without timeout
      expect(pollCount).toBeGreaterThan(0)
    }, 1000)

    it('should handle ReceiveMessageCommand in polling loop', async () => {
      mockSqsClient.send.mockResolvedValueOnce({
        QueueUrl: 'http://sqs.eu-west-1.localhost:4566/000000000000/test.fifo'
      })

      let callCount = 0
      mockSqsClient.send.mockImplementation(async () => {
        callCount++
        if (callCount > 1) {
          extensionHandlers.onPostStop()
        }
        return { Messages: [] }
      })

      await costDataFormListener.plugin.plugin.register(
        server,
        costDataFormListener.options
      )

      const pollPromise = Promise.race([
        extensionHandlers.onPostStart(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Polling loop timeout')), 500)
        )
      ])

      await expect(pollPromise).resolves.toBeUndefined()

      // Check that ReceiveMessageCommand was used in polling
      const receiveCalls = ReceiveMessageCommand.mock.calls.filter((call) =>
        call[0]?.QueueUrl?.includes('test')
      )
      expect(receiveCalls.length).toBeGreaterThan(0)
    }, 1000)
  })

  describe('handleMessage function', () => {
    let server
    let options
    let queueUrl

    beforeEach(() => {
      server = {
        sqs: { send: vi.fn() },
        logger: { info: vi.fn(), error: vi.fn() }
      }

      options = {
        onmessage: vi.fn()
      }

      queueUrl =
        'http://sqs.eu-west-1.localhost:4566/000000000000/test-queue.fifo'

      // Reset all mocks before each test
      vi.clearAllMocks()
    })

    describe('with no messages', () => {
      it('should not call onmessage when response.Messages is undefined', async () => {
        server.sqs.send.mockResolvedValueOnce({ Messages: undefined })

        await handleMessage(server, options, queueUrl)

        expect(options.onmessage).not.toHaveBeenCalled()
      })

      it('should not call onmessage when response.Messages is null', async () => {
        server.sqs.send.mockResolvedValueOnce({ Messages: null })

        await handleMessage(server, options, queueUrl)

        expect(options.onmessage).not.toHaveBeenCalled()
      })

      it('should not call onmessage when response.Messages is empty array', async () => {
        server.sqs.send.mockResolvedValueOnce({ Messages: [] })

        await handleMessage(server, options, queueUrl)

        expect(options.onmessage).not.toHaveBeenCalled()
      })

      it('should not send DeleteMessageCommand when there are no messages', async () => {
        server.sqs.send.mockResolvedValueOnce({ Messages: [] })

        await handleMessage(server, options, queueUrl)

        expect(ReceiveMessageCommand).toHaveBeenCalled()
        const calls = server.sqs.send.mock.calls.filter(
          (call) => call[0]?.constructor.name === 'DeleteMessageCommand'
        )
        expect(calls).toHaveLength(0)
      })
    })

    describe('with single message', () => {
      it('should call onmessage handler with server and message', async () => {
        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, options, queueUrl)

        expect(options.onmessage).toHaveBeenCalledWith(server, message)
        expect(options.onmessage).toHaveBeenCalledTimes(1)
      })

      it('should send DeleteMessageCommand with correct parameters', async () => {
        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, options, queueUrl)

        expect(DeleteMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle
        })
      })

      it('should process message then delete it', async () => {
        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, options, queueUrl)

        expect(options.onmessage).toHaveBeenCalled()
        expect(server.sqs.send).toHaveBeenCalled()
      })

      it('should call ReceiveMessageCommand with correct parameters', async () => {
        server.sqs.send.mockResolvedValueOnce({
          Messages: [{ Body: 'test', ReceiptHandle: 'receipt-123' }]
        })

        await handleMessage(server, options, queueUrl)

        expect(ReceiveMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20
        })
      })
    })

    describe('with multiple messages', () => {
      it('should call onmessage for each message', async () => {
        const messages = [
          { Body: '{"id":1}', ReceiptHandle: 'receipt-1' },
          { Body: '{"id":2}', ReceiptHandle: 'receipt-2' },
          { Body: '{"id":3}', ReceiptHandle: 'receipt-3' }
        ]
        server.sqs.send.mockResolvedValueOnce({ Messages: messages })

        await handleMessage(server, options, queueUrl)

        expect(options.onmessage).toHaveBeenCalledTimes(3)
        expect(options.onmessage).toHaveBeenCalledWith(server, messages[0])
        expect(options.onmessage).toHaveBeenCalledWith(server, messages[1])
        expect(options.onmessage).toHaveBeenCalledWith(server, messages[2])
      })

      it('should send DeleteMessageCommand for each message', async () => {
        const messages = [
          { Body: '{"id":1}', ReceiptHandle: 'receipt-1' },
          { Body: '{"id":2}', ReceiptHandle: 'receipt-2' },
          { Body: '{"id":3}', ReceiptHandle: 'receipt-3' }
        ]
        server.sqs.send.mockResolvedValueOnce({ Messages: messages })

        await handleMessage(server, options, queueUrl)

        expect(DeleteMessageCommand).toHaveBeenCalledTimes(3)
        expect(DeleteMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl,
          ReceiptHandle: 'receipt-1'
        })
        expect(DeleteMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl,
          ReceiptHandle: 'receipt-2'
        })
        expect(DeleteMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl,
          ReceiptHandle: 'receipt-3'
        })
      })

      it('should process messages in order', async () => {
        const callOrder = []
        options.onmessage.mockImplementation((server, message) => {
          callOrder.push(message.ReceiptHandle)
        })

        const messages = [
          { Body: '{"id":1}', ReceiptHandle: 'receipt-1' },
          { Body: '{"id":2}', ReceiptHandle: 'receipt-2' }
        ]
        server.sqs.send.mockResolvedValueOnce({ Messages: messages })

        await handleMessage(server, options, queueUrl)

        expect(callOrder).toEqual(['receipt-1', 'receipt-2'])
      })

      it('should handle maximum batch size (10 messages)', async () => {
        const messages = Array.from({ length: 10 }, (_, i) => ({
          Body: `{"id":${i + 1}}`,
          ReceiptHandle: `receipt-${i + 1}`
        }))
        server.sqs.send.mockResolvedValueOnce({ Messages: messages })

        await handleMessage(server, options, queueUrl)

        expect(options.onmessage).toHaveBeenCalledTimes(10)
        expect(DeleteMessageCommand).toHaveBeenCalledTimes(10)
      })
    })

    describe('message properties', () => {
      it('should use message ReceiptHandle for deletion', async () => {
        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'unique-receipt-handle-xyz'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, options, queueUrl)

        expect(DeleteMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl,
          ReceiptHandle: 'unique-receipt-handle-xyz'
        })
      })

      it('should preserve message body data', async () => {
        const messageBody = '{"id":456,"amount":1000,"status":"pending"}'
        const message = {
          Body: messageBody,
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, options, queueUrl)

        expect(options.onmessage).toHaveBeenCalledWith(
          server,
          expect.objectContaining({
            Body: messageBody
          })
        )
      })

      it('should use correct queue URL for deletion', async () => {
        const queueUrl1 =
          'http://sqs.eu-west-1.localhost:4566/000000000000/queue1.fifo'
        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, options, queueUrl1)

        expect(DeleteMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl1,
          ReceiptHandle: 'receipt-123'
        })
      })

      it('should handle different queue URLs for different calls', async () => {
        const queueUrl1 =
          'http://sqs.eu-west-1.localhost:4566/000000000000/queue1.fifo'
        const queueUrl2 =
          'http://sqs.eu-west-1.localhost:4566/000000000000/queue2.fifo'

        server.sqs.send.mockResolvedValueOnce({
          Messages: [{ Body: '{"id":1}', ReceiptHandle: 'receipt-1' }]
        })
        await handleMessage(server, options, queueUrl1)

        server.sqs.send.mockResolvedValueOnce({
          Messages: [{ Body: '{"id":2}', ReceiptHandle: 'receipt-2' }]
        })
        await handleMessage(server, options, queueUrl2)

        const calls = DeleteMessageCommand.mock.calls
        expect(calls[0][0].QueueUrl).toBe(queueUrl1)
        expect(calls[1][0].QueueUrl).toBe(queueUrl2)
      })
    })

    describe('error handling', () => {
      it('should allow onmessage handler to throw and propagate error', async () => {
        const error = new Error('Processing failed')
        options.onmessage.mockRejectedValueOnce(error)

        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await expect(handleMessage(server, options, queueUrl)).rejects.toThrow(
          'Processing failed'
        )
      })

      it('should allow SQS send to throw and propagate error', async () => {
        const error = new Error('SQS error')
        server.sqs.send.mockRejectedValueOnce(error)

        // First call for ReceiveMessageCommand fails
        await expect(handleMessage(server, options, queueUrl)).rejects.toThrow(
          'SQS error'
        )
      })

      it('should stop processing if onmessage fails on first message', async () => {
        const error = new Error('Processing failed')
        options.onmessage.mockRejectedValueOnce(error)

        const messages = [
          { Body: '{"id":1}', ReceiptHandle: 'receipt-1' },
          { Body: '{"id":2}', ReceiptHandle: 'receipt-2' }
        ]
        server.sqs.send.mockResolvedValueOnce({ Messages: messages })

        try {
          await handleMessage(server, options, queueUrl)
        } catch (e) {
          // Error expected
        }

        expect(options.onmessage).toHaveBeenCalledTimes(1)
        // DeleteMessageCommand should not be called
        expect(DeleteMessageCommand).not.toHaveBeenCalled()
      })
    })

    describe('async behavior', () => {
      it('should await onmessage handler', async () => {
        let handlerCompleted = false
        options.onmessage.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          handlerCompleted = true
        })

        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, options, queueUrl)

        expect(handlerCompleted).toBe(true)
      })

      it('should await SQS send command', async () => {
        let sendCompleted = false
        server.sqs.send.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          sendCompleted = true
        })

        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        // First call for ReceiveMessageCommand
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, options, queueUrl)

        expect(sendCompleted).toBe(true)
      })
    })

    describe('parameter passing', () => {
      it('should pass correct server instance', async () => {
        const customServer = {
          ...server,
          customProp: 'custom-value'
        }

        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(customServer, options, queueUrl)

        expect(options.onmessage).toHaveBeenCalledWith(customServer, message)
      })

      it('should pass correct options instance', async () => {
        const customOptions = {
          onmessage: vi.fn(),
          customProp: 'custom-value'
        }

        const message = {
          Body: '{"data":"test"}',
          ReceiptHandle: 'receipt-123'
        }
        server.sqs.send.mockResolvedValueOnce({ Messages: [message] })

        await handleMessage(server, customOptions, queueUrl)

        expect(customOptions.onmessage).toHaveBeenCalledWith(server, message)
      })

      it('should maintain reference to queueUrl throughout execution', async () => {
        const messages = [
          { Body: '{"id":1}', ReceiptHandle: 'receipt-1' },
          { Body: '{"id":2}', ReceiptHandle: 'receipt-2' }
        ]
        server.sqs.send.mockResolvedValueOnce({ Messages: messages })

        await handleMessage(server, options, queueUrl)

        expect(DeleteMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl,
          ReceiptHandle: 'receipt-1'
        })
        expect(DeleteMessageCommand).toHaveBeenCalledWith({
          QueueUrl: queueUrl,
          ReceiptHandle: 'receipt-2'
        })
      })
    })
  })
})
