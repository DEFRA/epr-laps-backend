export function processDocumentsByFinancialYear(documentDetails = []) {
  const formatIsoToShort = (iso) => {
    if (!iso) return undefined
    let parsedDate

    if (iso.includes('/')) {
      const [d, m, y] = iso.split('/').map(Number)
      parsedDate = new Date(y, m - 1, d)
    } else {
      parsedDate = new Date(iso)
    }

    if (isNaN(parsedDate.getTime())) return undefined

    return parsedDate.toLocaleDateString('en-GB', {
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

  const getFinancialYearRange = (dateString) => {
    if (!dateString) return 'Unknown'

    let parsedDate
    if (dateString.includes('/')) {
      const [d, m, y] = dateString.split('/').map(Number)
      parsedDate = new Date(y, m - 1, d)
    } else {
      parsedDate = new Date(dateString)
    }

    if (isNaN(parsedDate.getTime())) return 'Unknown'

    const year = parsedDate.getFullYear()
    const month = parsedDate.getMonth() + 1

    // UK FY runs April–March
    const start = month < 4 ? year - 1 : year
    const end = start + 1

    return `${start} to ${end}`
  }

  return documentDetails.reduce((acc, doc) => {
    const formattedDate = formatIsoToShort(doc.creationDate)
    const financialYearRange = getFinancialYearRange(doc.creationDate)
    const typeLabel =
      documentTypeMap[doc.documentType] || doc.documentType || 'Unknown'
    const documentName = `${typeLabel} ${doc.quarter || ''}`.trim()

    const processedDoc = {
      id: doc.id,
      fileName: doc.fileName,
      financialYear: doc.financialYear,
      creationDate: formattedDate,
      documentName
    }

    acc[financialYearRange] = acc[financialYearRange] || []
    acc[financialYearRange].push(processedDoc)
    return acc
  }, {})
}
