import fetch from 'node-fetch'
import { config } from '../../config.js'
import Boom from '@hapi/boom'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const postBankDetails = async (request, h) => {
  const { role } = request.auth.credentials
  try {
    if (!request.auth.isAuthorized) {
      request.logger.warn(`User with role ${role} tried to create bank details`)
      return Boom.forbidden(`${role} not allowed to create bank details`)
    }

    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/bank-details`

    const payload = request.payload

    const response = await fetch(url, {
      method: 'post',
      headers: {
        'x-api-key': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      request.logger.error(
        `Failed to create bank details: ${response.status} ${response.statusText}`,
        data
      )
      writeCreateBankDetailsAuditLog(
        request.auth.isAuthorized,
        request,
        Outcome.Failure
      )
      return Boom.badRequest(data?.message || 'Failed to create bank details')
    }

    request.logger.debug('Bank details created successfully:', data)

    writeCreateBankDetailsAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Success
    )
    return h.response(data).code(statusCodes.created)
  } catch (err) {
    request.logger.error('Error creating bank details:', err)
    writeCreateBankDetailsAuditLog(role, request, Outcome.Failure)
    throw Boom.internal('Failed to create bank details')
  }
}

export { postBankDetails }

export const writeCreateBankDetailsAuditLog = (
  canCreateBankDetails,
  request,
  outcome
) => {
  if (canCreateBankDetails) {
    writeAuditLog(request, ActionKind.BankDetailsCreated, outcome)
  }
}
