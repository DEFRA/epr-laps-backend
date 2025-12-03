import fetch from 'node-fetch'
import { config } from '../../config.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { processDocumentsByFinancialYear } from '../../common/helpers/utils/process-document-details.js'
import Boom from '@hapi/boom'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'

const getDocumentMetadata = async (request, h) => {
  try {
    const { localAuthority } = request.params
    const { role } = request.auth.credentials
    if (!request.auth.isAuthorized) {
      request.logger.warn(`User with role ${role} tried to get document list`)
      return Boom.forbidden(`${role} not allowed to get document list`)
    }
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
      return Boom.internal(errorText, 'Error fetching file metadata')
    }

    const data = await response.json()
    const processedDetails = processDocumentsByFinancialYear(data)

    request.logger.info(
      `Processed document details response:': ${JSON.stringify(processedDetails)}`
    )

    writeDocumentListedAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Success
    )
    return h.response(processedDetails).code(statusCodes.ok)
  } catch (error) {
    request.logger.error(
      `Error fetching file metadata:', ${JSON.stringify(error)}`
    )
    writeDocumentListedAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Failure
    )
    throw Boom.internal('Error fetching file metadata')
  }
}

export { getDocumentMetadata }

export const writeDocumentListedAuditLog = (
  canListDocuments,
  request,
  outcome
) => {
  if (canListDocuments) {
    writeAuditLog(request, ActionKind.DocumentsListed, outcome)
    return
  }
  writeAuditLog(request, ActionKind.DocumentsListed, outcome)
}
