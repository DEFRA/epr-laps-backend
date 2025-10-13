// Format ISO or DD/MM/YYYY date to "d MMM yyyy"
function formatIsoToShort(iso) {
  if (!iso) return undefined

  let parsedDate
  if (iso.includes('/')) {
    const [d, m, y] = iso.split('/').map(Number)
    parsedDate = new Date(y, m - 1, d)
  } else {
    parsedDate = new Date(iso)
  }

  if (isNaN(parsedDate.getTime())) {
    return undefined
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Get financial year range from a date string (FY: 6 April - 5 April)
function getFinancialYearRange(dateString) {
  if (!dateString) {
    return 'Unknown'
  }

  let parsedDate
  if (dateString.includes('/')) {
    const [d, m, y] = dateString.split('/').map(Number)
    parsedDate = new Date(y, m - 1, d)
  } else {
    parsedDate = new Date(dateString)
  }

  if (isNaN(parsedDate.getTime())) {
    return 'Unknown'
  }

  const year = parsedDate.getFullYear()
  const month = parsedDate.getMonth() + 1
  const day = parsedDate.getDate()

  // FY starts on 6 April
  const start = month > 4 || (month === 4 && day >= 6) ? year : year - 1
  const end = start + 1

  return `${start} to ${end}`
}

// Get current financial year (FY: 6 April - 5 April)
function getCurrentFiscalYear() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const day = today.getDate()

  const start = month > 4 || (month === 4 && day >= 6) ? year : year - 1
  const end = start + 1

  return `${start} to ${end}`
}

// Map document type to readable label
function getDocumentName(doc) {
  const documentTypeMap = {
    grant: 'Grant letter',
    remittance: 'Remittance letter',
    notice_of_assessment: 'Notice of assessment'
  }
  const typeLabel =
    documentTypeMap[doc.documentType] || doc.documentType || 'Unknown'
  return `${typeLabel} ${doc.quarter || ''}`.trim()
}

// Process and group documents by financial year
export function processDocumentsByFinancialYear(documentDetails = []) {
  const currentFiscalYear = getCurrentFiscalYear()

  const groupedDocuments = documentDetails.reduce((acc, doc) => {
    const formattedDate = formatIsoToShort(doc.creationDate)
    const financialYearRange = getFinancialYearRange(doc.creationDate)
    const documentName = getDocumentName(doc)

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

  return {
    ...groupedDocuments,
    currentFiscalYear
  }
}
