import { describe, it, beforeEach, vi, expect } from 'vitest'
import fetch from 'node-fetch'
import { getBankDetails } from './get.js'
import Boom from '@hapi/boom'
import * as auditLogging from '../../common/helpers/audit-logging.js'

vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

vi.mock('../../common/helpers/utils/process-bank-details.js', () => ({
  processBankDetails: vi.fn((details) => details)
}))

vi.spyOn(auditLogging, 'writeAuditLog')

const mockLogger = { error: vi.fn(), info: vi.fn(), debug: vi.fn() }

// Fixed makeRequest: localAuthority now in params, role in credentials
const makeRequest = (
  role = 'Chief Executive Officer',
  localAuthority = 'Some Local Authority',
  isAuthorized = false
) => ({
  auth: { credentials: { role }, isAuthorized },
  params: { localAuthority },
  logger: mockLogger
})

const makeH = () => ({
  response: (data) => ({
    code: (status) => ({ data, status })
  })
})

describe('getBankDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws Boom.internal when fetch rejects', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const request = makeRequest()
    const h = makeH()

    await expect(getBankDetails(request, h)).rejects.toThrow(Boom.Boom)
    expect(request.logger.error).toHaveBeenCalled()
  })

  it('writes to audit log correctly for CEO', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ some: 'data' })
    })

    const request = {
      params: { localAuthority: 'Some Local Authority' },
      logger: mockLogger,
      auth: {
        credentials: { role: 'Chief Executive Officer' },
        isAuthorized: true
      }
    }
    const h = makeH()

    const result = await getBankDetails(request, h)

    expect(auditLogging.writeAuditLog).toHaveBeenCalledWith(
      request,
      auditLogging.ActionKind.FullBankDetailsViewed,
      auditLogging.Outcome.Success
    )
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ some: 'data' })
  })

  it('writes to audit log correctly for Waste Officer', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ some: 'data' })
    })

    const request = {
      params: { localAuthority: 'Some Local Authority' },
      logger: mockLogger,
      auth: { credentials: { role: 'Head of Finance' }, isAuthorized: false }
    }
    const h = makeH()

    const result = await getBankDetails(request, h)

    expect(auditLogging.writeAuditLog).toHaveBeenCalledWith(
      request,
      auditLogging.ActionKind.MaskedBankDetailsViewed,
      auditLogging.Outcome.Success
    )
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ some: 'data' })
  })

  it('writes to audit log correctly for HOF', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ some: 'data' })
    })

    const request = {
      params: { localAuthority: 'Some Local Authority' },
      logger: mockLogger,
      auth: { credentials: { role: 'Head of Finance' }, isAuthorized: true }
    }
    const h = makeH()

    const result = await getBankDetails(request, h)

    expect(auditLogging.writeAuditLog).toHaveBeenCalledWith(
      request,
      auditLogging.ActionKind.FullBankDetailsViewed,
      auditLogging.Outcome.Success
    )
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ some: 'data' })
  })
})
