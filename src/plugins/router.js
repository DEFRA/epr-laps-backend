import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { createBankDetailsRoutes } from '../routes/bankDetails.js'
import { createFileRoutes } from '../routes/documents.js'
import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'
import { getDocumentMetadata } from '../handler/documents/getMetadata.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      const bankDetailsRoutes = createBankDetailsRoutes({
        getBankDetails,
        putBankDetails
      })
      const fileRoutes = createFileRoutes({ getDocumentMetadata })

      server.route([health, ...example, ...bankDetailsRoutes, ...fileRoutes])
    }
  }
}
