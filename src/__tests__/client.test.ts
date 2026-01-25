import { NanoBananaClient } from '../index'
import * as fs from 'fs'
import * as path from 'path'

// Mock the environment variables for tests
process.env.NanoBanana_ApiKey = 'test-google-api-key'
process.env.OPENAI_API_KEY = 'test-openai-api-key'

describe('NanoBananaClient', () => {
  const testOutputDir = path.join(__dirname, '../../temp-test')

  beforeAll(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true })
    }
  })

  afterAll(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true })
    }
  })

  describe('constructor', () => {
    it('should create a client instance with env API keys', () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      expect(client).toBeInstanceOf(NanoBananaClient)
    })

    it('should create a client instance with explicit API keys', () => {
      const client = new NanoBananaClient({
        apiKey: 'explicit-google-key',
        openaiApiKey: 'explicit-openai-key',
        outputDir: testOutputDir
      })
      expect(client).toBeInstanceOf(NanoBananaClient)
    })

    it('should create client with only OpenAI key', () => {
      const originalGoogleKey = process.env.NanoBanana_ApiKey
      delete process.env.NanoBanana_ApiKey

      const client = new NanoBananaClient({ outputDir: testOutputDir })
      expect(client).toBeInstanceOf(NanoBananaClient)
      expect(client.getOpenAI()).toBeDefined()
      expect(client.getGenAI()).toBeUndefined()

      process.env.NanoBanana_ApiKey = originalGoogleKey
    })

    it('should create client with only Google key', () => {
      const originalOpenAIKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY

      const client = new NanoBananaClient({ outputDir: testOutputDir })
      expect(client).toBeInstanceOf(NanoBananaClient)
      expect(client.getGenAI()).toBeDefined()
      expect(client.getOpenAI()).toBeUndefined()

      process.env.OPENAI_API_KEY = originalOpenAIKey
    })

    it('should throw if no API key is available', () => {
      const originalGoogleKey = process.env.NanoBanana_ApiKey
      const originalOpenAIKey = process.env.OPENAI_API_KEY
      delete process.env.NanoBanana_ApiKey
      delete process.env.OPENAI_API_KEY

      expect(() => new NanoBananaClient({ outputDir: testOutputDir })).toThrow(
        'API key required'
      )

      process.env.NanoBanana_ApiKey = originalGoogleKey
      process.env.OPENAI_API_KEY = originalOpenAIKey
    })

    it('should create output directory if it does not exist', () => {
      const customDir = path.join(testOutputDir, 'custom-output')

      // Ensure it doesn't exist
      if (fs.existsSync(customDir)) {
        fs.rmSync(customDir, { recursive: true })
      }

      const client = new NanoBananaClient({ outputDir: customDir })
      expect(fs.existsSync(customDir)).toBe(true)
    })
  })

  describe('getConfig', () => {
    it('should return configuration without API key', () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const config = client.getConfig()

      expect(config.outputDir).toBe(testOutputDir)
      expect((config as any).apiKey).toBeUndefined()
      expect((config as any).openaiApiKey).toBeUndefined()
    })
  })

  describe('getGenAI', () => {
    it('should return the underlying GoogleGenerativeAI instance when configured', () => {
      const client = new NanoBananaClient({
        apiKey: 'test-key',
        outputDir: testOutputDir
      })
      const genAI = client.getGenAI()
      expect(genAI).toBeDefined()
    })
  })

  describe('getOpenAI', () => {
    it('should return the underlying OpenAI instance when configured', () => {
      const client = new NanoBananaClient({
        openaiApiKey: 'test-key',
        outputDir: testOutputDir
      })
      const openai = client.getOpenAI()
      expect(openai).toBeDefined()
    })
  })

  describe('saveImage', () => {
    it('should save base64 data to a file', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })

      // Simple 1x1 red PNG in base64
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

      const filePath = await client.saveImage(base64Data, 'test-image.png')

      expect(fs.existsSync(filePath)).toBe(true)
      expect(filePath).toContain('test-image.png')

      // Clean up
      fs.unlinkSync(filePath)
    })
  })

  describe('listSavedImages', () => {
    it('should list image files in output directory', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })

      // Create some test files
      fs.writeFileSync(path.join(testOutputDir, 'test1.png'), '')
      fs.writeFileSync(path.join(testOutputDir, 'test2.jpg'), '')
      fs.writeFileSync(path.join(testOutputDir, 'test.txt'), '') // Not an image

      const images = await client.listSavedImages()

      expect(images.length).toBe(2)
      expect(images.some(i => i.includes('test1.png'))).toBe(true)
      expect(images.some(i => i.includes('test2.jpg'))).toBe(true)
      expect(images.some(i => i.includes('test.txt'))).toBe(false)

      // Clean up
      fs.unlinkSync(path.join(testOutputDir, 'test1.png'))
      fs.unlinkSync(path.join(testOutputDir, 'test2.jpg'))
      fs.unlinkSync(path.join(testOutputDir, 'test.txt'))
    })
  })

  describe('clearSavedImages', () => {
    it('should delete all images from output directory', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })

      // Create some test files
      fs.writeFileSync(path.join(testOutputDir, 'clear1.png'), '')
      fs.writeFileSync(path.join(testOutputDir, 'clear2.jpg'), '')

      const deleted = await client.clearSavedImages()

      expect(deleted).toBe(2)
      expect(fs.readdirSync(testOutputDir).filter(f => /\.(png|jpg)$/.test(f)).length).toBe(0)
    })
  })
})
