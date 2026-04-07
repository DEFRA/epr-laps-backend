import {
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand
} from '@aws-sdk/client-sqs'

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
              const response = await server.sqs.send(
                new ReceiveMessageCommand({
                  QueueUrl: queueUrl,
                  MaxNumberOfMessages: 10,
                  WaitTimeSeconds: 20
                })
              )
              handleMessage(response, server, options, queueUrl)
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

const handleMessage = async (response, server, options, queueUrl) => {
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
      server.logger.info(`Received message for cost data form: ${message.Body}`)
    }
  }
}

const feedbackFormListener = {
  plugin: sqsListener,
  options: {
    queueName: 'epr-laps-feedback-form.fifo',
    onmessage: async (server, message) => {
      // Process the message here
      server.logger.info(`Received message for feedback form: ${message.Body}`)
    }
  }
}

export { costDataFormListener, feedbackFormListener }
