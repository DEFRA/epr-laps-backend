import fetch from 'node-fetch'
import { config } from '../../config.js'
import Boom from '@hapi/boom'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'
import { roles } from '../../common/constants/constants.js'

const putBankDetails = async (request, h) => {
  let userRole = ''
  try {
    const { localAuthority, role } = request.auth.credentials
    userRole = role
    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/bank-details/${encodeURIComponent(localAuthority.trim())}`

    // The payload should contain the updated bank details
    const payload = request.payload

    const response = await fetch(url, {
      method: 'put',
      headers: {
        'x-api-key': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    // Optionally, handle the response if you want to return it
    const data = await response.json()

    request.logger.debug('Bank details confirmed successfully:', data)

    writeConfirmBankDetailsAuditLog(userRole, request, Outcome.Success)
    return h.response(data).code(response.status)
  } catch (err) {
    request.logger.error('Error confirming bank details:', err)
    writeConfirmBankDetailsAuditLog(userRole, request, Outcome.Failure)
    throw Boom.internal('Failed to confirm bank details')
  }
}

export { putBankDetails }

export const writeConfirmBankDetailsAuditLog = (role, request, outcome) => {
  if (role === roles.HOF) {
    writeAuditLog(request, ActionKind.BankDetailsConfirmed, outcome)
  }
}
