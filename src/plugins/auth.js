// keep existing imports...
import HapiAuthJwt2 from 'hapi-auth-jwt2'
import jwksClient from 'jwks-rsa'
import { config } from './../config.js'

// Setup JWKS client
const client = jwksClient({
  jwksUri: config.get('auth.jwksUri'),
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
})

// Helper: resolve signing key dynamically
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
  version: '1.0.0',
  register: async (server) => {
    await server.register(HapiAuthJwt2)

    server.auth.strategy('jwt', 'jwt', {
      key: getKey,
      validate: jwtValidate,
      verifyOptions: {
        aud: false,
        iss: false,
        sub: false,
        nbf: true,
        exp: true,
        maxAge: '4h'
      }
    })

    server.auth.default('jwt')
  }
}
