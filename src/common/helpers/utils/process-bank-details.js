import { roles } from '../../constants/constants.js'
/**
 * Masks sortcode and account number if role is not CEO and adds UI flags.
 * @param {object} bankDetails
 * @param {string} role
 * @returns {object} Processed bank details with UI flags
 */

export function processBankDetails(bankDetails, role) {
  let maskedBankDetails = { ...bankDetails }

  // Mask sortcode for non-CEO roles
  if (role !== roles.CEO && role !== roles.HOF && maskedBankDetails?.sortCode) {
    const LAST_DIGITS_COUNT = 2
    const sortCodelastTwoDigits =
      maskedBankDetails.sortCode.slice(-LAST_DIGITS_COUNT)
    const accountNumberlastTwoDigits =
      maskedBankDetails.accountNumber.slice(-LAST_DIGITS_COUNT)
    maskedBankDetails = {
      ...maskedBankDetails,
      sortCode: 'ending with ' + sortCodelastTwoDigits,
      accountNumber: 'ending with ' + accountNumberlastTwoDigits
    }
  }
  return { ...maskedBankDetails }
}
