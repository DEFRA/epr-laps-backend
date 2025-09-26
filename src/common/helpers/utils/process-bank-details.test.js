import { describe, it, expect } from 'vitest'
import { processBankDetails } from './process-bank-details.js'

describe('processBankDetails', () => {
  it('returns unmasked sortcode for CEO role', () => {
    const input = { sortCode: '654321', confirmed: false }
    const role = 'Chief Executive Officer'
    const output = processBankDetails(input, role)
    expect(output.sortCode).toBe('654321')
  })

  it('masks sortcode for non-CEO roles', () => {
    const input = { sortCode: '123456', confirmed: true }
    const role = 'Staff'
    const output = processBankDetails(input, role)
    expect(output.sortCode).toBe('ending with 56')
  })
})
