/**
 * Integration tests for NanoBananaClient
 *
 * These tests make real API calls and require a valid API key.
 * Run with: npm run test:integration
 */

import { NanoBananaClient, createClient } from '../index'
import * as fs from 'fs'
import * as path from 'path'

// Skip if no API key is available
const apiKey = process.env.NanoBanana_ApiKey
const describeIfApiKey = apiKey ? describe : describe.skip

describeIfApiKey('NanoBananaClient Integration Tests', () => {
  const outputDir = path.join(__dirname, '../../temp')
  let client: NanoBananaClient

  beforeAll(() => {
    // Create client with default env API key
    client = createClient({ outputDir })
  })

  afterAll(async () => {
    // Optional: clear generated images after tests
    // Uncomment if you want to auto-clean
    // await client.clearSavedImages()
  })

  describe('healthCheck', () => {
    it('should verify API connectivity', async () => {
      const result = await client.healthCheck()

      expect(result.ok).toBe(true)
      expect(result.sdk).toBe('@google/generative-ai')
      expect(result.models.length).toBeGreaterThan(0)
    }, 30000) // 30 second timeout
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

  describe('generateImage', () => {
    it('should generate and save an image', async () => {
      const prompt = 'A cute cartoon banana wearing sunglasses'

      const images = await client.generateImage(prompt, {
        filename: 'test-banana',
        save: true
      })

      expect(images.length).toBeGreaterThan(0)

      const image = images[0]
      expect(image.data).toBeDefined()
      expect(image.mimeType).toBeDefined()

      if (image.filePath) {
        expect(fs.existsSync(image.filePath)).toBe(true)
        console.log('Image saved to:', image.filePath)

        // Verify file has content
        const stats = fs.statSync(image.filePath)
        expect(stats.size).toBeGreaterThan(0)
      }
    }, 60000) // 60 second timeout for image generation

    it('should generate image without saving', async () => {
      const prompt = 'A simple red circle'

      const images = await client.generateImage(prompt, {
        save: false
      })

      expect(images.length).toBeGreaterThan(0)
      expect(images[0].filePath).toBeUndefined()
      expect(images[0].data).toBeDefined()
    }, 60000)
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

// Quick manual test
describeIfApiKey('Quick Manual Test', () => {
  it('generates a futuristic city image', async () => {
    const client = createClient()

    console.log('Generating futuristic city image...')

    const images = await client.generateImage(
      'A futuristic cyberpunk city at night with neon lights and flying cars',
      { filename: 'futuristic-city' }
    )

    console.log('Generated', images.length, 'image(s)')
    images.forEach((img, i) => {
      console.log(`Image ${i + 1}:`, img.filePath || 'not saved')
    })

    expect(images.length).toBeGreaterThan(0)
  }, 90000)
})
