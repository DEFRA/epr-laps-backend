import { statusCodes } from '../common/constants/status-codes.js'
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
    } else {
      return h
        .response({ error: 'Method not allowed' })
        .code(statusCodes.notAllowed)
    }
  }
}

export { bankDetailsRoutes }
