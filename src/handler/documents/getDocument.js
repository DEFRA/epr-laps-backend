import fetch from 'node-fetch'
import { config } from '../../config.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import Boom from '@hapi/boom'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'

const getDocument = async (request, h) => {
  const errorMsg = 'Error fetching file:'
  try {
    const { id } = request.params
    const { role } = request.auth.credentials
    if (!request.auth.isAuthorized) {
      request.logger.warn(`User with role ${role} tried to access the document`)
      return Boom.forbidden(`${role} not allowed to access the document`)
    }
    const BASE_URL = config.get('fssApiUrl')
    // const url = `${BASE_URL}/file/${id}`
    const url = `${BASE_URL}/now/attachment/${id}/file`

    console.log('fileurl', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-sn-apikey': config.get('fssAPIKey')
      }
    })

    request.logger.debug(`Document received:, ${JSON.stringify(response)}`)

    if (!response.ok) {
      const errorText = await response.text()
      request.logger?.error(errorText, errorMsg)
      return Boom.internal(errorText, errorMsg)
    }

    // Get the PDF as a buffer
    const fileBuffer = await response.arrayBuffer()
    writeDocumentAccessedAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Success
    )
    return h
      .response(Buffer.from(fileBuffer))
      .type('application/pdf')
      .code(statusCodes.ok)
  } catch (error) {
    request.logger?.error(error, errorMsg)
    writeDocumentAccessedAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Failure
    )
    throw Boom.internal('Error fetching file')
  }
}

export { getDocument }

export const writeDocumentAccessedAuditLog = (
  canListDocuments,
  request,
  outcome
) => {
  if (canListDocuments) {
    writeAuditLog(request, ActionKind.DocumentAccessed, outcome)
    return
  }
  writeAuditLog(request, ActionKind.DocumentAccessed, outcome)
}
