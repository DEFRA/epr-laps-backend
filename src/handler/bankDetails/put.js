import fetch from 'node-fetch'
import { config } from '../../config.js'

const putBankDetails = async (request, h) => {
  const { localAuthority } = request.auth.credentials
  const BASE_URL = config.get('fssApiUrl')
  const url = `${BASE_URL}/bank-details/${encodeURIComponent(localAuthority)}`

  // The payload should contain the updated bank details
  const payload = request.payload

  const response = await fetch(url, {
    method: 'put',
    headers: {
      'x-api-key': 'some-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  // Optionally, handle the response if you want to return it
  const data = await response.json()
  return h.response(data).code(response.status)
}

export { putBankDetails }
