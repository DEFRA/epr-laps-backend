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
    const LAST_TWO_DIGITS_COUNT = 2
    const LAST_THREE_DIGITS_COUNT = 3
    const sortCodeLastTwoDigits = maskedBankDetails.sortCode.slice(
      -LAST_TWO_DIGITS_COUNT
    )
    const accountNumberLastThreeDigits = maskedBankDetails.accountNumber.slice(
      -LAST_THREE_DIGITS_COUNT
    )
    maskedBankDetails = {
      ...maskedBankDetails,
      sortCode: 'ending with ' + sortCodeLastTwoDigits,
      accountNumber: 'ending with ' + accountNumberLastThreeDigits
    }
  }
  return { ...maskedBankDetails }
}
