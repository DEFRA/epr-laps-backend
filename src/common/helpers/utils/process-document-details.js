export function processDocumentsByFinancialYear(documentDetails = []) {
  const formatIsoToShort = (iso) => {
    if (!iso) return undefined

    let date
    if (iso.includes('/')) {
      const [day, month, year] = iso.split('/').map(Number)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(iso)
    }

    if (isNaN(date.getTime())) return undefined

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const documentTypeMap = {
    grant: 'Grant letter',
    remittance: 'Remittance letter',
    notice_of_assessment: 'Notice of assessment'
  }

  const getFinancialYear = (dateString) => {
    if (!dateString) return 'Unknown'
    let date
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/').map(Number)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(dateString)
    }

    if (isNaN(date)) return 'Unknown'

    const year = date.getFullYear()
    const month = date.getMonth() + 1

    return month >= 4 ? `${year} to ${year + 1}` : `${year - 1} to ${year}`
  }

  const documentsByFinancialYear = {}

  documentDetails.forEach((doc) => {
    const financialYearKey = getFinancialYear(doc.creationDate)
    const documentName =
      documentTypeMap[doc.documentType?.toLowerCase()] + ' ' + doc.quarter

    if (!documentsByFinancialYear[financialYearKey]) {
      documentsByFinancialYear[financialYearKey] = []
    }

    documentsByFinancialYear[financialYearKey].push({
      id: doc.id,
      fileName: doc.fileName,
      financialYear: doc.financialYear,
      creationDate: formatIsoToShort(doc.creationDate),
      documentName
    })
  })

  return documentsByFinancialYear
}
