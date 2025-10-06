import { config } from '../config.js'

const routePermissionMap = {
  'GET /bank-details/{localAuthority}': 'viewFullBankDetails',
  'PUT /bank-details/{localAuthority}': 'confirmBankDetails'
}

const rolesMap = {
  'Chief Executive Officer': 'CEO',
  'Head of Finance': 'HOF',
  'Head of Waste': 'HOW',
  'Waste Officer': 'WO',
  'Finance Officer': 'FO'
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
      const rawRole = request.auth.credentials.role
      const userRole = rolesMap[rawRole]
      const key = `${request.method.toUpperCase()} ${request.route.path}`
      const permissionKey = routePermissionMap[key]

      const allowedRoles = authorizationConfig[permissionKey]

      if (!permissionKey) {
        return h.continue
      }
      const hasPermission = allowedRoles.includes(userRole)
      request.logger.debug(
        `Access control check for ${rawRole} on ${permissionKey}:  ${key} permission granted: ${hasPermission}`
      )
      request.auth.isAuthorized = hasPermission
      return h.continue
    })
  }
}

export { accessControl }
