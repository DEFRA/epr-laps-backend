import dotenv from 'dotenv'
dotenv.config()

const getBankDetails = async (request, h) => {
  try {
    // Retrieve localAuthority (and optionally role) from JWT
    const { localAuthority, role } = request.auth.credentials

    // Call the mock API and pass localAuthority as query param
    const BASE_URL = process.env.API_URL
    const response = await fetch(
      `${BASE_URL}/bank-details?localAuthority=${encodeURIComponent(localAuthority)}`
    )

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`)
    }

    let bankDetails = await response.json()

    if (role?.toUpperCase() !== 'CEO' && bankDetails?.sortcode) {
      const lastTwoDigits = bankDetails.sortcode.slice(-2)
      const masked = 'ending with' + lastTwoDigits
      bankDetails = {
        ...bankDetails,
        sortcode: masked
      }
    }

    const flags = {
      showNotificationBanner: role?.trim().toUpperCase() === "HOF",
      showConfirmBankDetails: bankDetails.confirmed === false || !bankDetails.confirmed,
      showDropdownDetails: role?.trim().toUpperCase() !== "HOF" || role?.trim.toUpperCase === "CEO"
    };
    
    return h.response({ ...bankDetails, ...flags }).code(200);
  } catch (err) {
    console.error('Error fetching bank details:', err)
    return h.response({ error: 'Failed to fetch bank details' }).code(500)
  }
}

export { getBankDetails }
