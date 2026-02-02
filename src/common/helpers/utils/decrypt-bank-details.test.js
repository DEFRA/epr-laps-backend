import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import {
  urlBase64ToBase64,
  extractIvAndCiphertext,
  getAlgorithmForKey,
  validateIvLength,
  decryptBankDetails
} from './decrypt-bank-details.js'

describe('decrypt-bank-details utilities', () => {
  describe('urlBase64ToBase64', () => {
    it('converts URL-safe Base64 to standard Base64', () => {
      const urlSafe = 'SGVsbG8gV29ybGQrLy8v'
      const standard = urlBase64ToBase64(urlSafe)
      expect(standard).toBe('SGVsbG8gV29ybGQrLy8v')
    })

    it('replaces - with +', () => {
      expect(urlBase64ToBase64('a-b')).toBe('a+b')
    })

    it('replaces _ with /', () => {
      expect(urlBase64ToBase64('a_b')).toBe('a/b')
    })
  })

  describe('extractIvAndCiphertext', () => {
    it('extracts IV and ciphertext from response data', () => {
      const responseData =
        '4_GsBmOtu1-xzMl58-ckuQ==0DwKl0w5WNQ1cmVCdCA-zOQGoADWSbPm'
      const result = extractIvAndCiphertext(responseData)

      expect(result).toEqual({
        ivB64Url: '4_GsBmOtu1-xzMl58-ckuQ==',
        cipherB64Url: '0DwKl0w5WNQ1cmVCdCA-zOQGoADWSbPm'
      })
    })

    it('throws error when pattern is not found', () => {
      expect(() => extractIvAndCiphertext('invalid')).toThrow(
        'IV and ciphertext pattern not found in response_data'
      )
    })
  })

  describe('getAlgorithmForKey', () => {
    it('returns aes-128-cbc for 16-byte key', () => {
      const key = Buffer.alloc(16)
      expect(getAlgorithmForKey(key)).toBe('aes-128-cbc')
    })

    it('returns aes-256-cbc for 32-byte key', () => {
      const key = Buffer.alloc(32)
      expect(getAlgorithmForKey(key)).toBe('aes-256-cbc')
    })

    it('throws error for invalid key length', () => {
      const key = Buffer.alloc(24)
      expect(() => getAlgorithmForKey(key)).toThrow(
        'Invalid key length: must be 16 or 32 bytes, got 24'
      )
    })
  })

  describe('validateIvLength', () => {
    it('validates 16-byte IV without throwing', () => {
      const iv = Buffer.alloc(16)
      expect(() => validateIvLength(iv)).not.toThrow()
    })

    it('throws error for non-16-byte IV', () => {
      const iv = Buffer.alloc(12)
      expect(() => validateIvLength(iv)).toThrow(
        'Invalid IV length: must be 16 bytes, got 12'
      )
    })
  })

  describe('decryptBankDetails', () => {
    it('decrypts data successfully with valid encryption key and response', () => {
      // Create test data
      const plaintext = JSON.stringify({
        account: '12345',
        sortCode: '11-22-33'
      })
      const key = crypto.randomBytes(32)
      const iv = crypto.randomBytes(16)

      // Encrypt the test data
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
      let encrypted = cipher.update(plaintext)
      encrypted = Buffer.concat([encrypted, cipher.final()])

      // Convert to URL-safe Base64
      const ivB64Url = iv
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
      const cipherB64Url = encrypted
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
      const responseData = ivB64Url + cipherB64Url
      const keyB64 = key.toString('base64')

      // Decrypt
      const decrypted = decryptBankDetails(responseData, keyB64)
      expect(decrypted).toBe(plaintext)
    })

    it('throws error when encryption key is invalid', () => {
      const responseData = 'InvalidIV==InvalidCipher'
      const invalidKey = 'notBase64!'

      expect(() => decryptBankDetails(responseData, invalidKey)).toThrow()
    })

    it('throws error when response data format is invalid', () => {
      const key = Buffer.from('SGVsbG8gV29ybGRdIENvZGVk', 'base64').toString(
        'base64'
      )
      const invalidResponseData = 'invalid_format'

      expect(() => decryptBankDetails(invalidResponseData, key)).toThrow(
        'IV and ciphertext pattern not found in response_data'
      )
    })
  })
})
