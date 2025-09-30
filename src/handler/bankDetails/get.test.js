import { describe, it, beforeEach, vi, expect } from 'vitest'
import fetch from 'node-fetch'
import { getBankDetails } from './get.js'
import Boom from '@hapi/boom'
import { writeAuditLog } from '../../common/helpers/audit-logging.js'

// ----- Mock fetch -----
vi.mock('node-fetch', () => ({
  default: vi.fn()
}))
vi.mock('../../common/helpers/audit-logging.js')

// ----- Mock logger -----
const mockLogger = { error: vi.fn(), info: vi.fn(), debug: vi.fn() }

// ----- Mock request helper -----
const makeRequest = (
  role = 'Chief Executive Officer',
  localAuthority = 'Glamshire County Council'
) => ({
  auth: { credentials: { role, localAuthority } },
  logger: mockLogger
})

describe('getBankDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('throws Boom.internal when external API returns non-OK', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({})
    })

    const request = makeRequest()
    const localAuthority = request.auth.credentials.localAuthority

    await expect(
      getBankDetails(localAuthority, request, {})
    ).rejects.toThrowError(Boom.Boom)

    try {
      await getBankDetails(localAuthority, request, {})
    } catch (err) {
      expect(err.isBoom).toBe(true)
      expect(err.output.statusCode).toBe(500)
      expect(err.message).toBe('Failed to fetch bank details')
    }
  })

  it('throws Boom.internal when fetch rejects', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const request = makeRequest()
    const localAuthority = request.auth.credentials.localAuthority

    await expect(
      getBankDetails(localAuthority, request, {})
    ).rejects.toThrowError(Boom.Boom)

    await getBankDetails(localAuthority, request, {}).catch((err) => {
      expect(err.isBoom).toBe(true)
      expect(err.output.statusCode).toBe(500)
      expect(err.message).toBe('Failed to fetch bank details')
    })
  })

  it('should write to audit log with expected details', async () => {
    vi.mock('node-fetch', () => ({
      default: vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ some: 'data' })
        })
      )
    }))
    const mockedRequest = {
      auth: {
        credentials: {
          role: 'Chief Executive Officer'
        }
      },
      logger: mockLogger
    }
    const mockedH = {
      response: (data) => ({
        code: (status) => ({ data, status })
      })
    }
    await getBankDetails('test', mockedRequest, mockedH)
    expect(writeAuditLog).toHaveBeenCalledWith(
      mockedRequest,
      'FullBankDetailsViewed',
      'Success'
    )
  })
})
