import { statusCodes } from '../common/constants/status-codes.js'
import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'

const bankDetailsRoutes = {
  method: ['get', 'put'],
  path: '/bank-details/{localAuthority}',
  handler: (request, h) => {
    const { localAuthority } = request.param
    if (request.method === 'get') {
      return getBankDetails(localAuthority, request, h)
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
