import { Db, MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

describe('#mongoDb', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('../../server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    // Only stop once
    if (server) {
      await server.stop({ timeout: 0 })
    }
  })

  test('Server should have expected MongoDb decorators', () => {
    expect(server.db).toBeInstanceOf(Db)
    expect(server.mongoClient).toBeInstanceOf(MongoClient)
    expect(server.locker).toBeInstanceOf(LockManager)
  })

  test('MongoDb should have expected database name', () => {
    expect(server.db.databaseName).toBe('epr-laps-backend')
  })

  test('MongoDb should have expected namespace', () => {
    expect(server.db.namespace).toBe('epr-laps-backend')
  })

  test('Should close Mongo client on server stop', async () => {
    const closeSpy = vi.spyOn(server.mongoClient, 'close')
    await server.stop({ timeout: 0 })
    expect(closeSpy).toHaveBeenCalledWith(true)

    // Re-initialize server for other tests if needed
    const { createServer } = await import('../../server.js')
    server = await createServer()
    await server.initialize()
  })
})
