import { describe, it, expect, vi, beforeEach } from 'vitest'
import { router } from './router.js'
import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'
import Hapi from '@hapi/hapi'

vi.mock('../handler/bankDetails/get.js', () => ({
  getBankDetails: vi.fn()
}))

vi.mock('../handler/bankDetails/put.js', () => ({
  putBankDetails: vi.fn()
}))

describe('router plugin', () => {
  let server

  beforeEach(async () => {
    vi.clearAllMocks()
    server = Hapi.server()
    await server.register(router)
  })

  it('registers GET /bank-details/{localAuthority}', async () => {
    await server.inject({
      method: 'GET',
      url: '/bank-details/Westshire'
    })

    expect(getBankDetails).toHaveBeenCalledTimes(1)
    expect(getBankDetails).toHaveBeenCalledWith(
      expect.objectContaining({ params: { localAuthority: 'Westshire' } }),
      expect.any(Object)
    )
  })

  it('registers PUT /bank-details/{localAuthority} with validation', async () => {
    const payload = {
      accountName: 'John Doe',
      sortCode: '12-34-56',
      accountNumber: '12345678',
      confirmed: true
    }

    await server.inject({
      method: 'PUT',
      url: '/bank-details/Westshire',
      payload
    })

    expect(putBankDetails).toHaveBeenCalledTimes(1)
    expect(putBankDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { localAuthority: 'Westshire' },
        payload
      }),
      expect.any(Object)
    )
  })

  it('rejects invalid payload for PUT /bank-details/{localAuthority}', async () => {
    const badPayload = {
      accountName: 'John Doe',
      sortCode: 'invalid', // ❌ wrong format
      accountNumber: '12345678',
      confirmed: true
    }

    const res = await server.inject({
      method: 'PUT',
      url: '/bank-details/Westshire',
      payload: badPayload
    })

    expect(res.statusCode).toBe(400) // Joi validation should fail
    expect(putBankDetails).not.toHaveBeenCalled()
  })
})
