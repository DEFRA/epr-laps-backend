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

    if (!response.ok) {
      const errorText = await response.text()
      throw Boom.internal('Error fetching file', errorText)
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
      .header('Content-Disposition', `attachment; filename="${id}.pdf"`)
      .code(statusCodes.ok)
  } catch (error) {
    request.logger?.error('Error fetching file:', error)
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
