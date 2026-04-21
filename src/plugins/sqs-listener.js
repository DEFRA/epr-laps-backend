import {
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand
} from '@aws-sdk/client-sqs'
import {
  ActionKind,
  Outcome,
  writeFormsAuditLog
} from '../common/helpers/audit-logging.js'
import { statusCodes } from '../common/constants/status-codes.js'

const COST_DATA_ANONYMOUS_USER = {
  user_id: 'user123',
  user_email: 'laps.cost.user@defra.com',
  user_first_name: 'Laps Cost User',
  user_last_name: 'Cost User'
}

const FEEDBACK_ANONYMOUS_USER = {
  user_id: 'user123',
  user_email: 'laps.feedback.user@defra.com',
  user_first_name: 'Laps Feedback User',
  user_last_name: 'Feedback User'
}

const sqsListener = {
  plugin: {
    name: 'sqsListener',
    multiple: true,
    version: '0.1.0',
    register: async function (server, options) {
      let running = true

      try {
        const queueUrlResult = await server.sqs.send(
          new GetQueueUrlCommand({ QueueName: options.queueName })
        )
        const queueUrl = queueUrlResult.QueueUrl

        const poll = async () => {
          while (true) {
            if (!running) {
              break
            }

            try {
              await handleMessage(server, options, queueUrl)
            } catch (error) {
              server.logger.error(`Error polling SQS: ${error.message}`)
            }
          }
        }

        server.ext('onPostStart', async () => {
          await poll()
        })

        server.ext('onPostStop', () => {
          running = false
        })
      } catch (error) {
        server.logger.error(
          `Failed to initialize SQS listener: ${error.message}`
        )
        throw error
      }
    }
  }
}

const handleMessage = async (server, options, queueUrl) => {
  const response = await server.sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20
    })
  )
  if (response.Messages) {
    for (const message of response.Messages) {
      await options.onmessage(server, message)
      await server.sqs.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle
        })
      )
    }
  }
}

const costDataFormListener = {
  plugin: sqsListener,
  options: {
    queueName: 'epr-laps-costdata-form.fifo',
    onmessage: async (server, message) => {
      // Process the message here

      const body = JSON.parse(message.Body)

      server.logger.info(`Received message for cost data form: ${message.Body}`)
      writeFormsAuditLog(
        COST_DATA_ANONYMOUS_USER,
        ActionKind.CostDataSubmitted,
        Outcome.Success,
        statusCodes.ok,
        'journey_ended',
        body
      )
    }
  }
}

const feedbackFormListener = {
  plugin: sqsListener,
  options: {
    queueName: 'epr-laps-feedback-form.fifo',
    onmessage: async (server, message) => {
      const body = JSON.parse(message.Body)
      // Process the message here
      server.logger.info(`Received message for feedback form: ${message.Body}`)
      writeFormsAuditLog(
        FEEDBACK_ANONYMOUS_USER,
        ActionKind.SatisfactionDataFeedBackSubmitted,
        Outcome.Success,
        statusCodes.ok,
        'journey_ended',
        body
      )
    }
  }
}

export { costDataFormListener, feedbackFormListener, handleMessage }
