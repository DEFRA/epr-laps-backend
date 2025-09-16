import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'

const bankDetailsRoutes = {
  method: ['GET', 'PUT'],
  path: '/bank-details/{localAuthority}',
  handler: (request, h) => {
    if (request.method === 'get') {
      return getBankDetails(request, h)
    } else if (request.method === 'put') {
      return putBankDetails(request, h)
    }
  }
}

export { bankDetailsRoutes }
