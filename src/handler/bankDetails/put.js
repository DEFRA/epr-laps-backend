import fetch from 'node-fetch'
import { config } from '../../config.js'
import Boom from '@hapi/boom'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'
import { roles } from '../../common/constants/constants.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const putBankDetails = async (request, h) => {
  const { role } = request.auth.credentials
  try {
    if (!request.auth.isAuthorized) {
      request.logger.warn(
        `User with role ${role} tried to confirm bank details`
      )
      return Boom.forbidden(`${role} not allowed to confirm bank details`)
    }

    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/sn_gsm/bank_details/confirm_bank_details`

    // The payload should contain the updated bank details
    const payload = request.payload

    request.logger.debug(
      `Bank details confirmation requested with data: ${JSON.stringify(payload)}`
    )

    const response = await fetch(url, {
      method: 'put',
      headers: {
        'x-sn-apikey': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      request.logger.error(
        `Error confirming bank details: ${response.status} ${response.statusText}: ${errorBody}`
      )
      writeConfirmBankDetailsAuditLog(
        role,
        request,
        Outcome.Failure,
        response.status
      )
      throw Boom.internal(`Error confirming bank details`)
    }

    // Optionally, handle the response if you want to return it
    const data = await response.json()

    request.logger.debug(
      `Bank details confirmed successfully: ${JSON.stringify(data)}`
    )

    writeConfirmBankDetailsAuditLog(role, request, Outcome.Success, response.ok)
    return h.response(data).code(response.status)
  } catch (err) {
    const statusCode = err.output?.statusCode || statusCodes.internalServerError
    request.logger.error(
      `Error confirming bank details: ${JSON.stringify(err)}`
    )
    writeConfirmBankDetailsAuditLog(role, request, Outcome.Failure, statusCode)
    throw Boom.internal('Failed to confirm bank details')
  }
}

export { putBankDetails }

export const writeConfirmBankDetailsAuditLog = (
  role,
  request,
  outcome,
  statusCode
) => {
  if (role === roles.HOF) {
    writeAuditLog(request, ActionKind.BankDetailsConfirmed, outcome, statusCode)
  }
}
