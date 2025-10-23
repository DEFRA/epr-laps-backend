import { describe, it, expect } from 'vitest'
import {
  processDocumentsByFinancialYear,
  getFinancialYearRange
} from './process-document-details.js'

describe('processDocumentsByFinancialYear', () => {
  it('returns empty object when no documents provided', () => {
    const result = processDocumentsByFinancialYear()
    expect(result).toHaveProperty('currentFiscalYear')
    expect(Object.keys(result)).toHaveLength(1)

    const resultEmpty = processDocumentsByFinancialYear([])
    expect(resultEmpty).toHaveProperty('currentFiscalYear')
    expect(Object.keys(resultEmpty)).toHaveLength(1)
  })

  it('formats ISO date correctly', () => {
    const docs = [
      {
        id: 1,
        fileName: 'file1.pdf',
        documentType: 'grant',
        quarter: 'Q1',
        creationDate: '2025-05-15'
      }
    ]
    const result = processDocumentsByFinancialYear(docs)
    const fyDocs = result['2025 to 2026']['EN']
    expect(fyDocs[0].creationDate).toMatch(/15 May 2025/)
  })

  it('formats DD/MM/YYYY date correctly', () => {
    const docs = [
      {
        id: 2,
        fileName: 'file2.pdf',
        documentType: 'remittance',
        quarter: 'Q2',
        creationDate: '15/03/2025'
      }
    ]
    const result = processDocumentsByFinancialYear(docs)
    const fyDocs = result['2024 to 2025']['EN']
    expect(fyDocs[0].creationDate).toMatch(/15 Mar 2025/)
  })

  it('handles unknown documentType gracefully', () => {
    const docs = [
      {
        id: 3,
        fileName: 'file3.pdf',
        documentType: 'unknown',
        quarter: 'Q3',
        creationDate: '2025-06-10'
      }
    ]
    const result = processDocumentsByFinancialYear(docs)
    const fyDocs = result['2025 to 2026']['EN']
    expect(fyDocs[0].documentName).toBe('unknown Q3')
  })

  it('handles missing creationDate', () => {
    const docs = [
      { id: 4, fileName: 'file4.pdf', documentType: 'grant', quarter: 'Q4' }
    ]
    const result = processDocumentsByFinancialYear(docs)
    const fyDocs = result['Unknown']['EN']
    expect(fyDocs[0].creationDate).toBeUndefined()
    expect(fyDocs[0].documentName).toBe('Grant letter Q4')
  })

  it('handles invalid date string', () => {
    const docs = [
      {
        id: 5,
        fileName: 'file5.pdf',
        documentType: 'notice_of_assessment',
        quarter: 'Q1',
        creationDate: 'invalid-date'
      }
    ]
    const result = processDocumentsByFinancialYear(docs)
    const fyDocs = result['Unknown']['EN']
    expect(fyDocs[0].creationDate).toBeUndefined()
    expect(fyDocs[0].documentName).toBe('Notice of assessment Q1')
  })

  it('groups multiple documents by financial year', () => {
    const docs = [
      {
        id: 6,
        fileName: 'file6.pdf',
        documentType: 'grant',
        quarter: 'Q1',
        creationDate: '2025-05-01'
      },
      {
        id: 7,
        fileName: 'file7.pdf',
        documentType: 'remittance',
        quarter: 'Q2',
        creationDate: '15/02/2025'
      }
    ]
    const result = processDocumentsByFinancialYear(docs)

    const fyKeys = Object.keys(result).filter((k) => k !== 'currentFiscalYear')
    expect(fyKeys).toHaveLength(2)

    expect(result['2025 to 2026']['EN']).toHaveLength(1)
    expect(result['2024 to 2025']['EN']).toHaveLength(1)
  })
})

describe('getFinancialYearRange', () => {
  it('returns correct FY for dates after 6th April', () => {
    expect(getFinancialYearRange('2025-04-06')).toBe('2025 to 2026')
    expect(getFinancialYearRange('10/05/2025')).toBe('2025 to 2026')
  })

  it('returns correct FY for dates before 6th April', () => {
    expect(getFinancialYearRange('2025-04-05')).toBe('2024 to 2025')
    expect(getFinancialYearRange('15/03/2025')).toBe('2024 to 2025')
  })

  it('handles 7th April correctly (after FY start)', () => {
    expect(getFinancialYearRange('07/04/2025')).toBe('2025 to 2026')
  })

  it('handles 5th April correctly (before FY start)', () => {
    expect(getFinancialYearRange('05/04/2025')).toBe('2024 to 2025')
  })

  it('handles unknown or missing date', () => {
    expect(getFinancialYearRange()).toBe('Unknown')
    expect(getFinancialYearRange('')).toBe('Unknown')
    expect(getFinancialYearRange('invalid-date')).toBe('Unknown')
  })

  it('works with ISO date format', () => {
    expect(getFinancialYearRange('2025-12-15')).toBe('2025 to 2026')
  })

  it('works with DD/MM/YYYY format', () => {
    expect(getFinancialYearRange('10/12/2025')).toBe('2025 to 2026')
  })
})
