/**
 * Masks sortcode if user is not allowed to view full bank details.
 * @param {object} bankDetails
 * @param {boolean} isAuthorized
 * @returns {object} Processed bank details with UI flags
 */

export function processBankDetails(bankDetails, isAuthorized) {
  let maskedBankDetails = { ...bankDetails }

  // Mask sortcode for unathorized users
  if (!isAuthorized) {
    const LAST_DIGITS_COUNT = 2
    const lastTwoDigits = maskedBankDetails.sortCode.slice(-LAST_DIGITS_COUNT)
    maskedBankDetails = {
      ...maskedBankDetails,
      sortCode: 'ending with ' + lastTwoDigits
    }
  }
  return { ...maskedBankDetails }
}
