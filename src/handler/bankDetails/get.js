import { statusCodes } from '../../common/constants/status-codes.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'

const getBankDetails = async (request, h) => {
  try {
    const { relationships, roles } = request.auth.credentials

    // Assume single-item arrays
    const relationship = relationships?.[0]
    const role = roles?.[0]?.toUpperCase()

    const BASE_URL = config.get('FSSAPIUrl')
    const url = `${BASE_URL}/bank-details/${encodeURIComponent(relationship)}`

    const response = await fetch(url, { method: 'GET' })
    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`)
    }

    let bankDetails = await response.json()

    // Mask sortcode for non-CEO roles
    if (role !== 'CEO' && bankDetails?.sortcode) {
      const LAST_DIGITS_COUNT = 2
      const lastTwoDigits = bankDetails.sortcode.slice(-LAST_DIGITS_COUNT)
      bankDetails = {
        ...bankDetails,
        sortcode: 'ending with ' + lastTwoDigits
      }
    }

    const flags = {
      showNotificationBanner: !bankDetails.confirmed || role === 'CEO',
      showConfirmBankDetails: !bankDetails.confirmed,
      showDropdownDetails: role === 'HOF' || role === 'CEO'
    }

    return h.response({ ...bankDetails, ...flags }).code(statusCodes.ok)
  } catch (err) {
    console.error('Error fetching bank details:', err)
    return h
      .response({ error: 'Failed to fetch bank details' })
      .code(statusCodes.internalServerError)
  }
}

export { getBankDetails }
