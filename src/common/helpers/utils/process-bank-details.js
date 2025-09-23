/**
 * Masks sortcode if role is not CEO and adds UI flags.
 * @param {object} bankDetails
 * @param {string} role
 * @returns {object} Processed bank details with UI flags
 */

const CEO = 'Chief Executive Officer'

export function processBankDetails(bankDetails, role) {
  let maskedBankDetails = { ...bankDetails }

  // Mask sortcode for non-CEO roles
  if (role !== CEO && maskedBankDetails?.sortcode) {
    const LAST_DIGITS_COUNT = 2
    const lastTwoDigits = maskedBankDetails.sortcode.slice(-LAST_DIGITS_COUNT)
    maskedBankDetails = {
      ...maskedBankDetails,
      sortcode: 'ending with ' + lastTwoDigits
    }
  }

  return { ...maskedBankDetails }
}
