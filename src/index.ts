/**
 * Nano Banana API Client
 * Image generation using OpenAI DALL-E and Google Generative AI
 *
 * @packageDocumentation
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import * as https from 'https'

// Load .env from default locations
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.agentic-loop', '.env')
]

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

/**
 * Configuration for NanoBananaClient
 */
export interface NanoBananaConfig {
  /** Google API Key (defaults to NanoBanana_ApiKey from .env) */
  apiKey?: string
  /** OpenAI API Key (defaults to OPENAI_API_KEY from .env) */
  openaiApiKey?: string
  /** Output directory for saved images (defaults to ./temp) */
  outputDir?: string
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  /** Base64 encoded image data or URL */
  data: string
  /** MIME type of the image */
  mimeType: string
  /** File path if saved to disk */
  filePath?: string
}

/**
 * Nano Banana API Client
 *
 * Generates actual PNG images using OpenAI DALL-E.
 *
 * @example
 * ```typescript
 * const client = new NanoBananaClient()
 * const images = await client.generateImage('a cute banana with sunglasses')
 * console.log('Saved to:', images[0].filePath)
 * ```
 */
export class NanoBananaClient {
  private config: {
    apiKey?: string
    openaiApiKey?: string
    outputDir: string
  }
  private genAI?: GoogleGenerativeAI
  private openai?: OpenAI

  constructor(config: NanoBananaConfig = {}) {
    const apiKey = config.apiKey || process.env.NanoBanana_ApiKey
    const openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY

    if (!apiKey && !openaiApiKey) {
      throw new Error(
        'API key required. Set OPENAI_API_KEY or NanoBanana_ApiKey in .env'
      )
    }

    this.config = {
      apiKey,
      openaiApiKey,
      outputDir: config.outputDir || path.join(process.cwd(), 'temp')
    }

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey)
    }

    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey })
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true })
    }
  }

  /**
   * Get the underlying GoogleGenerativeAI instance
   */
  getGenAI(): GoogleGenerativeAI | undefined {
    return this.genAI
  }

  /**
   * Get the underlying OpenAI instance
   */
  getOpenAI(): OpenAI | undefined {
    return this.openai
  }

  /**
   * Get the current configuration (without exposing API keys)
   */
  getConfig(): { outputDir: string } {
    return { outputDir: this.config.outputDir }
  }

  /**
   * Generate a PNG image using DALL-E
   *
   * @param prompt - Text description of the image to generate
   * @param options - Generation options
   * @returns Generated image with file path
   */
  async generateImage(prompt: string, options?: {
    /** Image size (default: 1024x1024) */
    size?: '1024x1024' | '1792x1024' | '1024x1792' | '256x256' | '512x512'
    /** Model to use (default: dall-e-3) */
    model?: 'dall-e-3' | 'dall-e-2'
    /** Image quality (default: standard) */
    quality?: 'standard' | 'hd'
    /** Whether to save to disk (default: true) */
    save?: boolean
    /** Custom filename (without extension) */
    filename?: string
  }): Promise<GeneratedImage[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key required for image generation. Set OPENAI_API_KEY in .env')
    }

    const shouldSave = options?.save !== false
    const model = options?.model || 'dall-e-3'
    const size = options?.size || '1024x1024'
    const quality = options?.quality || 'standard'

    const response = await this.openai.images.generate({
      model,
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'b64_json'
    })

    const images: GeneratedImage[] = []

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from DALL-E')
    }

    for (let i = 0; i < response.data.length; i++) {
      const imageData = response.data[i]

      if (imageData.b64_json) {
        const image: GeneratedImage = {
          data: imageData.b64_json,
          mimeType: 'image/png'
        }

        if (shouldSave) {
          const filename = options?.filename
            ? `${options.filename}${i > 0 ? `_${i}` : ''}.png`
            : `image_${Date.now()}_${i}.png`

          image.filePath = await this.saveImage(image.data, filename)
        }

        images.push(image)
      }
    }

    return images
  }

  /**
   * Generate content using Gemini text model
   */
  async generateText(prompt: string, options?: {
    model?: string
  }): Promise<string> {
    if (!this.genAI) {
      throw new Error('Google API key required for text generation')
    }

    const model = options?.model || 'gemini-2.0-flash-exp'
    const textModel = this.genAI.getGenerativeModel({ model })

    const result = await textModel.generateContent(prompt)
    const response = await result.response
    return response.text()
  }

  /**
   * Generate an SVG image using Gemini
   */
  async generateSvg(prompt: string, options?: {
    save?: boolean
    filename?: string
  }): Promise<GeneratedImage> {
    if (!this.genAI) {
      throw new Error('Google API key required for SVG generation')
    }

    const shouldSave = options?.save !== false
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const result = await model.generateContent(
      `Create an SVG image of: ${prompt}. Return ONLY the SVG code, no markdown or explanation.`
    )

    const text = result.response.text()
    const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i)

    if (!svgMatch) {
      throw new Error('Failed to generate SVG')
    }

    const image: GeneratedImage = {
      data: svgMatch[0],
      mimeType: 'image/svg+xml'
    }

    if (shouldSave) {
      const filename = options?.filename
        ? `${options.filename}.svg`
        : `svg_${Date.now()}.svg`
      const filePath = path.join(this.config.outputDir, filename)
      await fs.promises.writeFile(filePath, svgMatch[0])
      image.filePath = filePath
    }

    return image
  }

  /**
   * Save base64 image data to disk as PNG
   */
  async saveImage(base64Data: string, filename: string): Promise<string> {
    const filePath = path.join(this.config.outputDir, filename)
    const buffer = Buffer.from(base64Data, 'base64')
    await fs.promises.writeFile(filePath, buffer)
    return filePath
  }

  /**
   * Download image from URL and save to disk
   */
  async downloadImage(url: string, filename: string): Promise<string> {
    const filePath = path.join(this.config.outputDir, filename)

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath)
      https.get(url, (response) => {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve(filePath)
        })
      }).on('error', (err) => {
        fs.unlink(filePath, () => {})
        reject(err)
      })
    })
  }

  /**
   * List all images in the output directory
   */
  async listSavedImages(): Promise<string[]> {
    const files = await fs.promises.readdir(this.config.outputDir)
    return files
      .filter(f => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f))
      .map(f => path.join(this.config.outputDir, f))
  }

  /**
   * Clear all images from the output directory
   */
  async clearSavedImages(): Promise<number> {
    const images = await this.listSavedImages()
    for (const img of images) {
      await fs.promises.unlink(img)
    }
    return images.length
  }

  /**
   * Health check - verifies API connectivity
   */
  async healthCheck(): Promise<{ ok: boolean; openai: boolean; google: boolean }> {
    let openaiOk = false
    let googleOk = false

    if (this.openai) {
      try {
        await this.openai.models.list()
        openaiOk = true
      } catch (e) {
        // OpenAI not available
      }
    }

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
        await model.generateContent('OK')
        googleOk = true
      } catch (e) {
        // Google not available
      }
    }

    return {
      ok: openaiOk || googleOk,
      openai: openaiOk,
      google: googleOk
    }
  }
}

// Re-export types
export { GoogleGenerativeAI }
export { OpenAI }

/**
 * Create a client with default configuration
 */
export function createClient(config?: NanoBananaConfig): NanoBananaClient {
  return new NanoBananaClient(config)
}
