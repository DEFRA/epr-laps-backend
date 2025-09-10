import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'

const bankDetailsGet = {
  method: 'GET',
  path: '/bank-details/{localAuthority}',
  handler: getBankDetails
}

const bankDetailsPut = {
  method: 'PUT',
  path: '/bank-details/{localAuthority}',
  handler: putBankDetails
}

export { bankDetailsGet, bankDetailsPut }
