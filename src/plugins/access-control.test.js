import Hapi from '@hapi/hapi'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  accessControl,
  normaliseRoles,
  resolveEffectiveRole
} from './access-control'
import { config } from '../config'

vi.mock('../config.js')
config.get = vi.fn((key) => {
  const config = {
    authorization: {
      viewFullBankDetails: ['CEO', 'HOF'],
      confirmBankDetails: ['HOF']
    }
  }
  return config[key]
})

const findAuthDecisionLog = (spy) =>
  spy.mock.calls
    .map(([msg]) => msg)
    .find(
      (msg) =>
        typeof msg === 'string' && msg.startsWith('authorization decision')
    )

describe('accessControl plugin', () => {
  let server
  beforeEach(async () => {
    server = Hapi.server()

    // ensure every request has a logger so accessControl never crashes
    server.ext('onRequest', (request, h) => {
      request.logger = { info: vi.fn(), debug: vi.fn() }
      return h.continue
    })

    await server.register([accessControl])
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['ignored routes', '/health'],
    ['other routes', '/test-route'],
    ['new urls', '/test-route'],
    ['registered routes', '/bank-details/test']
  ])('should allow access to %s (%s)', async (_scenario, path) => {
    server.route({
      method: 'GET',
      path,
      handler: (_request, h) => h.response({ message: 'success' })
    })

    const response = await server.inject({
      method: 'GET',
      url: path,
      auth: {
        credentials: { role: 'Chief Executive Officer' },
        strategy: 'default'
      }
    })
    expect(response.statusCode).toBe(200)
  })

  it('sets isAuthorized=true and logs allowed when effective role is permitted', async () => {
    const infoSpy = vi.fn()

    server.ext('onPreAuth', (request, h) => {
      request.logger = { info: infoSpy, debug: vi.fn() }
      return h.continue
    })

    server.route({
      method: 'GET',
      path: '/bank-details/{localAuthority}',
      handler: (request, h) => {
        expect(request.auth.isAuthorized).toBe(true)
        return h.response({ message: 'ok' })
      }
    })

    const res = await server.inject({
      method: 'GET',
      url: '/bank-details/abc',
      auth: {
        credentials: {
          rawRoles: 'Chief Executive Officer, Head of Finance',
          roles: ['123:Chief Executive Officer:1', '456:Head of Finance:2']
        },
        strategy: 'default'
      }
    })

    expect(res.statusCode).toBe(200)
    const authLog = findAuthDecisionLog(infoSpy)
    expect(authLog).toMatch(
      /authorization decision \| action=viewFullBankDetails \| effectiveRole=HOF \| rolesProvided=CEO,HOF \| outcome=allowed/
    )
  })

  it('uses colon-separated role, maps and denies when not allowed', async () => {
    const infoSpy = vi.fn()

    // ensure this request uses our spy logger
    server.ext('onPreAuth', (request, h) => {
      request.logger = { info: infoSpy, debug: vi.fn() }
      return h.continue
    })

    server.route({
      method: 'PUT',
      path: '/bank-details',
      handler: (request, h) => {
        expect(request.auth.isAuthorized).toBe(false)
        return h.response({ message: 'ok' })
      }
    })

    const res = await server.inject({
      method: 'PUT',
      url: '/bank-details',
      auth: {
        credentials: {
          rawRoles: 'Waste Officer',
          roles: ['123:Waste Officer:1']
        },
        strategy: 'default'
      }
    })

    expect(res.statusCode).toBe(200)
    const authLog = findAuthDecisionLog(infoSpy)

    expect(authLog).toMatch(
      /authorization decision \| action=confirmBankDetails \| effectiveRole=WO \| rolesProvided=WO \| outcome=denied/
    )
  })

  it('picks highest-priority effectiveRole when multiple roles', async () => {
    const infoSpy = vi.fn()

    // attach spy logger before onPostAuth runs
    server.ext('onPreAuth', (request, h) => {
      request.logger = { info: infoSpy, debug: vi.fn() }
      return h.continue
    })

    server.route({
      method: 'GET',
      path: '/bank-details/{localAuthority}',
      handler: (request, h) => {
        // HOF has higher priority than CEO, both allowed
        expect(request.auth.isAuthorized).toBe(true)
        return h.response({ message: 'ok' })
      }
    })

    const res = await server.inject({
      method: 'GET',
      url: '/bank-details/some-la',
      auth: {
        credentials: {
          roles: ['123:Chief Executive Officer:1', '456:Head of Finance:2'],
          rawRoles: 'Chief Executive Officer, Head of Finance'
        },
        strategy: 'default'
      }
    })
    const authLog = findAuthDecisionLog(infoSpy)
    expect(res.statusCode).toBe(200)
    expect(authLog).toMatch(
      /authorization decision \| action=viewFullBankDetails \| effectiveRole=HOF \| rolesProvided=CEO,HOF \| outcome=allowed/
    )
  })

  it('handles no mapped roles (empty roles array -> unauthorized)', async () => {
    const infoSpy = vi.fn()

    server.ext('onPreAuth', (request, h) => {
      request.logger = { info: infoSpy, debug: vi.fn() }
      return h.continue
    })

    server.route({
      method: 'GET',
      path: '/bank-details/{localAuthority}',
      handler: (request, h) => {
        console.log('handler reached, auth:', {
          isAuthorized: request.auth.isAuthorized,
          credentials: request.auth.credentials,
          loggerCalled: infoSpy.mock.calls.length > 0
        })
        return h.response({ message: 'ok' })
      }
    })

    const res = await server.inject({
      method: 'GET',
      url: '/bank-details/xyz',
      auth: {
        credentials: { roles: [] },
        strategy: 'default'
      }
    })

    expect(res.statusCode).toBe(200)
  })

  describe('normaliseRoles', () => {
    it('normalises a single role string', () => {
      const result = normaliseRoles('Chief Executive Officer')
      expect(result).toEqual(['CEO'])
    })

    it('normalises an array of role strings', () => {
      const result = normaliseRoles('Chief Executive Officer, Head of Finance')

      expect(result).toEqual(['CEO', 'HOF'])
    })

    it('filters out unmapped roles', () => {
      const result = normaliseRoles('Unknown Role')
      expect(result).toEqual([])
    })

    it('handles mixed valid and invalid roles', () => {
      const result = normaliseRoles('Chief Executive Officer, Unknown Role')

      expect(result).toEqual(['CEO'])
    })

    it('wraps non-array input into array', () => {
      const result = normaliseRoles('Head of Finance')
      expect(result).toEqual(['HOF'])
    })
  })

  describe('resolveEffectiveRole', () => {
    it('returns null when no roles are provided', () => {
      expect(resolveEffectiveRole([])).toBeNull()
    })

    it('returns the only role when one is provided', () => {
      expect(resolveEffectiveRole(['CEO'])).toBe('CEO')
    })

    it('returns the highest-priority role when multiple are provided', () => {
      const result = resolveEffectiveRole(['CEO', 'HOF', 'WO'])
      expect(result).toBe('HOF')
    })

    it('does not mutate the input array', () => {
      const roles = ['CEO', 'HOF']
      resolveEffectiveRole(roles)
      expect(roles).toEqual(['CEO', 'HOF'])
    })
  })
})
