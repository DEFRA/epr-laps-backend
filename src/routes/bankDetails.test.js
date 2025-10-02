// src/routes/bankDetails.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import { createBankDetailsRoutes } from './bankDetails.js'

const getBankDetails = vi.fn()
const putBankDetails = vi.fn()

describe('bankDetails routes', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()
    server = Hapi.server()
    // Inject mocks
    const bankDetails = createBankDetailsRoutes({
      getBankDetails,
      putBankDetails
    })
    server.route(bankDetails)
  })

  it('GET /bank-details/{localAuthority} calls getBankDetails', async () => {
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

  it('PUT /bank-details/{localAuthority} calls putBankDetails with valid payload', async () => {
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

  it('PUT rejects invalid payload', async () => {
    const badPayload = {
      accountName: '', // invalid
      sortCode: '123', // invalid
      accountNumber: '', // invalid
      confirmed: false // invalid
    }

    const res = await server.inject({
      method: 'PUT',
      url: '/bank-details/Westshire',
      payload: badPayload
    })

    // Joi should catch invalid payload
    expect(res.statusCode).toBe(400)
    expect(putBankDetails).not.toHaveBeenCalled()
  })
})
