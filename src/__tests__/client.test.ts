import { NanoBananaClient } from '../index'
import * as fs from 'fs'
import * as path from 'path'

// Mock the environment variables for tests
process.env.NanoBanana_ApiKey = 'test-google-api-key'

// Mock @google/genai
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn()
      }
    }))
  }
})

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
    it('should create a client instance with env API key', () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      expect(client).toBeInstanceOf(NanoBananaClient)
    })

    it('should create a client instance with explicit API key', () => {
      const client = new NanoBananaClient({
        apiKey: 'explicit-google-key',
        outputDir: testOutputDir
      })
      expect(client).toBeInstanceOf(NanoBananaClient)
    })

    it('should throw if no API key is available', () => {
      const originalKey = process.env.NanoBanana_ApiKey
      delete process.env.NanoBanana_ApiKey

      expect(() => new NanoBananaClient({ outputDir: testOutputDir })).toThrow(
        'API key required'
      )

      process.env.NanoBanana_ApiKey = originalKey
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
    })
  })

  describe('getGenAI', () => {
    it('should return the underlying GoogleGenAI instance', () => {
      const client = new NanoBananaClient({
        apiKey: 'test-key',
        outputDir: testOutputDir
      })
      const genAI = client.getGenAI()
      expect(genAI).toBeDefined()
    })
  })

  describe('generateImage', () => {
    it('should generate an image and save to disk', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      // Mock the generateContent response
      genAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              { inlineData: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', mimeType: 'image/png' } }
            ]
          }
        }]
      })

      const images = await client.generateImage('a cute banana', {
        filename: 'test-banana',
        save: true
      })

      expect(images.length).toBe(1)
      expect(images[0].mimeType).toBe('image/png')
      expect(images[0].data).toBeDefined()
      expect(images[0].filePath).toBeDefined()
      expect(fs.existsSync(images[0].filePath!)).toBe(true)

      // Verify the API was called with correct params
      expect(genAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-image',
        contents: 'a cute banana',
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '1:1' }
        }
      })

      // Clean up
      fs.unlinkSync(images[0].filePath!)
    })

    it('should generate without saving when save is false', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              { inlineData: { data: 'base64data', mimeType: 'image/png' } }
            ]
          }
        }]
      })

      const images = await client.generateImage('test', { save: false })

      expect(images.length).toBe(1)
      expect(images[0].filePath).toBeUndefined()
      expect(images[0].data).toBe('base64data')
    })

    it('should use custom model and aspect ratio', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              { inlineData: { data: 'base64data', mimeType: 'image/png' } }
            ]
          }
        }]
      })

      await client.generateImage('landscape photo', {
        model: 'gemini-3-pro-image-preview',
        aspectRatio: '16:9',
        imageSize: '4K',
        save: false
      })

      expect(genAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-3-pro-image-preview',
        contents: 'landscape photo',
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '16:9', imageSize: '4K' }
        }
      })
    })

    it('should not pass imageSize for flash model', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              { inlineData: { data: 'base64data', mimeType: 'image/png' } }
            ]
          }
        }]
      })

      await client.generateImage('test', {
        model: 'gemini-2.5-flash-image',
        imageSize: '4K',
        save: false
      })

      expect(genAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-image',
        contents: 'test',
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '1:1' }
        }
      })
    })

    it('should include text from response if present', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              { text: 'Here is your image of a banana' },
              { inlineData: { data: 'base64data', mimeType: 'image/png' } }
            ]
          }
        }]
      })

      const images = await client.generateImage('banana', { save: false })

      expect(images[0].text).toBe('Here is your image of a banana')
    })

    it('should throw if no candidates returned', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({ candidates: [] })

      await expect(client.generateImage('test', { save: false }))
        .rejects.toThrow('No response returned from Gemini image generation')
    })

    it('should throw if no image parts returned', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{ text: 'I cannot generate that image' }]
          }
        }]
      })

      await expect(client.generateImage('test', { save: false }))
        .rejects.toThrow('No image data returned from Gemini image generation')
    })
  })

  describe('generateText', () => {
    it('should generate text using Gemini', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({
        text: 'Hello, world!'
      })

      const result = await client.generateText('Say hello')
      expect(result).toBe('Hello, world!')
    })

    it('should use custom model for text', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({
        text: 'Response'
      })

      await client.generateText('prompt', { model: 'gemini-2.5-pro' })

      expect(genAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-pro',
        contents: 'prompt'
      })
    })

    it('should throw if no text returned', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({ text: undefined })

      await expect(client.generateText('test'))
        .rejects.toThrow('No text returned from Gemini')
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

  describe('healthCheck', () => {
    it('should return ok when Gemini is available', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockResolvedValueOnce({ text: 'OK' })

      const result = await client.healthCheck()

      expect(result.ok).toBe(true)
      expect(result.google).toBe(true)
    })

    it('should return not ok when Gemini fails', async () => {
      const client = new NanoBananaClient({ outputDir: testOutputDir })
      const genAI = client.getGenAI() as any

      genAI.models.generateContent.mockRejectedValueOnce(new Error('API error'))

      const result = await client.healthCheck()

      expect(result.ok).toBe(false)
      expect(result.google).toBe(false)
    })
  })
})
