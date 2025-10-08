import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { bankDetailsRoutes } from '../routes/bankDetails.js'
import { fileRoutes } from '../routes/documents.js'
import { accessControl } from '../routes/access-control.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      const allRoutes = [health]
        .concat(example)
        .concat(bankDetailsRoutes)
        .concat(fileRoutes)
        .concat(accessControl)

      server.route(allRoutes)
    }
  }
}

export { router }
