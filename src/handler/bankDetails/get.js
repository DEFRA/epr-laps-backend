import { statusCodes } from '../../common/constants/status-codes.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'
import { createLogger } from '../../common/helpers/logging/logger.js'

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

    let bankDetails = await response.json()

    const CEO = 'Chief Executive Officer'
    // Mask sortcode for non-CEO roles
    if (role !== CEO && bankDetails?.sortcode) {
      const LAST_DIGITS_COUNT = 2
      const lastTwoDigits = bankDetails.sortcode.slice(-LAST_DIGITS_COUNT)
      bankDetails = {
        ...bankDetails,
        sortcode: 'ending with ' + lastTwoDigits
      }
    }

    const flags = {
      showNotificationBanner: !bankDetails.confirmed || role === CEO,
      showConfirmBankDetails: !bankDetails.confirmed,
      showDropdownDetails: role === 'Head Of Finance' || role === CEO
    }

    return h.response({ ...bankDetails, ...flags }).code(statusCodes.ok)
  } catch (err) {
    logger.error('Error fetching bank details:', err)
    return h
      .response({ error: 'Failed to fetch bank details' })
      .code(statusCodes.internalServerError)
  }
}

export { getBankDetails }
