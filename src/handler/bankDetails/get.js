import { statusCodes } from '../../common/constants/status-codes.js'
import fetch from 'node-fetch'
import { config } from '../../config.js'
import { processBankDetails } from '../../common/helpers/utils/process-bank-details.js'
import Boom from '@hapi/boom'

const getBankDetails = async (request, h) => {
  try {
    const { localAuthority, role } = request.auth.credentials

    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/bank-details/${encodeURIComponent(localAuthority)}`
    const response = await fetch(url, {
      method: 'get',
      headers: {
        'x-api-key': 'some-api-key',
        'Content-Type': 'application/json'
      }
    })

    const bankDetails = await response.json()
    request.logger.debug('Raw bank details received:', bankDetails)

    // Use utility function
    const processedDetails = processBankDetails(bankDetails, role)
    request.logger.info('Processed bank details response:', processedDetails)

    return h.response(processedDetails).code(statusCodes.ok)
  } catch (err) {
    request.logger.error('Error fetching bank details:', err)
    throw Boom.internal('Failed to fetch bank details')
  }
}

export { getBankDetails }
