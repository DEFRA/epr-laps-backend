import { processDocumentDetails } from './process-document-details.js'

describe('processDocumentDetails', () => {
  const baseDoc = {
    id: '12345',
    fileName: 'report.pdf',
    localAuthority: 'Newcastle City Council',
    financialYear: '2024',
    quarter: 'Q2',
    creationDate: '2025-10-08T12:06:34.439Z',
    language: 'EN'
  }

  it('should format the date as "8 Oct 2025"', () => {
    const result = processDocumentDetails([
      { ...baseDoc, documentType: 'grant' }
    ])
    expect(result[0].formattedDate).toBe('8 Oct 2025')
  })

  it('should map documentType "grant" to "Grant letter"', () => {
    const result = processDocumentDetails([
      { ...baseDoc, documentType: 'grant' }
    ])
    expect(result[0].documentName).toBe('Grant letter Q2')
  })

  it('should map documentType "remittance" to "Remittance letter"', () => {
    const result = processDocumentDetails([
      { ...baseDoc, documentType: 'remittance' }
    ])
    expect(result[0].documentName).toBe('Remittance letter Q2')
  })

  it('should map documentType "assessment" to "Notice of assessment"', () => {
    const result = processDocumentDetails([
      { ...baseDoc, documentType: 'notice_of_assessment' }
    ])
    expect(result[0].documentName).toBe('Notice of assessment Q2')
  })

  it('should handle unknown documentType gracefully (returns "undefined Q2")', () => {
    const result = processDocumentDetails([
      { ...baseDoc, documentType: 'other' }
    ])
    expect(result[0].documentName).toBe('undefined Q2')
  })

  it('should handle missing creationDate (formattedDate = undefined)', () => {
    const result = processDocumentDetails([
      { ...baseDoc, creationDate: undefined }
    ])
    expect(result[0].formattedDate).toBeUndefined()
  })

  it('should handle invalid creationDate (formattedDate = undefined)', () => {
    const result = processDocumentDetails([
      { ...baseDoc, creationDate: 'not-a-date' }
    ])
    expect(result[0].formattedDate).toBeUndefined()
  })

  it('should return an empty array when input is empty', () => {
    const result = processDocumentDetails([])
    expect(result).toEqual([])
  })

  it('should not mutate the original array', () => {
    const docs = [{ ...baseDoc, documentType: 'grant' }]
    const copy = JSON.parse(JSON.stringify(docs))
    processDocumentDetails(docs)
    expect(docs).toEqual(copy)
  })
})
