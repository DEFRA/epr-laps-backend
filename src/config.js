import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

import { convictValidateMongoUri } from './common/helpers/convict/validate-mongo-uri.js'

convict.addFormat(convictValidateMongoUri)
convict.addFormats(convictFormatWithValidator)

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'epr-laps-backend'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'debug',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  mongo: {
    mongoUrl: {
      doc: 'URI for mongodb',
      format: String,
      default: 'mongodb://127.0.0.1:27017/',
      env: 'MONGO_URI'
    },
    databaseName: {
      doc: 'database for mongodb',
      format: String,
      default: 'epr-laps-backend',
      env: 'MONGO_DATABASE'
    },
    mongoOptions: {
      retryWrites: {
        doc: 'enable mongo write retries',
        format: Boolean,
        default: false
      },
      readPreference: {
        doc: 'mongo read preference',
        format: [
          'primary',
          'primaryPreferred',
          'secondary',
          'secondaryPreferred',
          'nearest'
        ],
        default: 'secondary'
      }
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  auth: {
    discoveryUrl: {
      doc: 'URI for fetching Metadata document for the signup signin policy',
      format: String,
      default:
        'http://localhost:3200/cdp-defra-id-stub/.well-known/openid-configuration',
      env: 'DEFRA_ID_DISCOVERY_URL'
    },
    issuer: {
      doc: 'The expected issuer for JWT validation',
      format: String,
      default: 'http://localhost:3200/cdp-defra-id-stub',
      env: 'DEFRA_ID_ISSUER'
    }
  },
  fssApiUrl: {
    doc: 'FSS URL to get the bank details',
    format: String,
    default: 'http://localhost:3003/api',
    env: 'FSS_API_URL'
  },
  fssAPIKey: {
    doc: 'API key to be passed to FSS',
    format: String,
    default: 'some-api-key',
    env: 'FSS_API_KEY'
  },
  fssEncryptionKey: {
    doc: 'Base64-encoded encryption key for FSS bank details',
    format: String,
    default: '',
    env: 'FSS_API_ENCRYPTION_KEY'
  },
  currentFiscalYear: {
    doc: 'Fiscal year range to pass to frontend',
    format: String,
    default: '2025 to 2026',
    env: 'SINGLE_PAYMENT_DOC_WARNING_YEAR'
  },
  authorization: {
    viewFullBankDetails: {
      doc: 'Permission roles allowed to view full bank details',
      format: Array,
      env: 'VIEW_FULL_BANK_DETAILS',
      default: ['CEO']
    },
    confirmBankDetails: {
      doc: 'Permission roles allowed to confirm bank details',
      format: Array,
      env: 'CONFIRM_BANK_DETAILS',
      default: ['CEO', 'WO']
    },
    createBankDetails: {
      doc: 'Permission roles allowed to create bank details',
      format: Array,
      env: 'CREATE_BANK_DETAILS',
      default: ['CEO']
    },
    listFinanceDocuments: {
      doc: 'API key to be passed to list finance documents',
      format: Array,
      env: 'LIST_FINANCE_DOCUMENTS',
      default: ['CEO']
    },
    accessFinanceDocument: {
      doc: 'API key to be passed to FSS',
      format: Array,
      env: 'ACCESS_FINANCE_DOCUMENT',
      default: ['CEO']
    }
  }
})

config.validate({ allowed: 'strict' })

export { config }
