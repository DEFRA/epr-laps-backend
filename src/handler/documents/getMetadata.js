import fetch from 'node-fetch'
import { config } from '../../config.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { processDocumentDetails } from '../../common/helpers/utils/process-document-details.js'
import Boom from '@hapi/boom'

const getDocumentMetadata = async (request, h) => {
  try {
    const { localAuthority } = request.params
    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/file/metadata/${localAuthority}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw Boom.internal('Error fetching file metadata', errorText)
    }

    const data = await response.json()
    const processedDetails = processDocumentDetails(data)
    request.logger.info(
      'Processed document details response:',
      processedDetails
    )

    return h.response(data).code(statusCodes.ok)
  } catch (error) {
    request.logger.error('Error fetching file metadata:', error)
    throw Boom.internal('Error fetching file metadata')
  }
}

export { getDocumentMetadata }
