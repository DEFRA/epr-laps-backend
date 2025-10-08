/**
 * Formats Date and Document name to show on UI
 * @param {Array} documentDetails
 * @returns {Array} formattedDocDetails
 */

export function processDocumentDetails(documentDetails = []) {
  const formatIsoToShort = (iso) => {
    if (!iso) {
      return undefined
    }
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) {
      return undefined
    }
    return d.toLocaleDateString('en-GB', {
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

  const formattedDocDetails = documentDetails.map((doc) => {
    const formattedDate = formatIsoToShort(doc.creationDate)
    const documentName =
      documentTypeMap[doc.documentType?.toLowerCase()] + ' ' + doc.quarter

    return {
      ...doc,
      formattedDate,
      documentName
    }
  })

  return formattedDocDetails
}
