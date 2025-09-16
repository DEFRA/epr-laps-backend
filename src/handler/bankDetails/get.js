import { statusCodes } from '../../common/constants/status-codes.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'

const getBankDetails = async (request, h) => {
  try {
    const { localAuthority, role } = request.auth.credentials
    const BASE_URL = config.get('auth.FSSAPIUrl')
    const url = `${BASE_URL}/bank-details/${encodeURIComponent(localAuthority)}`

    const response = await fetch(url, { method: 'GET' })
    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`)
    }

    let bankDetails = await response.json()

    // Mask sortcode for non-CEO roles
    if (role?.toUpperCase() !== 'CEO' && bankDetails?.sortcode) {
      const LAST_DIGITS_COUNT = 2
      const lastTwoDigits = bankDetails.sortcode.slice(-LAST_DIGITS_COUNT)
      bankDetails = {
        ...bankDetails,
        sortcode: 'ending with ' + lastTwoDigits
      }
    }

    const flags = {
      showNotificationBanner:
        !bankDetails.confirmed || role?.trim().toUpperCase() === 'CEO',
      showConfirmBankDetails: !bankDetails.confirmed,
      showDropdownDetails:
        role?.trim().toUpperCase() === 'HOF' ||
        role?.trim().toUpperCase() === 'CEO'
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
