/**
 * Masks sortcode if role is not CEO and adds UI flags.
 * @param {object} bankDetails
 * @param {string} role
 * @returns {object} Processed bank details with UI flags
 */

const CEO = 'Chief Executive Officer'
const HOF = 'Head of Finance'

export function processBankDetails(bankDetails, role) {
  let maskedBankDetails = { ...bankDetails }

  // Mask sortcode for non-CEO roles
  if (role !== CEO && role !== HOF && maskedBankDetails?.sortCode) {
    const LAST_DIGITS_COUNT = 2
    const lastTwoDigits = maskedBankDetails.sortCode.slice(-LAST_DIGITS_COUNT)
    maskedBankDetails = {
      ...maskedBankDetails,
      sortCode: 'ending with ' + lastTwoDigits
    }
  }
  return { ...maskedBankDetails }
}
