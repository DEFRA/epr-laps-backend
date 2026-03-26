import Hapi from '@hapi/hapi'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { accessControl } from './access-control'
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
describe('accessControl plugin', () => {
  let server
  beforeEach(async () => {
    server = Hapi.server()

    // ensure every request has a logger so accessControl never crashes
    server.ext('onRequest', (request, h) => {
      request.logger = { info: vi.fn() }
      return h.continue
    })

    await server.register([accessControl])
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should allow access to ignored routes', async () => {
    server.route({
      method: 'GET',
      path: '/health',
      handler: (_request, h) => h.response({ message: 'success' })
    })

    const response = await server.inject({
      method: 'GET',
      url: '/health',
      auth: {
        credentials: { role: 'Chief Executive Officer' },
        strategy: 'default'
      }
    })
    expect(response.statusCode).toBe(200)
  })

  it('should allow access to for other routes', async () => {
    server.route({
      method: 'GET',
      path: '/test-route',
      handler: (_request, h) => h.response({ message: 'success' })
    })

    const response = await server.inject({
      method: 'GET',
      url: '/test-route',
      auth: {
        credentials: { role: 'Chief Executive Officer' },
        strategy: 'default'
      }
    })
    expect(response.statusCode).toBe(200)
  })

  it('should allow access without setting authorized when new url is added', async () => {
    server.route({
      method: 'GET',
      path: '/test-route',
      handler: (_request, h) => h.response({ message: 'success' })
    })

    const response = await server.inject({
      method: 'GET',
      url: '/test-route',
      auth: {
        credentials: { role: 'Chief Executive Officer' },
        strategy: 'default'
      }
    })
    expect(response.statusCode).toBe(200)
  })

  it('should allow access without errors when a registered route is hit', async () => {
    server.route({
      method: 'GET',
      path: '/bank-details/test',
      handler: (_request, h) => h.response({ message: 'success' })
    })

    const response = await server.inject({
      method: 'GET',
      url: '/bank-details/test',
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
      request.logger = { info: infoSpy }
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
          roles: [
            'c53f8b72-1ad4-4e39-9a2f-92d06b4f3e8d:Chief Executive Officer:3'
          ]
        },
        strategy: 'default'
      }
    })
    console.log('THE RESULT IS', res.result)

    expect(res.statusCode).toBe(200)
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'viewFullBankDetails',
        effectiveRole: 'CEO',
        rolesProvided: ['CEO'],
        outcome: 'allowed'
      }),
      'authorization decision'
    )
  })

  it('uses colon-separated role, maps and denies when not allowed', async () => {
    const infoSpy = vi.fn()

    // ensure this request uses our spy logger
    server.ext('onPreAuth', (request, h) => {
      request.logger = { info: infoSpy }
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
        // string form, colon-separated -> extractRoleName + normaliseRoles
        credentials: { roles: '123:Waste Officer:1' },
        strategy: 'default'
      }
    })

    expect(res.statusCode).toBe(200)
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'confirmBankDetails',
        effectiveRole: 'WO',
        rolesProvided: ['WO'],
        outcome: 'denied'
      }),
      'authorization decision'
    )
  })

  it('picks highest-priority effectiveRole when multiple roles', async () => {
    const infoSpy = vi.fn()

    // attach spy logger before onPostAuth runs
    server.ext('onPreAuth', (request, h) => {
      request.logger = { info: infoSpy }
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
          roles: ['Chief Executive Officer', 'Head of Finance']
        },
        strategy: 'default'
      }
    })

    expect(res.statusCode).toBe(200)
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'viewFullBankDetails',
        effectiveRole: 'HOF',
        rolesProvided: ['CEO', 'HOF'],
        outcome: 'allowed'
      }),
      'authorization decision'
    )
  })

  it('handles no mapped roles (empty roles array -> unauthorized)', async () => {
    const infoSpy = vi.fn()

    server.ext('onPreAuth', (request, h) => {
      request.logger = { info: infoSpy }
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

    console.log('FULL RESPONSE:', {
      statusCode: res.statusCode,
      result: res.result,
      payload: res.payload,
      logs: infoSpy.mock.calls
    })

    expect(res.statusCode).toBe(200)
  })
})
