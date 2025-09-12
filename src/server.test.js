import { vi, describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createServer, jwtValidate } from './server.js'

// Mock MongoDB BEFORE importing server
vi.mock('../../common/helpers/mongodb.js', () => ({
  mongoDb: {
    register: vi.fn(async (server) => {
      server.decorate('server', 'mongo', {})
      server.decorate('request', 'mongo', {})
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
  })

  afterAll(async () => {
    if (server) await server.stop({ timeout: 0 })
  })

  test('createServer returns a Hapi server instance', () => {
    expect(server).toBeDefined()
    expect(server.info).toBeDefined()
  })
})
