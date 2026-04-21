import {
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand
} from '@aws-sdk/client-sqs'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../common/helpers/audit-logging.js'

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
      const anonymousUserInfo = {
        user_id: 'user123',
        user_email: 'laps.cost.user@defra.com',
        user_first_name: 'Laps Cost User',
        user_last_name: 'Cost User'
      }

      const additionalData = {
        message: JSON.stringify(JSON.parse(message.Body))
      }

      server.logger.info(`Received message for cost data form: ${message.Body}`)
      writeAuditLog(
        {
          auth: {
            credentials: anonymousUserInfo
          },
          logger: server.logger
        },
        ActionKind.CostDataSubmitted,
        Outcome.Success,
        200,
        'journey_ended',
        additionalData
      )
    }
  }
}

const feedbackFormListener = {
  plugin: sqsListener,
  options: {
    queueName: 'epr-laps-feedback-form.fifo',
    onmessage: async (server, message) => {
      const anonymousUserInfo = {
        user_id: 'user123',
        user_email: 'laps.feedback.user@defra.com',
        user_first_name: 'Laps Feedback User',
        user_last_name: 'Feedback User'
      }
      // Process the message here
      server.logger.info(`Received message for feedback form: ${message.Body}`)
      writeAuditLog(
        {
          auth: {
            credentials: anonymousUserInfo
          },
          logger: server.logger
        },
        ActionKind.SatisfactionDataFeedBackSubmitted,
        Outcome.Success,
        200,
        'journey_ended'
      )
    }
  }
}

export { costDataFormListener, feedbackFormListener, handleMessage }
