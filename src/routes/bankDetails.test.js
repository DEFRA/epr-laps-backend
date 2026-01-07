// src/routes/bankDetails.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Hapi from '@hapi/hapi'
import { bankDetailsRoutes } from './bankDetails.js'
import * as getModule from '../handler/bankDetails/get.js'
import * as putModule from '../handler/bankDetails/put.js'
import * as postModule from '../handler/bankDetails/post.js'

// Mock the handler modules
vi.mock('../handler/bankDetails/get.js')
vi.mock('../handler/bankDetails/put.js')
vi.mock('../handler/bankDetails/post.js')

describe('bankDetails routes', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()

    getModule.getBankDetails.mockResolvedValue({ statusCode: 200 })
    putModule.putBankDetails.mockResolvedValue({ statusCode: 204 })
    postModule.postBankDetails.mockResolvedValue({ statusCode: 201 })

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

  it('PUT /bank-details/confirm-bank-details calls putBankDetails with valid payload', async () => {
    const payload = {
      accountName: 'John Doe',
      sortCode: '12-34-56',
      accountNumber: '12345678',
      confirmed: true,
      requesterEmail: 'john.doe@test.com',
      sysId: 'ab123',
      jpp: '118',
      localAuthority: 'test'
    }

    await server.inject({
      method: 'PUT',
      url: '/bank-details/confirm-bank-details',
      payload
    })

    expect(putModule.putBankDetails).toHaveBeenCalledTimes(1)
    expect(putModule.putBankDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          ...payload,
          sortCode: payload.sortCode.replace(/[-\s]/g, '')
        }
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
      url: '/bank-details/confirm-bank-details',
      payload: badPayload
    })

    expect(res.statusCode).toBe(400)
    expect(putModule.putBankDetails).not.toHaveBeenCalled()
  })

  it('POST /bank-details calls postBankDetails with valid payload', async () => {
    const payload = {
      localAuthority: 'Westshire',
      accountName: 'John Doe',
      sortCode: '123456',
      accountNumber: '12345678',
      requesterEmail: 'jane.smith@test.com'
    }

    await server.inject({
      method: 'POST',
      url: '/bank-details',
      payload
    })

    expect(postModule.postBankDetails).toHaveBeenCalledTimes(1)
    expect(postModule.postBankDetails).toHaveBeenCalledWith(
      expect.objectContaining({ payload }),
      expect.any(Object)
    )
  })

  it('POST /bank-details sanitises sortCode by removing hyphens and spaces', async () => {
    const dirtySortCode = '12 -34- 56'
    const payload = {
      localAuthority: 'Westshire',
      accountName: 'John Doe',
      sortCode: dirtySortCode,
      accountNumber: '12345678',
      requesterEmail: 'jane.smith@test.com',
      sysId: 'ab123'
    }

    await server.inject({
      method: 'POST',
      url: '/bank-details',
      payload
    })

    expect(postModule.postBankDetails).toHaveBeenCalledTimes(1)

    const handlerCall = postModule.postBankDetails.mock.calls[0][0]
    expect(handlerCall.payload.sortCode).toBe('123456')
  })
})
