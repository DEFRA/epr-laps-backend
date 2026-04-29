import { config } from '../config.js'

const routePermissionMap = {
  'GET /bank-details/{localAuthority}': 'viewFullBankDetails',
  'PUT /bank-details': 'confirmBankDetails',
  'GET /documents/{localAuthority}': 'listFinanceDocuments',
  'GET /document/{id}': 'accessFinanceDocument',
  'POST /bank-details': 'createBankDetails'
}

const rolesMap = {
  'Chief Executive Officer': 'CEO',
  'Head of Finance': 'HOF',
  'Head of Waste': 'HOW',
  'Waste Officer': 'WO',
  'Finance Officer': 'FO'
}

const rolePriority = {
  HOF: 1,
  CEO: 2,
  HOW: 3,
  FO: 4,
  WO: 5
}

/**
 * Normalises a comma-separated roles string by:
 * - splitting it into individual role names
 * - trimming whitespace
 * - mapping known role names to internal role keys
 * - filtering out any unrecognised roles
 * - removing duplicates
 *
 * @param {string} rawRoles - Comma-separated role names (e.g. "Head of Finance, Finance Officer")
 * @returns {string[]} Array of normalised role keys (e.g. ["HOF", "FO"])
 */
export function normaliseRoles(rawRoles) {
  const roles = rawRoles ? rawRoles.split(',').map((r) => r.trim()) : []

  return [...new Set(roles.map((r) => rolesMap[r]).filter(Boolean))]
}

// Resolves the effective role based on the provided mapped roles and their defined priority
export function resolveEffectiveRole(mappedRoles) {
  if (mappedRoles.length === 0) {
    return null
  }
  if (mappedRoles.length === 1) {
    return mappedRoles[0]
  }

  return [...mappedRoles].sort((a, b) => rolePriority[a] - rolePriority[b])[0]
}

const accessControl = {
  name: 'access-control',
  register: (server, _options) => {
    server.ext('onRequest', (request, h) => {
      const ignoredRoutes = ['/health']
      if (ignoredRoutes.includes(request.path)) {
        return h.continue
      }
      return h.continue
    })

    server.ext('onPostAuth', (request, h) => {
      const authorizationConfig = config.get('authorization')

      const rawRoles = request.auth.credentials.rawRoles

      const key = `${request.method.toUpperCase()} ${request.route.path}`
      const permissionKey = routePermissionMap[key]

      if (!permissionKey) {
        return h.continue
      }

      const allowedRoles = authorizationConfig[permissionKey]

      const mappedRoles = normaliseRoles(rawRoles)

      const effectiveRole = resolveEffectiveRole(mappedRoles)

      const hasPermission =
        effectiveRole && allowedRoles.includes(effectiveRole)

      request.logger.debug(
        `Access control check for ${effectiveRole} on ${permissionKey}:  ${key} permission granted: ${hasPermission}`
      )
      request.auth.isAuthorized = hasPermission

      request.logger.info(
        `authorization decision | action=${permissionKey} | effectiveRole=${effectiveRole} | rolesProvided=${mappedRoles.join(',')} | outcome=${hasPermission ? 'allowed' : 'denied'}`
      )

      return h.continue
    })
  }
}

export { accessControl }
