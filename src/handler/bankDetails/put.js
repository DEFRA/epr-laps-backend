import fetch from 'node-fetch'
import { config } from '../../config.js'
import Boom from '@hapi/boom'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'
import { encryptBankDetailsPayload } from '../../common/helpers/utils/encrypt-servicenow-bank-details.js'

const putBankDetails = async (request, h) => {
  const { effectiveRole } = request.auth.credentials
  console.log(
    `User with role is attempting to confirm bank details`,
    request.auth.credentials
  ) // Add this log to check the role
  try {
    if (!request.auth.isAuthorized) {
      request.logger.warn(
        `User with role ${effectiveRole} tried to confirm bank details`
      )
      return Boom.forbidden(
        `${effectiveRole} not allowed to confirm bank details`
      )
    }

    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/sn_gsm/bank_details/confirm_bank_details`

    // The payload should contain the updated bank details
    const payload = request.payload
    const encryptedData = encryptBankDetailsPayload(payload, request)

    // Send encrypted data in request body as {"request_data": "encrypted_data"}
    const requestBody = {
      request_data: encryptedData
    }

    request.logger.debug(
      `Bank details confirmation requested with data: ${JSON.stringify(requestBody)}`
    )

    const response = await fetch(url, {
      method: 'put',
      headers: {
        'x-sn-apikey': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      request.logger.error(
        `Error confirming bank details: ${response.status} ${response.statusText}: ${errorBody}`
      )
      writeConfirmBankDetailsAuditLog(
        request.auth.isAuthorized,
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

    writeConfirmBankDetailsAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Success,
      response.status
    )
    return h.response(data).code(response.status)
  } catch (err) {
    request.logger.error(
      `Error confirming bank details: ${JSON.stringify(err)}`
    )
    throw Boom.internal('Failed to confirm bank details')
  }
}

export { putBankDetails }

export const writeConfirmBankDetailsAuditLog = (
  canConfirmBankDetails,
  request,
  outcome,
  statusCode
) => {
  if (canConfirmBankDetails) {
    writeAuditLog(request, ActionKind.BankDetailsConfirmed, outcome, statusCode)
  }
}
