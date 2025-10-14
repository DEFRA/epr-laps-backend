// src/routes/bankDetails.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import { bankDetailsRoutes } from './bankDetails.js'
import * as getModule from '../handler/bankDetails/get.js'
import * as putModule from '../handler/bankDetails/put.js'

// Mock the handler modules
vi.mock('../handler/bankDetails/get.js')
vi.mock('../handler/bankDetails/put.js')

describe('bankDetails routes', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()
    server = Hapi.server()
    server.route(bankDetailsRoutes)
  })

  it('GET /bank-details/{localAuthority} calls getBankDetails', async () => {
    await server.inject({
      method: 'GET',
      url: '/bank-details/Westshire'
    })

    expect(getModule.getBankDetails).toHaveBeenCalledTimes(1)
    expect(getModule.getBankDetails).toHaveBeenCalledWith(
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

    expect(putModule.putBankDetails).toHaveBeenCalledTimes(1)
    expect(putModule.putBankDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { localAuthority: 'Westshire' },
        payload
      }),
      expect.any(Object)
    )
  })

  it('PUT rejects invalid payload', async () => {
    const badPayload = {
      accountName: '',
      sortCode: '123',
      accountNumber: '',
      confirmed: false
    }

    const res = await server.inject({
      method: 'PUT',
      url: '/bank-details/Westshire',
      payload: badPayload
    })

    expect(res.statusCode).toBe(400)
    expect(putModule.putBankDetails).not.toHaveBeenCalled()
  })
})
