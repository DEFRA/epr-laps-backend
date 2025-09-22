import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import Wreck from '@hapi/wreck'
import jwkToPem from 'jwk-to-pem'

// Import module under test
import {
  authPlugin,
  getKey,
  jwtValidate,
  __setCachedDiscovery
} from './auth.js'

// ----------------------------
// Mocks
// ----------------------------
vi.mock('@hapi/wreck', () => ({
  default: {
    get: vi.fn()
  }
}))

vi.mock('jwk-to-pem', () => ({
  default: vi.fn(() => 'MOCK_PEM')
}))

// ----------------------------
// Auth plugin tests
// ----------------------------
describe('auth plugin', () => {
  let server

  beforeEach(async () => {
    vi.clearAllMocks()
    // mock discovery doc
    Wreck.get.mockResolvedValue({
      payload: {
        jwks_uri: 'https://example.com/.well-known/jwks.json',
        issuer: 'https://example.com/'
      }
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
  it('should return isValid false if relationships is missing', () => {
    const decoded = { sub: '123', roles: ['admin'] }
    const result = jwtValidate(decoded, {}, {})
    expect(result.isValid).toBe(false)
  })

  it('should return isValid false if roles is missing', () => {
    const decoded = { sub: '123', relationships: ['LA1'] }
    const result = jwtValidate(decoded, {}, {})
    expect(result.isValid).toBe(false)
  })

  it('should return isValid true and correct credentials if all required fields exist', () => {
    const decoded = {
      sub: '123',
      relationships: ['444:1234:Glamshire County Council:0:employee:0'],
      roles: ['23950a2d-c37d-43da-9fcb-0a4ce9aa11ee:CEO:3'],
      currentRelationshipId: '444'
    }
    const result = jwtValidate(decoded, {}, {})
    expect(result.isValid).toBe(true)
    expect(result.credentials).toEqual({
      userId: '123',
      localAuthority: 'Glamshire County Council',
      role: 'CEO'
    })
  })
})

// ----------------------------
// getKey tests
// ----------------------------
describe('getKey', () => {
  const testPem =
    '-----BEGIN PUBLIC KEY-----\ntest-pem-key\n-----END PUBLIC KEY-----'

  beforeEach(() => {
    vi.clearAllMocks()
    __setCachedDiscovery({
      jwks_uri: 'http://fake-jwks'
    })
  })

  it('returns PEM key when JWKS has keys', async () => {
    Wreck.get.mockResolvedValueOnce({
      payload: { keys: [{ kty: 'RSA', n: 'n', e: 'AQAB' }] }
    })
    jwkToPem.mockReturnValue(testPem)

    const result = await getKey()
    expect(result).toEqual({ key: testPem })
  })

  it('throws Boom.unauthorized if JWKS has no keys', async () => {
    Wreck.get.mockResolvedValueOnce({ payload: { keys: [] } }) // JWKS empty

    await expect(getKey()).rejects.toThrow('No JWKS keys found')
  })

  it('throws Boom.internal if JWKS fetch fails', async () => {
    Wreck.get.mockRejectedValueOnce(new Error('Network error'))

    await expect(getKey()).rejects.toThrow(
      'Cannot verify auth token: Network error'
    )
  })

  it('throws Boom.internal if discovery doc has no jwks_uri', async () => {
    __setCachedDiscovery({}) // simulate missing jwks_uri

    await expect(getKey()).rejects.toThrow(
      'No jwks_uri found in discovery document'
    )
  })
})
