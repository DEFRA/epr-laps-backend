import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'
import Joi from 'joi'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health].concat(example))
      // Bank details routes
      server.route([
        {
          method: 'GET',
          path: '/bank-details/{localAuthority}',
          handler: getBankDetails,
          options: {
            validate: {
              params: Joi.object({
                localAuthority: Joi.string().trim().required()
              })
            }
          }
        },
        {
          method: 'PUT',
          path: '/bank-details/{localAuthority}',
          handler: putBankDetails,
          options: {
            validate: {
              params: Joi.object({
                localAuthority: Joi.string().trim().required()
              }),
              payload: Joi.object({
                accountName: Joi.string().trim().max(100).required(),
                sortCode: Joi.string()
                  .pattern(/^\d{2}-\d{2}-\d{2}$/)
                  .required(),
                accountNumber: Joi.string()
                  .pattern(/^\d{8}$/)
                  .required(),
                confirmed: Joi.boolean().valid(true).required()
              }).options({ stripUnknown: true })
            }
          }
        }
      ])
    }
  }
}

export { router }
