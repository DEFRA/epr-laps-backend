import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import jwksClient from 'jwks-rsa'
import { authPlugin, getKey, jwtValidate } from './auth.js'

// Mock the MongoDB helper before importing anything that might use it
vi.mock('../common/helpers/mongodb.js', () => {
  return {
    mongoDb: {
      plugin: {
        name: 'mongodb',
        register: vi.fn().mockResolvedValue(undefined)
      }
    }
  }
})

// Mock jwks-rsa
vi.mock('jwks-rsa', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getSigningKey: vi.fn()
    }))
  }
})

describe('auth plugin', () => {
  let server

  beforeEach(async () => {
    server = Hapi.server()
    await server.register(authPlugin)
  })

  it('should register the auth plugin', async () => {
    expect(server.registrations).toHaveProperty('auth')
  })

  it('should expose getKey', () => {
    expect(getKey).toBeTypeOf('function')
  })

  it('should expose jwtValidate', () => {
    expect(jwtValidate).toBeTypeOf('function')
  })
})

describe('jwtValidate', () => {
  it('should return isValid false if localAuthority is missing', () => {
    const decoded = { userId: '123', role: 'admin' }
    const result = jwtValidate(decoded, {}, {})
    expect(result.isValid).toBe(false)
  })

  it('should return isValid false if role is missing', () => {
    const decoded = { userId: '123', localAuthority: 'LA1' }
    const result = jwtValidate(decoded, {}, {})
    expect(result.isValid).toBe(false)
  })

  it('should return isValid true and credentials if all required fields exist', () => {
    const decoded = { userId: '123', localAuthority: 'LA1', role: 'admin' }
    const result = jwtValidate(decoded, {}, {})
    expect(result.isValid).toBe(true)
    expect(result.credentials).toEqual({
      userId: '123',
      localAuthority: 'LA1',
      role: 'admin'
    })
  })
})

describe('getKey', () => {
  let mockGetSigningKey

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    mockGetSigningKey = vi.fn()
    jwksClient.mockImplementation(() => ({
      getSigningKey: mockGetSigningKey
    }))
  })

  it('should call jwksClient.getSigningKey with the correct kid', (done) => {
    const fakeKey = { publicKey: 'FAKE_KEY' }
    mockGetSigningKey.mockImplementation((kid, cb) => cb(null, fakeKey))

    const header = { kid: '1234' }
    getKey(header, (err, key) => {
      expect(err).toBeNull()
      expect(key).toBe('FAKE_KEY')
      expect(mockGetSigningKey).toHaveBeenCalledWith(
        '1234',
        expect.any(Function)
      )
      done()
    })
  })

  it('should return rsaPublicKey if publicKey is missing', (done) => {
    const fakeKey = { rsaPublicKey: 'RSA_KEY' }
    mockGetSigningKey.mockImplementation((kid, cb) => cb(null, fakeKey))

    const header = { kid: '5678' }
    getKey(header, (err, key) => {
      expect(err).toBeNull()
      expect(key).toBe('RSA_KEY')
      done()
    })
  })

  it('should pass errors from getSigningKey to callback', (done) => {
    const error = new Error('something went wrong')
    mockGetSigningKey.mockImplementation((kid, cb) => cb(error, null))

    const header = { kid: '9999' }
    getKey(header, (err, key) => {
      expect(err).toBe(error)
      expect(key).toBeUndefined()
      done()
    })
  })
})
