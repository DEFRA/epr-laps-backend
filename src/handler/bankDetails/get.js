import { statusCodes } from '../../common/constants/status-codes.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'
import { processBankDetails } from '../../common/helpers/utils/process-bank-details.js'
import Boom from '@hapi/boom'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'

const getBankDetails = async (request, h) => {
  const { localAuthority } = request.params
  try {
    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/bank-details/${encodeURIComponent(localAuthority)}`
    request.logger.info(`Fetching bank details from URL: ${url}`)
    const response = await fetch(url, {
      method: 'get',
      headers: {
        'x-api-key': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      }
    })

    const bankDetails = await response.json()
    request.logger.debug(
      `Raw bank details received:', ${JSON.stringify(bankDetails)}`
    )

    // Use utility function
    const processedDetails = processBankDetails(
      bankDetails,
      request.auth.isAuthorized
    )
    request.logger.info(
      `Processed Bank details response:': ${JSON.stringify(processedDetails)}`
    )

    writeBankDetailsAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Success
    )
    return h.response(processedDetails).code(statusCodes.ok)
  } catch (err) {
    request.logger.error('Error fetching bank details:', err)
    writeBankDetailsAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Failure
    )
    throw Boom.internal('Failed to fetch bank details')
  }
}

export { getBankDetails }

export const writeBankDetailsAuditLog = (
  canViewFullBankDetails,
  request,
  outcome
) => {
  if (canViewFullBankDetails) {
    writeAuditLog(request, ActionKind.FullBankDetailsViewed, outcome)
    return
  }
  writeAuditLog(request, ActionKind.MaskedBankDetailsViewed, outcome)
}
