import crypto from 'node:crypto'

/**
 * Convert URL-safe Base64 to standard Base64
 * @param {string} str - URL-safe Base64 string
 * @returns {string} Standard Base64 string
 */
export function urlBase64ToBase64(str) {
  return str.replaceAll('-', '+').replaceAll('_', '/')
}
/**
 * Extract IV and ciphertext from encrypted response
 * @param {string} responseData - Encrypted response data in format: <IV_BASE64URL>==<CIPHERTEXT_BASE64URL>
 * @returns {{ivB64Url: string, cipherB64Url: string}} Extracted IV and ciphertext
 * @throws {Error} If pattern is not found in response
 */
export function extractIvAndCiphertext(responseData) {
  // Remove all non-Base64 characters (keeps only A-Za-z0-9+/\-_=)
  const cleanedData = responseData.replaceAll(/[^A-Za-z0-9+/\-_=]/g, '')

  // Find the first occurrence of == separator (marks end of IV)
  const firstSeparatorIndex = cleanedData.indexOf('==')
  if (firstSeparatorIndex === -1) {
    throw new Error('IV and ciphertext pattern not found in response_data')
  }

  // IV should be roughly 24 characters when base64-encoded (16 bytes encoded)
  // Extract the last 24 characters before the == as the IV
  const ivEndIndex = firstSeparatorIndex + 2
  const ivStartIndex = Math.max(0, ivEndIndex - 24)

  const ivB64Url = cleanedData.substring(ivStartIndex, ivEndIndex)
  const cipherB64Url = cleanedData.substring(ivEndIndex)

  return {
    ivB64Url,
    cipherB64Url
  }
}

/**
 * Determine the AES algorithm based on key length
 * @param {Buffer} key - The encryption key
 * @returns {string} Algorithm string ('aes-128-cbc' or 'aes-256-cbc')
 * @throws {Error} If key length is invalid
 */
export function getAlgorithmForKey(key) {
  if (key.length === 16) {
    return 'aes-128-cbc'
  } else if (key.length === 32) {
    return 'aes-256-cbc'
  } else {
    throw new Error(
      `Invalid key length: must be 16 or 32 bytes, got ${key.length}`
    )
  }
}

/**
 * Validate IV length
 * @param {Buffer} iv - The initialization vector
 * @throws {Error} If IV length is not 16 bytes
 */
export function validateIvLength(iv) {
  if (iv.length !== 16) {
    throw new Error(`Invalid IV length: must be 16 bytes, got ${iv.length}`)
  }
}

/**
 * Decrypt bank details response
 * @param {string} responseData - Encrypted response data
 * @param {string} encryptionKey - Base64-encoded encryption key
 * @returns {string} Decrypted data as string
 * @throws {Error} If decryption fails or data is invalid
 */
export function decryptBankDetails(responseData, encryptionKey) {
  const { ivB64Url, cipherB64Url } = extractIvAndCiphertext(responseData)

  // Decode and validate key
  const key = Buffer.from(encryptionKey, 'base64')
  const algorithm = getAlgorithmForKey(key)

  // Decode and validate IV
  const iv = Buffer.from(urlBase64ToBase64(ivB64Url), 'base64')
  validateIvLength(iv)

  // Decode ciphertext
  const ciphertext = Buffer.from(urlBase64ToBase64(cipherB64Url), 'base64')

  // Decrypt
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString()
}
