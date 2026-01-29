/**
 * Integration tests for NanoBananaClient
 *
 * These tests make real API calls and require a valid Google API key.
 * Run with: npm run test:integration
 */

import { NanoBananaClient, createClient } from '../index'
import * as fs from 'fs'
import * as path from 'path'

// Skip if no API key is available
const hasGoogle = !!process.env.NanoBanana_ApiKey
const describeIfApiKey = hasGoogle ? describe : describe.skip

describeIfApiKey('NanoBananaClient Integration Tests', () => {
  const outputDir = path.join(__dirname, '../../temp')
  let client: NanoBananaClient

  beforeAll(() => {
    client = createClient({ outputDir })
  })

  describe('healthCheck', () => {
    it('should verify API connectivity', async () => {
      const result = await client.healthCheck()

      expect(result.ok).toBe(true)
      expect(result.google).toBe(true)
    }, 30000)
  })

  describe('generateText', () => {
    it('should generate text response', async () => {
      const prompt = 'Say "Hello, Nano Banana!" and nothing else.'
      const result = await client.generateText(prompt)

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      console.log('Text generation result:', result)
    }, 30000)
  })

  describe('generateImage (Nano Banana)', () => {
    it('should generate and save a PNG image with default settings', async () => {
      const prompt = 'A cute cartoon banana wearing sunglasses'

      const images = await client.generateImage(prompt, {
        filename: 'test-banana',
        save: true
      })

      expect(images.length).toBeGreaterThan(0)

      const image = images[0]
      expect(image.data).toBeDefined()
      expect(image.mimeType).toMatch(/^image\//)

      if (image.filePath) {
        expect(fs.existsSync(image.filePath)).toBe(true)
        console.log('Image saved to:', image.filePath)

        const stats = fs.statSync(image.filePath)
        expect(stats.size).toBeGreaterThan(0)
      }
    }, 90000)

    it('should generate image without saving', async () => {
      const prompt = 'A simple red circle'

      const images = await client.generateImage(prompt, {
        save: false
      })

      expect(images.length).toBeGreaterThan(0)
      expect(images[0].filePath).toBeUndefined()
      expect(images[0].data).toBeDefined()
    }, 90000)

    it('should generate landscape image', async () => {
      const images = await client.generateImage('A mountain landscape at sunset', {
        aspectRatio: '16:9',
        filename: 'test-landscape',
        save: true
      })

      expect(images.length).toBeGreaterThan(0)
      expect(images[0].data).toBeDefined()

      if (images[0].filePath) {
        console.log('Landscape image saved to:', images[0].filePath)
      }
    }, 90000)

    it('should generate portrait image', async () => {
      const images = await client.generateImage('A tall lighthouse', {
        aspectRatio: '9:16',
        filename: 'test-portrait',
        save: true
      })

      expect(images.length).toBeGreaterThan(0)
      expect(images[0].data).toBeDefined()
    }, 90000)
  })

  describe('generateImage (Nano Banana Pro)', () => {
    it('should generate a 4K image with Pro model', async () => {
      const images = await client.generateImage('A professional product photo of a coffee cup', {
        model: 'gemini-3-pro-image-preview',
        aspectRatio: '1:1',
        imageSize: '4K',
        filename: 'test-pro-4k',
        save: true
      })

      expect(images.length).toBeGreaterThan(0)
      expect(images[0].data).toBeDefined()

      if (images[0].filePath) {
        console.log('Pro 4K image saved to:', images[0].filePath)
      }
    }, 120000)
  })

  describe('file management', () => {
    it('should list saved images', async () => {
      const images = await client.listSavedImages()

      console.log('Saved images:', images)
      expect(Array.isArray(images)).toBe(true)
    })

    it('should get output directory from config', () => {
      const config = client.getConfig()
      expect(config.outputDir).toBe(outputDir)
    })
  })
})
