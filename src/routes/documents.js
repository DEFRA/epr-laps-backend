// src/routes/documents.js
import Joi from 'joi'
import { getDocumentMetadata } from '../handler/documents/getMetadata.js'
import { getDocument } from '../handler/documents/getDocument.js'

export const fileRoutes = [
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
  },
  {
    method: 'GET',
    path: '/file/{id}',
    handler: getDocument,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().trim().required()
        })
      },
      response: {
        failAction: 'log'
      }
    }
  }
]
