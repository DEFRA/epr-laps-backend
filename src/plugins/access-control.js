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

function normaliseRoles(rawRoles) {
  const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles]

  return roles
    .map((r) => rolesMap[r]) // map "Head of Finance" → "HOF"
    .filter(Boolean)
}

function resolveEffectiveRole(mappedRoles) {
  if (mappedRoles.length === 0) return null
  if (mappedRoles.length === 1) return mappedRoles[0]

  return mappedRoles.sort((a, b) => rolePriority[a] - rolePriority[b])[0]
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

      const rawRoles = ['Head of Finance', 'Chief Executive Officer']
      console.log('Raw roles from token are::', rawRoles)
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

      request.auth.isAuthorized = hasPermission

      // audit + debug use ONLY the effective role
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
