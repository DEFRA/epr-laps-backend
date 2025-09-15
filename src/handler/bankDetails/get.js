import dotenv from 'dotenv'
import { StatusCodes } from 'http-status-codes'
import fetch from 'node-fetch'

dotenv.config()

const getBankDetails = async (request, h) => {
  try {
    const { localAuthority, role } = request.auth.credentials
    const BASE_URL = process.env.API_URL
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

    return h.response({ ...bankDetails, ...flags }).code(StatusCodes.OK)
  } catch (err) {
    console.error('Error fetching bank details:', err)
    return h
      .response({ error: 'Failed to fetch bank details' })
      .code(StatusCodes.INTERNAL_SERVER_ERROR)
  }
}

export { getBankDetails }
