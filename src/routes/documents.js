// src/routes/documents.js
import Joi from 'joi'

export const createFileRoutes = ({ getDocumentMetadata }) => [
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
]
