import { describe, it, expect } from 'vitest'
import { processBankDetails } from './process-bank-details.js'

describe('processBankDetails', () => {
  it('returns unmasked sortcode for CEO role', () => {
    const input = { sortcode: '654321', confirmed: false }
    const role = 'Chief Executive Officer'
    const output = processBankDetails(input, role)
    expect(output.sortcode).toBe('654321')
    expect(output.showDropdownDetails).toBe(true)
    expect(output.showNotificationBanner).toBe(true)
  })

  it('masks sortcode for non-CEO roles', () => {
    const input = { sortcode: '123456', confirmed: true }
    const role = 'Staff'
    const output = processBankDetails(input, role)
    expect(output.sortcode).toBe('ending with 56')
    expect(output.showDropdownDetails).toBe(false)
    expect(output.showNotificationBanner).toBe(false)
  })

  it('sets flags correctly for HOF when confirmed is false', () => {
    const input = { sortcode: '987654', confirmed: false }
    const role = 'Head Of Finance'
    const output = processBankDetails(input, role)
    expect(output.showNotificationBanner).toBe(true)
    expect(output.showConfirmBankDetails).toBe(true)
    expect(output.showDropdownDetails).toBe(true)
  })

  it('does not show notification for HOF when confirmed is true', () => {
    const input = { sortcode: '987654', confirmed: true }
    const role = 'Head Of Finance'
    const output = processBankDetails(input, role)
    expect(output.showNotificationBanner).toBe(false)
    expect(output.showConfirmBankDetails).toBe(false)
    expect(output.showDropdownDetails).toBe(true)
  })
})
