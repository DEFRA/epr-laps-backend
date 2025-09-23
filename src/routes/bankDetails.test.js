import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bankDetailsRoutes } from './bankDetails.js'
import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'
import { statusCodes } from '../common/constants/status-codes.js'

vi.mock('../handler/bankDetails/get.js', () => ({
  getBankDetails: vi.fn()
}))

vi.mock('../handler/bankDetails/put.js', () => ({
  putBankDetails: vi.fn()
}))

describe('bankDetailsRoutes handler', () => {
  const codeMock = vi.fn()
  const h = {
    response: vi.fn(() => ({ code: codeMock }))
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getBankDetails with localAuthority from params', async () => {
    const request = {
      method: 'get',
      params: { localAuthority: 'Glamshire County Council' }
    }

    await bankDetailsRoutes.handler(request, h)

    expect(getBankDetails).toHaveBeenCalledWith(
      'Glamshire County Council',
      request,
      h
    )
  })

  it('calls putBankDetails when method is put', async () => {
    const request = {
      method: 'put',
      params: { localAuthority: 'Westshire' }
    }

    await bankDetailsRoutes.handler(request, h)

    expect(putBankDetails).toHaveBeenCalledWith(request, h)
  })

  it('returns 405 for unsupported methods', async () => {
    const request = {
      method: 'post',
      params: { localAuthority: 'Northshire' }
    }

    await bankDetailsRoutes.handler(request, h)

    expect(h.response).toHaveBeenCalledWith({ error: 'Method not allowed' })
    expect(codeMock).toHaveBeenCalledWith(statusCodes.notAllowed)
  })
})
