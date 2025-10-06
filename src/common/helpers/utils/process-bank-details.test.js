import { describe, it, expect } from 'vitest'
import { processBankDetails } from './process-bank-details.js'
import { roles } from '../../constants/constants.js'

describe('processBankDetails', () => {
  it('returns unmasked sortcode and account number for CEO role', () => {
    const input = {
      sortCode: '654321',
      accountNumber: '11112222',
      confirmed: false
    }
    const output = processBankDetails(input, roles.CEO)
    expect(output.sortCode).toBe('654321')
    expect(output.accountNumber).toBe('11112222')
  })

  it('returns unmasked sortcode and account number for Head of Finance role', () => {
    const input = {
      sortCode: '987654',
      accountNumber: '22223333',
      confirmed: true
    }
    const output = processBankDetails(input, roles.HOF)
    expect(output.sortCode).toBe('987654')
    expect(output.accountNumber).toBe('22223333')
  })

  it('masks sortcode and account number for non-CEO and non-HOF roles', () => {
    const input = {
      sortCode: '123456',
      accountNumber: '33334444',
      confirmed: true
    }
    const output = processBankDetails(input, 'Staff')
    expect(output.sortCode).toBe('ending with 56')
    expect(output.accountNumber).toBe('ending with 44')
  })

  it('handles masking when account number is short', () => {
    const input = { sortCode: '9876', accountNumber: '12', confirmed: true }
    const output = processBankDetails(input, 'Intern')
    expect(output.sortCode).toBe('ending with 76')
    expect(output.accountNumber).toBe('ending with 12')
  })

  it('returns masked fields as strings (sanity check)', () => {
    const input = {
      sortCode: '111111',
      accountNumber: '99999999',
      confirmed: true
    }
    const output = processBankDetails(input, 'Engineer')
    expect(typeof output.sortCode).toBe('string')
    expect(typeof output.accountNumber).toBe('string')
  })
})
