import { describe, it, expect } from 'vitest'
import { processBankDetails } from './process-bank-details.js'

describe('processBankDetails', () => {
  it('returns unmasked sortcode and account number for roles authorized to view bank details', () => {
    const input = {
      sortCode: '654321',
      accountNumber: '11112222',
      confirmed: false
    }
    const output = processBankDetails(input, true)
    expect(output.sortCode).toBe('654321')
    expect(output.accountNumber).toBe('11112222')
  })

  it('masks sortcode and account number for roles unauthorized to view bank details', () => {
    const input = {
      sortCode: '123456',
      accountNumber: '33334444',
      confirmed: true
    }
    const output = processBankDetails(input, false)
    expect(output.sortCode).toBe('ending with 56')
    expect(output.accountNumber).toBe('ending with 444')
  })

  it('handles masking when account number is short', () => {
    const input = { sortCode: '9876', accountNumber: '12', confirmed: true }
    const output = processBankDetails(input, false)
    expect(output.sortCode).toBe('ending with 76')
    expect(output.accountNumber).toBe('ending with 12')
  })

  it('returns masked fields as strings (sanity check)', () => {
    const input = {
      sortCode: '111111',
      accountNumber: '99999999',
      confirmed: true
    }
    const output = processBankDetails(input, false)
    expect(typeof output.sortCode).toBe('string')
    expect(typeof output.accountNumber).toBe('string')
  })
})
