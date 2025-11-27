import Joi from 'joi'
import { getBankDetails } from '../handler/bankDetails/get.js'
import { putBankDetails } from '../handler/bankDetails/put.js'
import { postBankDetails } from '../handler/bankDetails/post.js'

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
          confirmed: Joi.boolean().valid(true).required(),
          requesterEmail: Joi.string().trim().max(100).required()
        }).options({ stripUnknown: true })
      }
    }
  },
  {
    method: 'POST',
    path: '/bank-details',
    handler: postBankDetails,
    options: {
      validate: {
        payload: Joi.object({
          localAuthority: Joi.string().trim().required(),
          accountName: Joi.string().trim().max(100).required(),
          sortCode: Joi.string().custom((value) => {
            return value.replaceAll('-', '').replaceAll(' ', '')
          }),
          accountNumber: Joi.string().required(),
          requesterEmail: Joi.string().trim().max(100).required()
        }).options({ stripUnknown: true })
      }
    }
  }
]
