import HapiAuthJwt2 from 'hapi-auth-jwt2'
import jwksClient from 'jwks-rsa'
import fetch from 'node-fetch'
import { config } from './../config.js'

let client

// Load JWKS URI dynamically from discovery endpoint
async function initJwksClient() {
  console.log('Config object:', config)
  console.log('auth.discoveryUrl value:', config.get('auth.discoveryUrl'))
  const discoveryUrl = config.get('auth.discoveryUrl')

  const response = await fetch(discoveryUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenID config: ${response.statusText}`)
  }

  const discovery = await response.json()
  if (!discovery.jwks_uri) {
    throw new Error('No jwks_uri found in discovery document')
  }

  client = jwksClient({
    jwksUri: discovery.jwks_uri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000 // 10 minutes
  })
}

// resolve signing key dynamically
export const getKey = (header, callback) => {
  return client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err)
    }
    const signingKey = key.publicKey || key.rsaPublicKey
    return callback(null, signingKey)
  })
}

// Custom JWT validation
export const jwtValidate = (decoded, _request, _h) => {
  const { userId, localAuthority, role } = decoded

  if (!localAuthority || !role) {
    return { isValid: false }
  }

  return {
    isValid: true,
    credentials: { userId, localAuthority, role }
  }
}

export const authPlugin = {
  name: 'auth',
  register: async (server) => {
    await initJwksClient()
    await server.register(HapiAuthJwt2)

    server.auth.strategy('jwt', 'jwt', {
      key: getKey,
      validate: jwtValidate,
      verifyOptions: {
        aud: false,
        iss: false,
        sub: false,
        nbf: true,
        exp: true
      }
    })

    server.auth.default('jwt')
  }
}
