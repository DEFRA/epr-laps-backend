// src/routes/documents.js
import Joi from 'joi'
import { getDocumentMetadata } from '../handler/documents/getMetadata.js'
import { getDocument } from '../handler/documents/getDocument.js'

export const fileRoutes = [
  {
    method: 'GET',
    path: '/documents/{localAuthority}',
    handler: getDocumentMetadata,
    options: {
      validate: {
        params: Joi.object({
          localAuthority: Joi.string().trim().required()
        })
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
      }
    }
  }
]
