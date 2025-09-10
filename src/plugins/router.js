import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { bankDetailsGet, bankDetailsPut } from '../routes/bankDetails.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health, bankDetailsGet, bankDetailsPut].concat(example))
    }
  }
}

export { router }
