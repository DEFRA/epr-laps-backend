import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { bankDetailsRoutes } from '../routes/bankDetails.js'
import { fileRoutes } from '../routes/documents.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health, ...example, ...bankDetailsRoutes, ...fileRoutes])
    }
  }
}
