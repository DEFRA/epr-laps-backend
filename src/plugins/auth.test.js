import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import jwksClient from 'jwks-rsa'
import fetch from 'node-fetch'
import { authPlugin, getKey, jwtValidate } from './auth.js'

// ----------------------------
// Mock dependencies
// ----------------------------

// Mock MongoDB helper
vi.mock('../common/helpers/mongodb.js', () => ({
  mongoDb: {
    plugin: {
      name: 'mongodb',
      register: vi.fn().mockResolvedValue(undefined)
    }
  }
}))

// Mock jwks-rsa
vi.mock('jwks-rsa', () => ({
  default: vi.fn().mockImplementation(() => ({
    getSigningKey: vi.fn()
  }))
}))

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

// ----------------------------
// Auth plugin tests
// ----------------------------

describe('auth plugin', () => {
  let server

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock fetch response for discovery endpoint
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jwks_uri: 'https://example.com/.well-known/jwks.json'
      })
    })

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

// ----------------------------
// jwtValidate tests
// ----------------------------

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

// ----------------------------
// getKey tests
// ----------------------------

describe('getKey', () => {
  let mockGetSigningKey

  beforeEach(() => {
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

// ----------------------------
// Discovery fetch error tests
// ----------------------------

describe('auth plugin discovery errors', () => {
  it('should throw if discovery endpoint fails', async () => {
    fetch.mockResolvedValue({ ok: false, statusText: 'Not Found' })
    const tempServer = Hapi.server()
    await expect(tempServer.register(authPlugin)).rejects.toThrow(
      'Failed to fetch OpenID config'
    )
  })

  it('should throw if jwks_uri is missing', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const tempServer = Hapi.server()
    await expect(tempServer.register(authPlugin)).rejects.toThrow(
      'No jwks_uri found in discovery document'
    )
  })
})
