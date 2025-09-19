import { statusCodes } from '../../common/constants/status-codes.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { processBankDetails } from '../../common/helpers/utils/process-bank-details.js'

const logger = createLogger()

const getBankDetails = async (request, h) => {
  try {
    const { localAuthority, role } = request.auth.credentials
    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/bank-details/${encodeURIComponent(localAuthority)}`
    const response = await fetch(url, {
      method: 'get',
      headers: {
        'x-api-key': 'some-api-key',
        'Content-Type': 'application/json'
      }
    })

    const bankDetails = await response.json()

    // Use utility function
    const processedDetails = processBankDetails(bankDetails, role)
    return h.response(processedDetails).code(statusCodes.ok)
  } catch (err) {
    logger.error('Error fetching bank details:', err)
    return h
      .response({ error: 'Failed to fetch bank details' })
      .code(statusCodes.internalServerError)
  }
}

export { getBankDetails }
