import fetch from 'node-fetch'
import { config } from '../../config.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import Boom from '@hapi/boom'

const getDocument = async (request, h) => {
  const errorMsg = 'Error fetching file:'
  try {
    const { id } = request.params
    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/file/${id}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': config.get('fssAPIKey')
      }
    })

    request.logger.debug('Document received:', response)

    if (!response.ok) {
      const errorText = await response.text()
      request.logger?.error(errorText, errorMsg)
      return Boom.internal(errorText, errorMsg)
    }

    // Get the PDF as a buffer
    const fileBuffer = await response.arrayBuffer()

    return h
      .response(Buffer.from(fileBuffer))
      .type('application/pdf')
      .code(statusCodes.ok)
  } catch (error) {
    request.logger?.error(error, errorMsg)
    throw Boom.internal('Error fetching file')
  }
}

export { getDocument }
