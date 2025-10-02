import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'
import { getDocumentMetadata } from '../handler/documents/getMetadata.js'
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
                sortCode: Joi.string().required(),
                accountNumber: Joi.string().required(),
                confirmed: Joi.boolean().valid(true).required()
              }).options({ stripUnknown: true })
            }
          }
        }
      ])
      // Document metadata route
      server.route([
        {
          method: 'GET',
          path: '/file/metadata/{localAuthority}',
          handler: getDocumentMetadata,
          options: {
            validate: {
              params: Joi.object({
                localAuthority: Joi.string().trim().required()
              })
            },
            response: {
              schema: Joi.array().items(
                Joi.object({
                  id: Joi.string().required(),
                  fileName: Joi.string().required(),
                  localAuthority: Joi.string().required(),
                  financialYear: Joi.string().required(),
                  quarter: Joi.string().required(),
                  creationDate: Joi.string().required(),
                  documentType: Joi.string().required(),
                  language: Joi.string().required()
                })
              )
            }
          }
        }
      ])
    }
  }
}

export { router }
