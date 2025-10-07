import { config } from '../config.js'
const authorizationConfig = config.get('authorization')

const accessControl = {
  method: 'GET',
  path: '/permissions/config',
  handler: (_request, h) => h.response(authorizationConfig)
}

export { accessControl }
