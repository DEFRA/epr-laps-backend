import Joi from 'joi'
import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'

export const bankDetailsRoutes = [
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
]
