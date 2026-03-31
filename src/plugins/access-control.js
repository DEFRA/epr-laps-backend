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

// Extracts the role name from a role entry string, which may be in the format "c53f8b72-1ad4-4e39-9a2f-92d06b4f3e8c:Head of Finance:2"
function extractRoleName(roleEntry) {
  if (!roleEntry || typeof roleEntry !== 'string') {
    return null
  }

  const parts = roleEntry.split(':')
  return parts.length >= 2 ? parts[1].trim() : roleEntry.trim()
}

// Extracts and normalises role names from raw role entries, mapping them to known role keys and filtering out any unrecognised roles
export function normaliseRoles(rawRoles) {
  const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles]

  return roles
    .map(extractRoleName)
    .filter(Boolean)
    .map((r) => rolesMap[r])
    .filter(Boolean)
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

      const rawRoles = request.auth.credentials.roles
      const key = `${request.method.toUpperCase()} ${request.route.path}`
      const permissionKey = routePermissionMap[key]

      if (!permissionKey) {
        return h.continue
      }

      const allowedRoles = authorizationConfig[permissionKey]

      const mappedRoles = normaliseRoles(rawRoles)
      request.logger.info({ mappedRoles }, 'roles mapped')

      const effectiveRole = resolveEffectiveRole(mappedRoles)
      request.logger.info({ effectiveRole }, 'Resolved effective role')

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
