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
    const LAST_TWO_DIGITS_COUNT = 2
    const LAST_THREE_DIGITS_COUNT = 3
    const ENDING_WITH_PREFIX = 'ending with '
    const sortCodeLastTwoDigits = maskedBankDetails.sortCode.slice(
      -LAST_TWO_DIGITS_COUNT
    )
    const accountNumberLastThreeDigits = maskedBankDetails.accountNumber.slice(
      -LAST_THREE_DIGITS_COUNT
    )
    maskedBankDetails = {
      ...maskedBankDetails,
      sortCode: ENDING_WITH_PREFIX + sortCodeLastTwoDigits,
      accountNumber: ENDING_WITH_PREFIX + accountNumberLastThreeDigits
    }
  }
  return { ...maskedBankDetails }
}
