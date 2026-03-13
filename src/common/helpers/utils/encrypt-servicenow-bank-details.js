import crypto from 'node:crypto'
import { config } from '../../../config.js'
import Boom from '@hapi/boom'
const FIRST_50_CHARS = 50

/**
 * Convert standard Base64 to URL-safe Base64
 * @param {string} str - Standard Base64 string
 * @returns {string} URL-safe Base64 string
 */
export function base64ToUrlBase64(str) {
  return str.replaceAll('+', '-').replaceAll('/', '_')
}

/**
 * Encrypt bank details data in ServiceNow format using AES-256-CBC
 * @param {string} plaintext - Data to encrypt (as string or JSON stringified)
 * @param {string} encryptionKey - Base64-encoded encryption key (must be 32 bytes for AES-256)
 * @param {string} keyId - ServiceNow key identifier (32 hex characters)
 * @param {string} version - Encryption version (default: '1')
 * @returns {string} Encrypted response in format: ???<KEY_ID>??<VERSION>??<IV_BASE64URL><CIPHERTEXT_BASE64URL>??
 * @throws {Error} If encryption fails or key is invalid
 */
export function encryptServiceNowBankDetails(
  plaintext,
  encryptionKey,
  version = '1'
) {
  // Decode and validate key (must be 32 bytes for AES-256-CBC)
  const key = Buffer.from(encryptionKey, 'base64')
  if (key.length !== 32) {
    throw new Error(
      `Invalid key length: must be 32 bytes for AES-256-CBC, got ${key.length}`
    )
  }

  // Generate random IV
  const iv = crypto.randomBytes(16)

  // Encrypt using AES-256-CBC with PKCS#7 padding (matches ServiceNow format)
  // NOSONAR - CBC mode with PKCS#7 padding required for ServiceNow KMFCryptoOperation compatibility
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv) // NOSONAR
  let encrypted = cipher.update(plaintext)
  encrypted = Buffer.concat([encrypted, cipher.final()])

  // Convert to URL-safe Base64
  const ivB64Url = base64ToUrlBase64(iv.toString('base64'))
  const cipherB64Url = base64ToUrlBase64(encrypted.toString('base64'))
  const keyId = config.get('fssEncryptionKeyId')

  // Format: ﷮﷯﷯<KEY_ID>﷬﷬ <VERSION>﷬﷭<IV><CIPHERTEXT>﷮﷯
  return `﷞﷟﷒${keyId}﷬﷔${version}﷬﷭${ivB64Url}${cipherB64Url}﷮﷯`
}

/**
 * Encrypt bank details request payload in ServiceNow format
 * @param {object} payload - Bank details data to encrypt
 * @param {object} request - Hapi request object with logger
 * @returns {string} Encrypted data in ServiceNow format
 * @throws {Error} If encryption fails
 */
export function encryptBankDetailsPayload(payload, request) {
  const encryptionKey = config.get('fssEncryptionKey')

  try {
    const plaintext = JSON.stringify(payload)
    request.logger.debug(`Encrypting payload: ${plaintext}`)
    const encryptedData = encryptServiceNowBankDetails(plaintext, encryptionKey)
    request.logger.debug(
      `Payload encrypted successfully: ${encryptedData.substring(0, FIRST_50_CHARS)}...`
    )
    return encryptedData
  } catch (encryptErr) {
    request.logger.error(`Error encrypting bank details: ${encryptErr}`)
    throw Boom.internal('Failed to encrypt bank details')
  }
}
