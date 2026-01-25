import { NanoBananaClient } from '../index'

describe('NanoBananaClient', () => {
  let client: NanoBananaClient

  beforeEach(() => {
    client = new NanoBananaClient({ apiKey: 'test-key' })
  })

  describe('constructor', () => {
    it('should create a client instance', () => {
      expect(client).toBeInstanceOf(NanoBananaClient)
    })

    it('should store configuration', () => {
      const config = client.getConfig()
      expect(config).toBeDefined()
      expect(config.apiKey).toBe('test-key')
    })
  })

  describe('getGenAI', () => {
    it('should return the underlying GoogleGenerativeAI instance', () => {
      const genAI = client.getGenAI()
      expect(genAI).toBeDefined()
    })
  })

  describe('healthCheck', () => {
    it('should return ok status', async () => {
      const result = await client.healthCheck()
      expect(result.ok).toBe(true)
      expect(result.sdk).toBe('@google/generative-ai')
    })
  })
})
