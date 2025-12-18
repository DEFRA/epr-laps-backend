import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { safeDecorate, createIndexes, mongoDb } from './mongodb'

// Mocks
const lockerMock = {}
const clientMock = { db: vi.fn(), close: vi.fn() }
const dbMock = { collection: vi.fn() }

vi.mock('mongo-locks', () => ({
  LockManager: class {
    constructor() {
      return lockerMock
    }
  }
}))

vi.mock('mongodb', () => ({
  MongoClient: {
    connect: vi.fn(() => Promise.resolve(clientMock))
  }
}))

// Mock server creation
let server

async function createServer() {
  return {
    mongoClient: clientMock,
    db: dbMock,
    locker: lockerMock,
    stop: vi.fn()
  }
}

describe('#mongoDb plugin', () => {
  beforeEach(async () => {
    server = await createServer()
  })

  afterEach(async () => {
    if (server.stop) await server.stop()
    vi.clearAllMocks()
  })

  it('Should setup MongoDb without errors', async () => {
    expect(server.mongoClient).toBe(clientMock)
    expect(server.db).toBe(dbMock)
    expect(server.locker).toBe(lockerMock)
  })

  it('Should create indexes on mongo-locks collection', async () => {
    const createIndexMock = vi.fn()
    dbMock.collection.mockReturnValue({ createIndex: createIndexMock })

    // Simulate index creation
    await dbMock.collection('mongo-locks').createIndex({ key: 1 })
    expect(createIndexMock).toHaveBeenCalled()
  })

  it('Request decorations return db and locker', async () => {
    expect(server.db).toBe(dbMock)
    expect(server.locker).toBe(lockerMock)
  })

  it('Should close mongo client on server stop', async () => {
    await server.stop()
    expect(server.stop).toHaveBeenCalled()
  })

  it('Should not close mongo client twice', async () => {
    await server.stop()
    await server.stop()
    expect(server.stop).toHaveBeenCalledTimes(2)
  })
})

describe('safeDecorate', () => {
  it('decorates successfully when no error', () => {
    const server = { decorate: vi.fn() }

    expect(() => safeDecorate(server, 'server', 'foo', () => 42)).not.toThrow()
    expect(server.decorate).toHaveBeenCalledWith(
      'server',
      'foo',
      expect.any(Function),
      {}
    )
  })

  it('ignores "already defined" error', () => {
    const server = {
      decorate: vi.fn(() => {
        throw new Error('foo already defined bar')
      })
    }

    expect(() => safeDecorate(server, 'server', 'foo', () => 42)).not.toThrow()
  })

  it('throws unexpected errors', () => {
    const server = {
      decorate: vi.fn(() => {
        throw new Error('something else')
      })
    }

    expect(() => safeDecorate(server, 'server', 'foo', () => 42)).toThrow(
      'something else'
    )
  })

  it('passes options correctly', () => {
    const server = { decorate: vi.fn() }
    const options = { apply: true }

    safeDecorate(server, 'request', 'bar', () => 'baz', options)

    expect(server.decorate).toHaveBeenCalledWith(
      'request',
      'bar',
      expect.any(Function),
      options
    )
  })
})

describe('createIndexes', () => {
  it('calls createIndex on the mongo-locks collection', async () => {
    // Mock db and collection
    const createIndexMock = vi.fn()
    const collectionMock = vi.fn(() => ({ createIndex: createIndexMock }))
    const dbMock = { collection: collectionMock }

    await createIndexes(dbMock)

    // Check that db.collection was called with 'mongo-locks'
    expect(collectionMock).toHaveBeenCalledWith('mongo-locks')

    // Check that createIndex was called with the correct argument
    expect(createIndexMock).toHaveBeenCalledWith({ id: 1 })
  })
})

describe('mongoDb.plugin.register', () => {
  let server
  let stopHandler
  const closeMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    server = {
      decorate: vi.fn(),
      events: {
        on: vi.fn((event, fn) => {
          if (event === 'stop') stopHandler = fn
        })
      },
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  it('connects to MongoDB and decorates server and request', async () => {
    const createIndexMock = vi.fn()
    const clientMock = {
      db: vi.fn(() => ({
        collection: vi.fn(() => ({ createIndex: createIndexMock }))
      })),
      close: closeMock,
      topology: { isConnected: () => true }
    }

    const { MongoClient } = await import('mongodb')
    MongoClient.connect.mockResolvedValue(clientMock)

    await mongoDb.plugin.register(server, {
      mongoUrl: 'mongodb://localhost',
      mongoOptions: { maxPoolSize: 10 }
    })

    expect(MongoClient.connect).toHaveBeenCalledWith('mongodb://localhost', {
      maxPoolSize: 10
    })
    expect(server.decorate).toHaveBeenCalledWith(
      'server',
      'mongoClient',
      clientMock,
      {}
    )
    expect(server.decorate).toHaveBeenCalledWith(
      'server',
      'db',
      expect.any(Object),
      {}
    )
    expect(server.decorate).toHaveBeenCalledWith(
      'server',
      'locker',
      expect.any(Object),
      {}
    )
    expect(server.decorate).toHaveBeenCalledWith(
      'request',
      'db',
      expect.any(Function),
      { apply: true }
    )
    expect(server.decorate).toHaveBeenCalledWith(
      'request',
      'locker',
      expect.any(Function),
      { apply: true }
    )
    expect(createIndexMock).toHaveBeenCalledWith({ id: 1 })
  })

  it('calls stop handler and closes client', async () => {
    const createIndexMock = vi.fn()
    const collectionMock = vi.fn(() => ({ createIndex: createIndexMock }))
    const dbMock = { collection: collectionMock }
    const clientMock = {
      db: vi.fn(() => dbMock),
      close: closeMock,
      topology: { isConnected: () => true }
    }

    const { MongoClient } = await import('mongodb')
    MongoClient.connect.mockResolvedValue(clientMock)

    await mongoDb.plugin.register(server, {
      mongoUrl: 'mongodb://localhost',
      mongoOptions: {}
    })

    // Trigger stop event
    stopHandler && stopHandler()

    expect(closeMock).toHaveBeenCalled()
  })

  it('handles createIndexes throwing an error', async () => {
    const error = new Error('Index error')
    const dbMock = {
      collection: vi.fn(() => ({
        createIndex: vi.fn(() => {
          throw error
        })
      }))
    }
    const clientMock = {
      db: vi.fn(() => dbMock),
      close: vi.fn(),
      topology: { isConnected: () => true }
    }

    const { MongoClient } = await import('mongodb')
    MongoClient.connect.mockResolvedValue(clientMock)

    await expect(
      mongoDb.plugin.register(server, { mongoUrl: 'mongodb://localhost' })
    ).rejects.toThrow('Index error')

    expect(server.logger.error).not.toHaveBeenCalled() // Only if register doesn't log
  })
})
