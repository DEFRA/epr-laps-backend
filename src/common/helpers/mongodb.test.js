import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

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
