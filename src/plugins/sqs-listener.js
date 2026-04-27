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
      const abortController = new AbortController()

      try {
        const queueUrlResult = await server.sqs.send(
          new GetQueueUrlCommand({ QueueName: options.queueName })
        )
        const queueUrl = queueUrlResult.QueueUrl

        const poll = async () => {
          while (!abortController.signal.aborted) {
            try {
              await handleMessage(server, options, queueUrl)
            } catch (error) {
              server.logger.error(`Error polling SQS: ${error.message}`)
            }
          }
        }

        server.ext('onPostStart', async () => {
          poll().catch((error) => {
            server.logger.error(`Polling error: ${error.message}`)
          })
        })

        server.ext('onPostStop', () => {
          abortController.abort()
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
    queueName: 'epr-laps-costdata-form',
    onmessage: async (server, message) => {
      // Process the message here
      server.logger.debug(
        `Received message for cost data form: ${message.Body}`
      )

      const body = JSON.parse(message.Body)
      server.logger.debug(`Cost Data form body: ${JSON.stringify(body)}`)

      server.logger.debug(`Cost Data form main body: ${body.data.main}`)

      const bodyStr = JSON.stringify(body.data.main)
      writeFormsAuditLog(
        server,
        COST_DATA_ANONYMOUS_USER,
        ActionKind.CostDataSubmitted,
        Outcome.Success,
        'journey_ended',
        bodyStr
      )
    }
  }
}

const feedbackFormListener = {
  plugin: sqsListener,
  options: {
    queueName: 'epr-laps-feedback-form',
    onmessage: async (server, message) => {
      // Process the message here
      server.logger.debug(`Received message for feedback form: ${message.Body}`)

      const body = JSON.parse(message.Body)
      server.logger.debug(`Feedback form body: ${JSON.stringify(body)}`)

      server.logger.debug(`Feedback form main body: ${body.data.main}`)

      const bodyStr = JSON.stringify(body.data.main)
      writeFormsAuditLog(
        server,
        FEEDBACK_ANONYMOUS_USER,
        ActionKind.SatisfactionDataFeedBackSubmitted,
        Outcome.Success,
        'journey_ended',
        bodyStr
      )
    }
  }
}

export { costDataFormListener, feedbackFormListener, handleMessage }
