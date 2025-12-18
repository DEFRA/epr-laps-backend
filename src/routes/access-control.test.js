import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

describe('accessControl route', async () => {
  let accessControl
  let mockAuthorizationConfig

  beforeEach(async () => {
    mockAuthorizationConfig = { roles: ['admin', 'user'] }

    const { config } = await import('../config.js')
    config.get.mockReturnValue(mockAuthorizationConfig)

    accessControl = (await import('./access-control.js')).accessControl
  })

  it('returns authorization config', () => {
    const h = {
      response: vi.fn().mockReturnValue('response')
    }

    const result = accessControl.handler({}, h)

    expect(h.response).toHaveBeenCalledWith(mockAuthorizationConfig)
    expect(result).toBe('response')
  })

  it('has correct method and path', () => {
    expect(accessControl.method).toBe('GET')
    expect(accessControl.path).toBe('/permissions/config')
  })
})
