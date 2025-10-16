import fetch from 'node-fetch'
import { config } from '../../config.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import Boom from '@hapi/boom'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  ActionKind,
  Outcome,
  writeAuditLog
} from '../../common/helpers/audit-logging.js'

const getDocument = async (request, h) => {
  const errorMsg = 'Error fetching file:'
  try {
    const { id } = request.params
    const { role } = request.auth.credentials

    if (!request.auth.isAuthorized) {
      request.logger.warn(`User with role ${role} tried to access the document`)
      return Boom.forbidden(`${role} not allowed to access the document`)
    }

    const BASE_URL = 'http://localhost:3002'
    const url = `${BASE_URL}/file/${id}`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'x-api-key': config.get('fssAPIKey') }
    })

    if (!response.ok) {
      const errorText = await response.text()
      request.logger?.error(errorText, errorMsg)
      return Boom.internal(errorText, errorMsg)
    }

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise
    let html = '<html><body>'

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      html += `<div class="pdf-page" id="page-${i}"><p>${pageText}</p></div>`
    }

    html += '</body></html>'

    console.log('THE HTML::', html)

    writeDocumentAccessedAuditLog(request.auth.isAuthorized, request, Outcome.Success)

    return h
      .response(html)
      .type('text/html')
      .code(statusCodes.ok)

  } catch (error) {
    request.logger?.error(error, errorMsg)
    writeDocumentAccessedAuditLog(request.auth.isAuthorized, request, Outcome.Failure)
    throw Boom.internal('Error fetching file')
  }
}

export { getDocument }

export const writeDocumentAccessedAuditLog = (canListDocuments, request, outcome) => {
  writeAuditLog(request, ActionKind.DocumentAccessed, outcome)
}
