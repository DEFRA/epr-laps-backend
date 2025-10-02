import fetch from 'node-fetch'
import { config } from '../../config.js'

const getDocumentMetadata = async (request, h) => {
  try {
    const { localAuthority } = request.params
    const BASE_URL = config.get('fssApiUrl')
    const url = `${BASE_URL}/file/metadata/${encodeURIComponent(localAuthority)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': config.get('fssAPIKey'),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return h.response({ error: errorText }).code(response.status)
    }

    const data = await response.json()
    return h.response(data).code(200)
  } catch (error) {
    console.error('Error fetching file metadata:', error)
    return h.response({ error: 'Internal Server Error' }).code(500)
  }
}

export { getDocumentMetadata }
