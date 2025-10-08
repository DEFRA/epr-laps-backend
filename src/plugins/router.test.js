import { describe, it, expect, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import { router } from './router'

describe('router plugin', () => {
  let server

  beforeEach(async () => {
    server = Hapi.server()
    await server.register(router)
  })

  it('registers routes without throwing error', () => {
    // This just ensures the router plugin loads correctly
    expect(() => server.table()).not.toThrow()
    const routes = server.table().map((r) => r.path)
    expect(routes).toContain('/bank-details/{localAuthority}')
    expect(routes).toContain('/file/metadata/{localAuthority}')
    expect(routes).toContain('/example')
    expect(routes).toContain('/example/{exampleId}')
    expect(routes).toContain('/health')
  })
})
