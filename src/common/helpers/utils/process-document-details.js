// Format ISO or DD/MM/YYYY date to "d MMM yyyy"
const FY_START_MONTH = 4
const FY_START_DAY = 6

function parseDateString(dateString) {
  if (!dateString) {
    return undefined
  }

  let parsedDate
  if (dateString.includes('/')) {
    const [d, m, y] = dateString.split('/').map(Number)
    parsedDate = new Date(y, m - 1, d)
  } else {
    parsedDate = new Date(dateString)
  }

  return isNaN(parsedDate.getTime()) ? undefined : parsedDate
}

function formatIsoToShort(iso) {
  const parsedDate = parseDateString(iso)
  if (!parsedDate) {
    return undefined
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Get financial year range from a date string (FY: 6 April - 5 April)
export function getFinancialYearRange(dateString) {
  const parsedDate = parseDateString(dateString)
  if (!parsedDate) {
    return 'Unknown'
  }

  const year = parsedDate.getFullYear()
  const month = parsedDate.getMonth() + 1
  const day = parsedDate.getDate()

  const start =
    month > FY_START_MONTH || (month === FY_START_MONTH && day >= FY_START_DAY)
      ? year
      : year - 1
  const end = start + 1

  return `${start} to ${end}`
}

// Get current financial year (FY: 6 April - 5 April)
function getCurrentFiscalYear() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const day = today.getDate()

  const start =
    month > FY_START_MONTH || (month === FY_START_MONTH && day >= FY_START_DAY)
      ? year
      : year - 1
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
  const RECENT_DOC_DAYS_LIMIT = 30
  const today = new Date()

  const groupedDocuments = documentDetails.reduce((acc, doc) => {
    const parsedDate = parseDateString(doc.creationDate)
    const formattedDate = formatIsoToShort(doc.creationDate)
    const financialYearRange = getFinancialYearRange(doc.creationDate)
    const documentName = getDocumentName(doc)

    // Check if document is within the last 30 days
    const diffDays = parsedDate
      ? (today - parsedDate) / (1000 * 60 * 60 * 24)
      : Infinity
    const isLatest = diffDays <= RECENT_DOC_DAYS_LIMIT

    const processedDoc = {
      id: doc.id,
      fileName: doc.fileName,
      financialYear: doc.financialYear,
      creationDate: formattedDate,
      documentName,
      isLatest
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
