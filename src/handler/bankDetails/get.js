import { statusCodes } from '../../common/constants/status-codes.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'
import { processBankDetails } from '../../common/helpers/utils/process-bank-details.js'
import { decryptBankDetails } from '../../common/helpers/utils/decrypt-bank-details.js'
import Boom from '@hapi/boom'
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'

/**
 * Decrypt and parse bank details response
 * @param {string} responseData - Encrypted response data
 * @param {object} request - Hapi request object with logger
 * @returns {object} Decrypted and parsed data
 * @throws {Error} If decryption or parsing fails
 */
export function decryptAndParseResponse(responseData, request) {
  const encryptionKey = config.get('fssEncryptionKey')

  try {
    const decryptedString = decryptBankDetails(responseData, encryptionKey)
    return JSON.parse(decryptedString)
  } catch (error) {
    request.logger.error(`Error decrypting bank details: ${error}`)
    throw Boom.internal('Failed to decrypt bank details')
  }
}

const getBankDetails = async (request, h) => {
  const { localAuthority } = request.params
  try {
    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/sn_gsm/bank_details/${encodeURIComponent(localAuthority)}`
    request.logger.info(`Fetching bank details from URL: ${url}`)
    const response = await fetch(url, {
      method: 'get',
      headers: {
        'x-sn-apikey': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorBody = await response.text()
      request.logger.error(
        `Error fetching bank details: ${response.status} ${response.statusText}: ${errorBody}`
      )
      writeBankDetailsAuditLog(
        request.auth.isAuthorized,
        request,
        Outcome.Failure,
        response.status
      )
      throw Boom.internal(`Failed to fetch bank details`)
    }

    const bankDetails = await response.json()
    request.logger.debug(
      `Raw bank details received:, ${JSON.stringify(bankDetails)}`
    )

    // Decrypt and process the response data
    const decryptedData = decryptAndParseResponse(
      bankDetails.result.response_data,
      request
    )

    // Use utility function with decrypted data
    const processedDetails = processBankDetails(
      decryptedData,
      request.auth.isAuthorized
    )
    request.logger.info(
      `Processed Bank details response:': ${JSON.stringify(processedDetails)}`
    )

    writeBankDetailsAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Success,
      response.ok
    )
    return h.response(processedDetails).code(statusCodes.ok)
  } catch (err) {
    const statusCode = err.output?.statusCode || statusCodes.internalServerError
    request.logger.error(`Error fetching bank details: ${JSON.stringify(err)}`)
    writeBankDetailsAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Failure,
      statusCode
    )
    throw Boom.internal('Failed to fetch bank details')
  }
}

export { getBankDetails }

export const writeBankDetailsAuditLog = (
  canViewFullBankDetails,
  request,
  outcome,
  statusCode
) => {
  if (canViewFullBankDetails) {
    writeAuditLog(
      request,
      ActionKind.FullBankDetailsViewed,
      outcome,
      statusCode
    )
    return
  }
  writeAuditLog(
    request,
    ActionKind.MaskedBankDetailsViewed,
    outcome,
    statusCode
  )
}
