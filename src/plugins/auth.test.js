import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
// now import the auth plugin normally
import { authPlugin, getKey, jwtValidate } from './auth.js'

// Mock the MongoDB helper before importing anything that might use it
vi.mock('../common/helpers/mongodb.js', () => {
  return {
    mongoDb: {
      plugin: {
        name: 'mongodb',
        register: vi.fn().mockResolvedValue(undefined) // stub register
      }
    }
  }
})

describe('auth plugin', () => {
  let server

  beforeEach(async () => {
    server = Hapi.server()
    await server.register(authPlugin) // should not blow up, mongo is mocked
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
