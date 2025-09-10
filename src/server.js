import Hapi from '@hapi/hapi'
import Jwt from '@hapi/jwt'
import { secureContext } from '@defra/hapi-secure-context'

import { config } from './config.js'
import { router } from './plugins/router.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { mongoDb } from './common/helpers/mongodb.js'
import { failAction } from './common/helpers/fail-action.js'
import { pulse } from './common/helpers/pulse.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'

async function createServer() {
  setupProxy()
  const server = Hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  // Register JWT plugin
  await server.register(Jwt)

  // Define JWT auth strategy
  server.auth.strategy('jwt', 'jwt', {
    keys: config.get('auth.jwtSecret'), // store secret in your config/env
    verify: {
      aud: false,
      iss: false,
      sub: false,
      nbf: true,
      exp: true,
      maxAgeSec: 14400
    },
    validate: (artifacts, request, h) => {
      const payload = artifacts.decoded.payload

      // Expect JWT to contain localAuthority and role
      const localAuthority = payload.localAuthority
      const role = payload.role

      if (!localAuthority || !role) {
        return { isValid: false }
      }

      return {
        isValid: true,
        credentials: {
          userId: payload.userId,
          localAuthority,
          role
        }
      }
    }
  })

  // Make JWT the default auth strategy
  server.auth.default('jwt')

  // Hapi Plugins:
  // requestLogger  - automatically logs incoming requests
  // requestTracing - trace header logging and propagation
  // secureContext  - loads CA certificates from environment config
  // pulse          - provides shutdown handlers
  // mongoDb        - sets up mongo connection pool and attaches to `server` and `request` objects
  // router         - routes used in the app
  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    {
      plugin: mongoDb,
      options: config.get('mongo')
    },
    router
  ])

  return server
}

export { createServer }
