import { describe, it, expect } from 'vitest'
import { processDocumentsByFinancialYear } from './process-document-details.js'

describe('processDocumentsByFinancialYear', () => {
  it('returns empty object when no documents provided', () => {
    expect(processDocumentsByFinancialYear()).toEqual({})
    expect(processDocumentsByFinancialYear([])).toEqual({})
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
    expect(result['2025 to 2026'][0].creationDate).toMatch(/15 May 2025/)
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
    expect(result['2024 to 2025'][0].creationDate).toMatch(/15 Mar 2025/)
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
    expect(result['2025 to 2026'][0].documentName).toBe('undefined Q3')
  })

  it('handles missing creationDate', () => {
    const docs = [
      { id: 4, fileName: 'file4.pdf', documentType: 'grant', quarter: 'Q4' }
    ]
    const result = processDocumentsByFinancialYear(docs)
    expect(result['Unknown'][0].creationDate).toBeUndefined()
    expect(result['Unknown'][0].documentName).toBe('Grant letter Q4')
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
    expect(result['Unknown'][0].creationDate).toBeUndefined()
    expect(result['Unknown'][0].documentName).toBe('Notice of assessment Q1')
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
    expect(Object.keys(result)).toHaveLength(2)
    expect(result['2025 to 2026']).toHaveLength(1)
    expect(result['2024 to 2025']).toHaveLength(1)
  })
})
