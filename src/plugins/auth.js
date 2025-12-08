import HapiAuthJwt2 from 'hapi-auth-jwt2'
import jwkToPem from 'jwk-to-pem'
import Wreck from '@hapi/wreck'
import Boom from '@hapi/boom'
import { config } from './../config.js'

const ORG_NAME_INDEX = 2 // index of organisation name in the relationship string
const RELATIONSHIP_PARTS_MIN = 3 // minimum number of parts in a relationship string

let cachedDiscovery = null

export const __setCachedDiscovery = (value) => {
  cachedDiscovery = value
}

export const getKey = async (_header) => {
  if (!cachedDiscovery?.jwks_uri) {
    throw Boom.internal('No jwks_uri found in discovery document')
  }

  const jwksUri = cachedDiscovery.jwks_uri
  try {
    const { payload } = await Wreck.get(jwksUri, { json: true })

    const keys = payload?.keys || []

    if (!keys.length) {
      throw Boom.unauthorized('No JWKS keys found')
    }

    const pem = jwkToPem(keys[0])

    return { key: pem }
  } catch (err) {
    throw Boom.internal(`Cannot verify auth token: ${err.message}`)
  }
}

// Custom JWT validation
export const jwtValidate = (decoded, request, _h) => {
  const { sub: userId, roles } = decoded
  request.logger.debug(`DecodedJWT is ${JSON.stringify(decoded)}`)
  const currentOrganisation = extractCurrentLocalAuthority(decoded)

  request.logger.debug(`currentORG is ${currentOrganisation}`)
  if (!roles) {
    return { isValid: false }
  }

  // Extract role
  let role = null
  if (Array.isArray(roles) && roles.length > 0) {
    const firstRoleParts = roles[0].split(':')
    role = firstRoleParts[1] || null
  }

  request.logger.debug(`Roles is: ${roles}`)

  return {
    isValid: true,
    credentials: {
      userId,
      role,
      currentOrganisation,
      ...decoded
    }
  }
}

export const extractCurrentLocalAuthority = (token) => {
  let organisationName = ''
  if (Array.isArray(token.relationships) && token.currentRelationshipId) {
    const matched = token.relationships.find((rel) => {
      const parts = rel.split(':')
      return parts[0] === token.currentRelationshipId
    })

    if (matched) {
      const parts = matched.split(':')
      if (parts.length >= RELATIONSHIP_PARTS_MIN) {
        organisationName = parts[ORG_NAME_INDEX]
      }
    }
  }
  return organisationName
}

export const authPlugin = {
  name: 'auth',
  register: async (server) => {
    await server.register(HapiAuthJwt2)

    // Fetch and cache discovery ONCE
    const discoveryUrl = config.get('auth.discoveryUrl')
    try {
      const discoveryRes = await Wreck.get(discoveryUrl, { json: true })
      cachedDiscovery = discoveryRes.payload
    } catch (e) {
      throw Boom.internal('Cannot fetch OIDC discovery document', e)
    }

    server.auth.strategy('jwt', 'jwt', {
      key: getKey,
      validate: jwtValidate,
      verifyOptions: {
        algorithms: ['RS256'],
        issuer: config.get('auth.issuer')
      }
    })

    server.auth.default('jwt')
  }
}
