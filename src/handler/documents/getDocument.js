import fetch from 'node-fetch'
import { config } from '../../config.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import Boom from '@hapi/boom'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
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

    // Start HTML with GOV.UK layout wrappers and stylesheet
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Document Preview</title>
        <link href="/public/stylesheets/application.css" rel="stylesheet">
        <style>
          .pdf-page { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #ccc; }
        </style>
      </head>
      <body class="govuk-template__body">
        <div class="govuk-width-container">
          <main class="govuk-main-wrapper" id="main-content" role="main">
    `

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const textContent = await page.getTextContent()
      const lines = textContent.items
        .map((item) => item.str.trim())
        .filter(Boolean)

      let pageHtml = ''
      let inList = false
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx]
        // Bullet point handling: treat "•" as the start of a list item and the next line as the content
        if (line === '•') {
          if (!inList) {
            pageHtml += '<ul class="govuk-list govuk-list--bullet">'
            inList = true
          }
          const nextLine = lines[idx + 1] || ''
          pageHtml += `<li>${nextLine}</li>`
          idx++ // skip the next line, as it's part of this list item
        } else {
          if (inList) {
            pageHtml += '</ul>'
            inList = false
          }
          if (line.length > 0 && line === line.toUpperCase()) {
            pageHtml += `<h2 class="govuk-heading-m">${line}</h2>`
          } else {
            pageHtml += `<p class="govuk-body">${line}</p>`
          }
        }
      }
      if (inList) {
        pageHtml += '</ul>'
        inList = false
      }
      html += `<div class="pdf-page govuk-section" id="page-${i}">${pageHtml}</div>`
    }

    html += `
          </main>
        </div>
      </body>
      </html>
    `

    writeDocumentAccessedAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Success
    )

    return h.response(html).type('text/html').code(statusCodes.ok)
  } catch (error) {
    request.logger?.error(error, errorMsg)
    writeDocumentAccessedAuditLog(
      request.auth.isAuthorized,
      request,
      Outcome.Failure
    )
    throw Boom.internal('Error fetching file')
  }
}

export { getDocument }

export const writeDocumentAccessedAuditLog = (
  canListDocuments,
  request,
  outcome
) => {
  writeAuditLog(request, ActionKind.DocumentAccessed, outcome)
}
