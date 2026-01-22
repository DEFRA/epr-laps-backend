import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import Wreck from '@hapi/wreck'
import jwkToPem from 'jwk-to-pem'

// Import module under test
import {
  authPlugin,
  getKey,
  jwtValidate,
  _setCachedDiscovery,
  extractCurrentLocalAuthority
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
  it('should return isValid false if roles is missing', () => {
    const decoded = { sub: '123' }
    const request = {
      logger: {
        debug: vi.fn()
      }
    }
    const result = jwtValidate(decoded, request, {})
    expect(result.isValid).toBe(false)
  })

  it('should return isValid true and correct credentials if all required fields exist', () => {
    const decoded = {
      sub: '123',
      roles: ['23950a2d-c37d-43da-9fcb-0a4ce9aa11ee:CEO:3']
    }
    const request = {
      logger: {
        debug: vi.fn()
      }
    }
    const result = jwtValidate(decoded, request, {})
    expect(result.isValid).toBe(true)
    expect(result.credentials).toEqual({
      userId: '123',
      role: 'CEO',
      currentOrganisation: '',
      sub: '123',
      roles: ['23950a2d-c37d-43da-9fcb-0a4ce9aa11ee:CEO:3']
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
    _setCachedDiscovery({
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
    _setCachedDiscovery({}) // simulate missing jwks_uri

    await expect(getKey()).rejects.toThrow(
      'No jwks_uri found in discovery document'
    )
  })
})

describe('#extractCurrentLocalAuthority', () => {
  it('should return the current local authority', () => {
    const decoded = {
      relationships: [
        '666:asdarwq:local-authority:456:Shelbyville Council:2',
        '3b52415a:56808f0b:Warwickshire County Council:0:Employee:0'
      ],
      currentRelationshipId: '3b52415a'
    }
    const result = extractCurrentLocalAuthority(decoded)
    expect(result).toBe('Warwickshire County Council')
  })

  it('should return the current local authority', () => {
    const decoded = {
      relationships: [
        '666:asdarwq:local-authority:456:Shelbyville Council:2',
        '3b52415a:56808f0b:Warwickshire County Council:0:Employee:0'
      ],
      currentRelationshipId: '3b52415a'
    }
    const result = extractCurrentLocalAuthority(decoded)
    expect(result).toBe('Warwickshire County Council')
  })
})
