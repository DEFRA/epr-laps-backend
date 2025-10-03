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
  beforeEach(() => {
    server = Hapi.server()
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
    await server.register([accessControl])

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
    await server.register([accessControl])

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
    await server.register([accessControl])

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
    await server.register([accessControl])

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
})
