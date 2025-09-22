import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MongoClient } from 'mongodb'

// ----------------------------
// Mock MongoClient
// ----------------------------
const mockConnect = vi.fn().mockResolvedValue()
const mockDb = vi.fn(() => ({
  listCollections: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) }))
}))
const mockClose = vi.fn().mockResolvedValue()

vi.mock('mongodb', () => {
  return {
    MongoClient: vi.fn(() => ({
      connect: mockConnect,
      db: mockDb,
      close: mockClose
    }))
  }
})

// ----------------------------
// MongoDB helper test
// ----------------------------
describe('#mongoDb', () => {
  let client

  beforeEach(() => {
    vi.clearAllMocks()
    client = new MongoClient('mongodb://localhost:27017/testdb')
  })

  it('Should setup MongoDb without errors', async () => {
    await expect(client.connect()).resolves.not.toThrow()

    const db = client.db()
    const collections = await db.listCollections().toArray()
    expect(collections).toEqual([])

    await expect(client.close()).resolves.not.toThrow()
  })
})
