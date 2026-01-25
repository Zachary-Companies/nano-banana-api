/**
 * Nano Banana API Client
 * Wraps the @google/generative-ai package for image generation
 *
 * @packageDocumentation
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

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
  /** API Key (defaults to NanoBanana_ApiKey from .env) */
  apiKey?: string
  /** Output directory for saved images (defaults to ./temp) */
  outputDir?: string
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  /** Base64 encoded image data */
  data: string
  /** MIME type of the image */
  mimeType: string
  /** File path if saved to disk */
  filePath?: string
}

/**
 * Nano Banana API Client
 *
 * This client wraps the @google/generative-ai package and provides
 * image generation capabilities using Google's Imagen model.
 *
 * @example
 * ```typescript
 * // Uses API key from .env automatically
 * const client = new NanoBananaClient()
 *
 * // Generate and save an image
 * const result = await client.generateImage('a futuristic city at sunset')
 * console.log('Saved to:', result.filePath)
 * ```
 */
export class NanoBananaClient {
  private config: Required<NanoBananaConfig>
  private genAI: GoogleGenerativeAI

  constructor(config: NanoBananaConfig = {}) {
    const apiKey = config.apiKey || process.env.NanoBanana_ApiKey

    if (!apiKey) {
      throw new Error(
        'API key is required. Set NanoBanana_ApiKey in .env or pass apiKey in config.'
      )
    }

    this.config = {
      apiKey,
      outputDir: config.outputDir || path.join(process.cwd(), 'temp')
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey)

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true })
    }
  }

  /**
   * Get the underlying GoogleGenerativeAI instance
   */
  getGenAI(): GoogleGenerativeAI {
    return this.genAI
  }

  /**
   * Get the current configuration (without exposing API key)
   */
  getConfig(): { outputDir: string } {
    return { outputDir: this.config.outputDir }
  }

  /**
   * Generate an image from a text prompt
   *
   * Uses Gemini model to generate image content.
   *
   * @param prompt - Text description of the image to generate
   * @param options - Generation options
   * @returns Generated image with optional file path
   */
  async generateImage(prompt: string, options?: {
    /** Model to use (default: gemini-2.0-flash-exp) */
    model?: string
    /** Whether to save to disk (default: true) */
    save?: boolean
    /** Custom filename (without extension) */
    filename?: string
  }): Promise<GeneratedImage[]> {
    const model = options?.model || 'gemini-2.0-flash-exp'
    const shouldSave = options?.save !== false

    const imageModel = this.genAI.getGenerativeModel({ model })

    const imagePrompt = `Generate an image of: ${prompt}`

    const result = await imageModel.generateContent(imagePrompt)
    const response = await result.response
    const images: GeneratedImage[] = []

    // Process each candidate for inline image data
    for (let i = 0; i < (response.candidates?.length || 0); i++) {
      const candidate = response.candidates![i]

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const image: GeneratedImage = {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          }

          if (shouldSave) {
            const ext = this.getExtension(image.mimeType)
            const filename = options?.filename
              ? `${options.filename}${images.length > 0 ? `_${images.length}` : ''}.${ext}`
              : `image_${Date.now()}_${images.length}.${ext}`

            image.filePath = await this.saveImage(image.data, filename, image.mimeType)
          }

          images.push(image)
        }
      }
    }

    // If no inline data, return text description (model doesn't support direct image gen)
    if (images.length === 0) {
      try {
        const textResponse = response.text()
        if (textResponse) {
          // Save text description as a file for reference
          if (shouldSave) {
            const filename = options?.filename
              ? `${options.filename}_description.txt`
              : `image_${Date.now()}_description.txt`
            const filePath = path.join(this.config.outputDir, filename)
            await fs.promises.writeFile(filePath, `Prompt: ${prompt}\n\nDescription:\n${textResponse}`)

            images.push({
              data: textResponse,
              mimeType: 'text/plain',
              filePath
            })
          } else {
            images.push({
              data: textResponse,
              mimeType: 'text/plain'
            })
          }
        }
      } catch (e) {
        // No response
      }
    }

    return images
  }

  /**
   * Generate content using a text model (for testing/fallback)
   */
  async generateText(prompt: string, options?: {
    model?: string
  }): Promise<string> {
    const model = options?.model || 'gemini-2.0-flash-exp'
    const textModel = this.genAI.getGenerativeModel({ model })

    const result = await textModel.generateContent(prompt)
    const response = await result.response
    return response.text()
  }

  /**
   * Save base64 image data to disk
   */
  async saveImage(base64Data: string, filename: string, mimeType?: string): Promise<string> {
    const filePath = path.join(this.config.outputDir, filename)
    const buffer = Buffer.from(base64Data, 'base64')

    await fs.promises.writeFile(filePath, buffer)

    return filePath
  }

  /**
   * List all images in the output directory
   */
  async listSavedImages(): Promise<string[]> {
    const files = await fs.promises.readdir(this.config.outputDir)
    return files
      .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
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
  async healthCheck(): Promise<{ ok: boolean; sdk: string; models: string[] }> {
    try {
      // Try to generate content to verify connectivity
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
      await model.generateContent('Say OK')

      return {
        ok: true,
        sdk: '@google/generative-ai',
        models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash']
      }
    } catch (error) {
      return {
        ok: false,
        sdk: '@google/generative-ai',
        models: []
      }
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp'
    }
    return mimeToExt[mimeType] || 'png'
  }
}

// Re-export types from the underlying package
export { GoogleGenerativeAI }

/**
 * Create a client with default configuration
 */
export function createClient(config?: NanoBananaConfig): NanoBananaClient {
  return new NanoBananaClient(config)
}
