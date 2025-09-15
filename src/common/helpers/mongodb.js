// src/common/helpers/mongodb.js

import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks' // real lock manager

// Helper to safely decorate server/request
function safeDecorate(server, type, name, value, options = {}) {
  try {
    server.decorate(type, name, value, options)
  } catch (err) {
    if (!/already defined/.test(err.message)) {
      throw err
    }
  }
}

// Stub for createIndexes if you don't have it
async function createIndexes(db) {
  await db.collection('mongo-locks').createIndex({ id: 1 })
}

export const mongoDb = {
  plugin: {
    name: 'mongodb',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up MongoDb')

      const client = await MongoClient.connect(options.mongoUrl, {
        ...options.mongoOptions
      })

      const databaseName = options.databaseName || 'test'
      const db = client.db(databaseName)
      const locker = new LockManager(db.collection('mongo-locks'))

      await createIndexes(db)

      server.logger.info(`MongoDb connected to ${databaseName}`)

      // Safe decorations
      safeDecorate(server, 'server', 'mongoClient', client)
      safeDecorate(server, 'server', 'db', db)
      safeDecorate(server, 'server', 'locker', locker)
      safeDecorate(server, 'request', 'db', () => db, { apply: true })
      safeDecorate(server, 'request', 'locker', () => locker, { apply: true })

      let closed = false

      server.events.on('stop', async () => {
        if (!closed && client.topology?.isConnected()) {
          try {
            await client.close(true)
          } catch (e) {
            server.logger.error(e, 'failed to close mongo client')
          }
          closed = true
        }
      })
    }
  }
}
