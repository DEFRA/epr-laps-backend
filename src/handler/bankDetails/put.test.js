import { describe, it, expect, vi } from 'vitest'
import { putBankDetails } from '../../handler/bankDetails/put.js'

describe('#putBankDetails', () => {
  it('should return h.response function', () => {
    const mock = { response: vi.fn() }
    const result = putBankDetails({}, mock)

    expect(result).toBe(mock.response)
  })
})
