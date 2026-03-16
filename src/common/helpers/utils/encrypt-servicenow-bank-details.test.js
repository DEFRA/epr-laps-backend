import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  base64ToUrlBase64,
  encryptServiceNowBankDetails,
  encryptBankDetailsPayload
} from './encrypt-servicenow-bank-details.js'
import { config } from '../../../config.js'
import Boom from '@hapi/boom'

vi.mock('../../../config.js', () => ({
  config: { get: vi.fn() }
}))

describe('encrypt-servicenow-bank-details', () => {
  let mockRequest

  beforeEach(() => {
    mockRequest = {
      logger: {
        debug: vi.fn(),
        error: vi.fn()
      }
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('base64ToUrlBase64', () => {
    it('should convert + to - in Base64 string', () => {
      const input = 'Hello+World'
      const expected = 'Hello-World'
      expect(base64ToUrlBase64(input)).toBe(expected)
    })

    it('should convert / to _ in Base64 string', () => {
      const input = 'Hello/World'
      const expected = 'Hello_World'
      expect(base64ToUrlBase64(input)).toBe(expected)
    })

    it('should handle strings with no special characters', () => {
      const input = 'SGVsbG9Xb3JsZA=='
      expect(base64ToUrlBase64(input)).toBe(input)
    })

    it('should handle empty strings', () => {
      expect(base64ToUrlBase64('')).toBe('')
    })
  })

  describe('encryptServiceNowBankDetails', () => {
    const validKey = Buffer.alloc(32, 'a').toString('base64') // 32-byte key
    const invalidKey16 = Buffer.alloc(16, 'a').toString('base64') // 16-byte key
    const invalidKey64 = Buffer.alloc(64, 'a').toString('base64') // 64-byte key
    const plaintext = 'test data'

    it('should encrypt plaintext successfully with valid 32-byte key', () => {
      const result = encryptServiceNowBankDetails(plaintext, validKey)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should produce output with correct ServiceNow format delimiters', () => {
      const result = encryptServiceNowBankDetails(plaintext, validKey)
      expect(result).toMatch(/^﷞﷟﷒/)
      expect(result).toMatch(/﷮﷯$/)
    })

    it('should include the keyId in the encrypted output', () => {
      const keyId = 'b5d62a861be6f2102f6943f5e34bcbca'
      const result = encryptServiceNowBankDetails(plaintext, validKey, keyId)
      expect(result).toContain(keyId)
    })

    it('should include the version in the encrypted output', () => {
      const result = encryptServiceNowBankDetails(
        plaintext,
        validKey,
        'b5d62a861be6f2102f6943f5e34bcbca',
        '2'
      )
      expect(result).toContain('2')
    })

    it('should use default version "1" when not provided', () => {
      const result = encryptServiceNowBankDetails(plaintext, validKey)
      expect(result).toMatch(/﷬﷔1﷬﷭/)
    })

    it('should throw error when key is 16 bytes instead of 32', () => {
      expect(() => {
        encryptServiceNowBankDetails(plaintext, invalidKey16)
      }).toThrow(/Invalid key length.*must be 32 bytes for AES-256-CBC/)
    })

    it('should throw error when key is 64 bytes instead of 32', () => {
      expect(() => {
        encryptServiceNowBankDetails(plaintext, invalidKey64)
      }).toThrow(/Invalid key length.*must be 32 bytes for AES-256-CBC/)
    })

    it('should encrypt different plaintexts to different ciphertexts', () => {
      const plaintext1 = 'data1'
      const plaintext2 = 'data2'
      const result1 = encryptServiceNowBankDetails(plaintext1, validKey)
      const result2 = encryptServiceNowBankDetails(plaintext2, validKey)
      expect(result1).not.toBe(result2)
    })

    it('should encrypt same plaintext to different ciphertexts (different IV)', () => {
      const result1 = encryptServiceNowBankDetails(plaintext, validKey)
      const result2 = encryptServiceNowBankDetails(plaintext, validKey)
      // Different IVs should produce different ciphertexts
      expect(result1).not.toBe(result2)
    })

    it('should handle JSON stringified data', () => {
      const jsonData = JSON.stringify({
        accountNumber: '12345678',
        sortCode: '12-34-56'
      })
      const result = encryptServiceNowBankDetails(jsonData, validKey)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle empty plaintext', () => {
      const result = encryptServiceNowBankDetails('', validKey)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle long plaintext', () => {
      const longPlaintext = 'x'.repeat(1000)
      const result = encryptServiceNowBankDetails(longPlaintext, validKey)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })
  })

  describe('encryptBankDetailsPayload', () => {
    const validKey = Buffer.alloc(32, 'a').toString('base64')
    const payload = {
      accountNumber: '12345678',
      sortCode: '12-34-56',
      accountName: 'John Doe'
    }

    beforeEach(() => {
      config.get.mockImplementation((key) => {
        if (key === 'fssEncryptionKey') return validKey
        return undefined
      })
    })

    it('should encrypt payload successfully', () => {
      const result = encryptBankDetailsPayload(payload, mockRequest)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should stringify the payload before encrypting', () => {
      const result = encryptBankDetailsPayload(payload, mockRequest)
      expect(result).toMatch(/^﷞﷟﷒/)
      expect(result).toMatch(/﷮﷯$/)
    })

    it('should log debug message when encrypting', () => {
      encryptBankDetailsPayload(payload, mockRequest)
      expect(mockRequest.logger.debug).toHaveBeenCalled()
      const debugCalls = mockRequest.logger.debug.mock.calls
      expect(
        debugCalls.some((call) => call[0].includes('Encrypting payload'))
      ).toBe(true)
    })

    it('should log debug message on successful encryption', () => {
      encryptBankDetailsPayload(payload, mockRequest)
      const debugCalls = mockRequest.logger.debug.mock.calls
      expect(
        debugCalls.some((call) =>
          call[0].includes('Payload encrypted successfully')
        )
      ).toBe(true)
    })

    it('should get encryption key from config', () => {
      encryptBankDetailsPayload(payload, mockRequest)
      expect(config.get).toHaveBeenCalledWith('fssEncryptionKey')
    })

    it('should throw Boom.internal when encryption key is invalid length', () => {
      const invalidKey = Buffer.alloc(16, 'a').toString('base64')
      config.get.mockImplementation(() => invalidKey)

      expect(() => {
        encryptBankDetailsPayload(payload, mockRequest)
      }).toThrow(Boom.internal('Failed to encrypt bank details'))
    })

    it('should log error when encryption fails', () => {
      const invalidKey = Buffer.alloc(16, 'a').toString('base64')
      config.get.mockImplementation(() => invalidKey)

      try {
        encryptBankDetailsPayload(payload, mockRequest)
      } catch (e) {
        // Expected
      }

      expect(mockRequest.logger.error).toHaveBeenCalled()
    })

    it('should handle empty payload object', () => {
      const result = encryptBankDetailsPayload({}, mockRequest)
      expect(result).toBeDefined()
    })

    it('should handle payload with nested objects', () => {
      const complexPayload = {
        account: {
          number: '12345678',
          details: {
            holder: 'John'
          }
        }
      }
      const result = encryptBankDetailsPayload(complexPayload, mockRequest)
      expect(result).toBeDefined()
    })

    it('should handle payload with special characters', () => {
      const specialPayload = {
        name: 'José García',
        notes: 'Ñ special chars 日本語'
      }
      const result = encryptBankDetailsPayload(specialPayload, mockRequest)
      expect(result).toBeDefined()
    })
  })
})
