import { vi, describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createServer, jwtValidate } from './server.js'

// ✅ Mock the entire mongoDb module so no real client is created
vi.mock('./common/helpers/mongodb.js', () => ({
  mongoDb: {
    name: 'mongoDb',
    version: '1.0.0',
    register: vi.fn(async (server) => {
      server.decorate('server', 'mongo', {}) // fake mongo on server
      server.decorate('request', 'mongo', {}) // fake mongo on request
    })
  }
}))

describe('JWT validate function', () => {
  test('returns isValid true for valid payload', () => {
    const payload = {
      userId: '123',
      localAuthority: 'SomeAuthority',
      role: 'admin'
    }
    const artifacts = { decoded: { payload } }
    const result = jwtValidate(artifacts)
    expect(result.isValid).toBe(true)
    expect(result.credentials).toEqual(payload)
  })

  test('returns isValid false if localAuthority missing', () => {
    const payload = { userId: '123', role: 'admin' }
    const artifacts = { decoded: { payload } }
    const result = jwtValidate(artifacts)
    expect(result.isValid).toBe(false)
  })

  test('returns isValid false if role missing', () => {
    const payload = { userId: '123', localAuthority: 'SomeAuthority' }
    const artifacts = { decoded: { payload } }
    const result = jwtValidate(artifacts)
    expect(result.isValid).toBe(false)
  })
})

describe('Server bootstrap', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
  }, 20000) // ⬅ increase timeout for safety

  afterAll(async () => {
    if (server) {
      await server.stop({ timeout: 0 })
    }
  })

  test('createServer returns a Hapi server instance', () => {
    expect(server).toBeDefined()
    expect(server.info).toBeDefined()
  })
})
