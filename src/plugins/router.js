import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { bankDetailsRoutes } from '../routes/bankDetails.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health, bankDetailsRoutes].concat(example))
    }
  }
}

export { router }
