import HapiAuthJwt2 from 'hapi-auth-jwt2'
import jwkToPem from 'jwk-to-pem'
import Wreck from '@hapi/wreck'
import Boom from '@hapi/boom'
import { config } from './../config.js'

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
export const jwtValidate = (decoded, _request, _h) => {
  const { sub: userId, relationships, roles, currentRelationshipId } = decoded

  if (!relationships || !roles) {
    return { isValid: false }
  }

  // Extract local authority name from relationships array
  let localAuthority = null
  if (currentRelationshipId && Array.isArray(relationships)) {
    const match = relationships.find((r) =>
      r.startsWith(currentRelationshipId + ':')
    )
    if (match) {
      const parts = match.split(':')
      // e.g. "444:1234:Glamshire County Council:0:employee:0"
      localAuthority = parts[2] || null
    }
  }

  // Extract role
  let role = null
  if (Array.isArray(roles) && roles.length > 0) {
    const firstRoleParts = roles[0].split(':')
    role = firstRoleParts[1] || null
  }

  return {
    isValid: true,
    credentials: {
      userId,
      localAuthority,
      role
    }
  }
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
        issuer: cachedDiscovery.issuer,
        ignoreExpiration: true
      }
    })

    server.auth.default('jwt')
  }
}
