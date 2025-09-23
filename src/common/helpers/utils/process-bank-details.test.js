import { describe, it, expect } from 'vitest'
import { processBankDetails } from './process-bank-details.js'

describe('processBankDetails', () => {
  it('returns unmasked sortcode for CEO role', () => {
    const input = { sortcode: '654321', confirmed: false }
    const role = 'Chief Executive Officer'
    const output = processBankDetails(input, role)
    expect(output.sortcode).toBe('654321')
  })

  it('masks sortcode for non-CEO roles', () => {
    const input = { sortcode: '123456', confirmed: true }
    const role = 'Staff'
    const output = processBankDetails(input, role)
    expect(output.sortcode).toBe('ending with 56')
  })
})
