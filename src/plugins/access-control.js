import { config } from '../config.js'

const routePermissionMap = {
  'GET /bank-details/{localAuthority}': 'viewFullBankDetails',
  'PUT /bank-details': 'confirmBankDetails',
  'GET /documents/{localAuthority}': 'listFinanceDocuments',
  'GET /document/{id}': 'accessFinanceDocument',
  'POST /bank-details': 'createBankDetails'
}

const rolesMap = {
  'chief executive officer': 'CEO',
  'head of finance': 'HOF',
  'head of waste': 'HOW',
  'waste officer': 'WO',
  'finance officer': 'FO'
}

const rolePriority = {
  HOF: 1,
  CEO: 2,
  HOW: 3,
  FO: 4,
  WO: 5
}

function extractRoleName(roleEntry) {
  if (!roleEntry || typeof roleEntry !== 'string') return null

  const parts = roleEntry.split(':')
  return parts.length >= 2 ? parts[1].trim() : roleEntry.trim()
}

function normaliseRoles(rawRoles) {
  const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles]

  return roles
    .map(extractRoleName)
    .filter(Boolean)
    .map((r) => rolesMap[r.toLowerCase()])
    .filter(Boolean)
}

function resolveEffectiveRole(mappedRoles) {
  if (mappedRoles.length === 0) return null
  if (mappedRoles.length === 1) return mappedRoles[0]

  return [...mappedRoles].sort((a, b) => rolePriority[a] - rolePriority[b])[0]
}

const accessControl = {
  name: 'access-control',
  register: (server, _options) => {
    server.ext('onPostAuth', (request, h) => {
      const authorizationConfig = config.get('authorization')

      const rawRoles = request.auth.credentials.roles
      const key = `${request.method.toUpperCase()} ${request.route.path}`
      const permissionKey = routePermissionMap[key]

      if (!permissionKey) return h.continue

      const allowedRoles = authorizationConfig[permissionKey]

      const mappedRoles = normaliseRoles(rawRoles)
      const effectiveRole = resolveEffectiveRole(mappedRoles)

      const hasPermission =
        effectiveRole && allowedRoles.includes(effectiveRole)

      request.auth.isAuthorized = hasPermission

      request.logger.info(
        {
          action: permissionKey,
          effectiveRole,
          rolesProvided: mappedRoles,
          outcome: hasPermission ? 'allowed' : 'denied'
        },
        'authorization decision'
      )

      return h.continue
    })
  }
}

export { accessControl }
