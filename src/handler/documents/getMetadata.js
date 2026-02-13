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
  const errorMsg = 'Error fetching file metadata'
  try {
    const { localAuthority } = request.params
    const { role } = request.auth.credentials
    if (!request.auth.isAuthorized) {
      request.logger.warn(`User with role ${role} tried to get document list`)
      return Boom.forbidden(`${role} not allowed to get document list`)
    }
    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/sn_gsm/laps_documents/${localAuthority}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-sn-apikey': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      request.logger?.error(errorText, errorMsg)
      writeDocumentListedAuditLog(
        request.auth.isAuthorized,
        request,
        Outcome.Failure,
        response.status
      )
      return Boom.internal(errorMsg)
    }

    const data = await response.json()
    const processedDetails = processDocumentsByFinancialYear(data.result)

    request.logger.info(
      `Processed document details response:': ${JSON.stringify(processedDetails)}`
    )

    writeDocumentListedAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Success,
      response.ok
    )
    return h.response(processedDetails).code(statusCodes.ok)
  } catch (error) {
    const statusCode =
      error.output?.statusCode || statusCodes.internalServerError
    request.logger.error(
      `Error fetching file metadata:', ${JSON.stringify(error)}`
    )
    writeDocumentListedAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Failure,
      statusCode
    )
    throw Boom.internal(errorMsg)
  }
}

export { getDocumentMetadata }

export const writeDocumentListedAuditLog = (
  canListDocuments,
  request,
  outcome,
  statusCode
) => {
  if (canListDocuments) {
    writeAuditLog(request, ActionKind.DocumentsListed, outcome, statusCode)
    return
  }
  writeAuditLog(request, ActionKind.DocumentsListed, outcome, statusCode)
}
