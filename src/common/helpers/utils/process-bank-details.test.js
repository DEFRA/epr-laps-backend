import { describe, it, expect } from 'vitest'
import { processBankDetails } from './process-bank-details.js'

describe('processBankDetails', () => {
  it('returns unmasked sortcode for authorized roles', () => {
    const input = { sortCode: '654321', confirmed: false }
    const output = processBankDetails(input, true)
    expect(output.sortCode).toBe('654321')
  })

  it('masks sortcode for unathorized roles', () => {
    const input = { sortCode: '123456', confirmed: true }
    const output = processBankDetails(input, false)
    expect(output.sortCode).toBe('ending with 56')
  })
})
