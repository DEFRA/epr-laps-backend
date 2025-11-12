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

  it('POST /bank-details calls postBankDetails with valid payload', async () => {
    const payload = {
      localAuthority: 'Westshire',
      accountName: 'John Doe',
      sortCode: '123456',
      accountNumber: '12345678',
      requesterName: 'Jane Smith'
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

  it('POST /bank-details returns validation error for sortCode with hyphens or spaces', async () => {
    const payloads = [
      { sortCode: '12-34-56' },
      { sortCode: '12 34 56' },
      { sortCode: '12 - 34' }
    ]

    for (const payload of payloads) {
      const response = await server.inject({
        method: 'POST',
        url: '/bank-details',
        payload: {
          localAuthority: 'Westshire',
          accountName: 'John Doe',
          sortCode: payload.sortCode,
          accountNumber: '12345678',
          requesterName: 'Jane Smith'
        }
      })

      expect(response.statusCode).toBe(400)
      expect(response.result.message).toBe('Invalid request payload input')
    }
  })

  it('POST rejects invalid payload', async () => {
    const badPayload = {
      localAuthority: '',
      accountName: '',
      sortCode: '',
      accountNumber: '',
      requesterName: ''
    }

    const res = await server.inject({
      method: 'POST',
      url: '/bank-details',
      payload: badPayload
    })

    expect(res.statusCode).toBe(400)
    expect(postModule.postBankDetails).not.toHaveBeenCalled()
  })
})
