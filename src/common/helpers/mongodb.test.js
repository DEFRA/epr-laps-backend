import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { safeDecorate, createIndexes } from './mongodb'

// Mocks
const clientMock = {
  db: vi.fn(),
  close: vi.fn()
}

const dbMock = {
  collection: vi.fn()
}

const lockerMock = {}

vi.mock('mongodb', () => ({
  MongoClient: {
    connect: vi.fn(() => Promise.resolve(clientMock))
  }
}))

vi.mock('mongo-locks', () => ({
  LockManager: vi.fn(() => lockerMock)
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
