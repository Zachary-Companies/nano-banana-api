/**
 * Nano Banana API Client
 * Image generation using Gemini native image generation (Nano Banana)
 *
 * @packageDocumentation
 */

import { GoogleGenAI } from '@google/genai'
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

/** Supported aspect ratios for image generation */
export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'

/** Image size (Gemini 3 Pro only) */
export type ImageSize = '1K' | '2K' | '4K'

/** Gemini image generation models */
export type ImageModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'

/**
 * Configuration for NanoBananaClient
 */
export interface NanoBananaConfig {
  /** Google API Key (defaults to NanoBanana_ApiKey from .env) */
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
  /** Text description returned alongside the image, if any */
  text?: string
}

/**
 * Options for image generation
 */
export interface GenerateImageOptions {
  /** Model to use (default: gemini-2.5-flash-image) */
  model?: ImageModel
  /** Aspect ratio (default: 1:1) */
  aspectRatio?: AspectRatio
  /** Image size - only supported by gemini-3-pro-image-preview (default: 1K) */
  imageSize?: ImageSize
  /** Whether to save to disk (default: true) */
  save?: boolean
  /** Custom filename (without extension) */
  filename?: string
}

/**
 * Nano Banana API Client
 *
 * Generates images using Gemini native image generation models.
 *
 * Models:
 * - `gemini-2.5-flash-image` (Nano Banana) — fast, efficient image generation
 * - `gemini-3-pro-image-preview` (Nano Banana Pro) — professional quality, 4K support
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
    apiKey: string
    outputDir: string
  }
  private ai: GoogleGenAI

  constructor(config: NanoBananaConfig = {}) {
    const apiKey = config.apiKey || process.env.NanoBanana_ApiKey

    if (!apiKey) {
      throw new Error(
        'API key required. Set NanoBanana_ApiKey in .env or pass apiKey in config'
      )
    }

    this.config = {
      apiKey,
      outputDir: config.outputDir || path.join(process.cwd(), 'temp')
    }

    this.ai = new GoogleGenAI({ apiKey })

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true })
    }
  }

  /**
   * Get the underlying GoogleGenAI instance
   */
  getGenAI(): GoogleGenAI {
    return this.ai
  }

  /**
   * Get the current configuration (without exposing API keys)
   */
  getConfig(): { outputDir: string } {
    return { outputDir: this.config.outputDir }
  }

  /**
   * Generate an image using Gemini native image generation
   *
   * @param prompt - Text description of the image to generate
   * @param options - Generation options
   * @returns Generated images with base64 data and optional file paths
   */
  async generateImage(prompt: string, options?: GenerateImageOptions): Promise<GeneratedImage[]> {
    const shouldSave = options?.save !== false
    const model = options?.model || 'gemini-2.5-flash-image'
    const aspectRatio = options?.aspectRatio || '1:1'

    const imageConfig: Record<string, string> = { aspectRatio }

    // imageSize only supported by Gemini 3 Pro
    if (options?.imageSize && model === 'gemini-3-pro-image-preview') {
      imageConfig.imageSize = options.imageSize
    }

    const response = await this.ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig
      }
    })

    const images: GeneratedImage[] = []

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response returned from Gemini image generation')
    }

    const parts = response.candidates[0].content?.parts
    if (!parts || parts.length === 0) {
      throw new Error('No content parts returned from Gemini image generation')
    }

    // Collect any text that accompanies the image
    let responseText: string | undefined
    for (const part of parts) {
      if (part.text) {
        responseText = part.text
      }
    }

    // Process image parts
    let imageIndex = 0
    for (const part of parts) {
      if (part.inlineData) {
        const image: GeneratedImage = {
          data: part.inlineData.data!,
          mimeType: part.inlineData.mimeType || 'image/png'
        }

        if (responseText) {
          image.text = responseText
        }

        if (shouldSave) {
          const ext = image.mimeType === 'image/png' ? 'png' : 'jpg'
          const filename = options?.filename
            ? `${options.filename}${imageIndex > 0 ? `_${imageIndex}` : ''}.${ext}`
            : `image_${Date.now()}_${imageIndex}.${ext}`

          image.filePath = await this.saveImage(image.data, filename)
        }

        images.push(image)
        imageIndex++
      }
    }

    if (images.length === 0) {
      throw new Error('No image data returned from Gemini image generation')
    }

    return images
  }

  /**
   * Generate text content using Gemini
   */
  async generateText(prompt: string, options?: {
    model?: string
  }): Promise<string> {
    const model = options?.model || 'gemini-2.0-flash'

    const response = await this.ai.models.generateContent({
      model,
      contents: prompt
    })

    const text = response.text
    if (!text) {
      throw new Error('No text returned from Gemini')
    }

    return text
  }

  /**
   * Save base64 image data to disk
   */
  async saveImage(base64Data: string, filename: string): Promise<string> {
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
  async healthCheck(): Promise<{ ok: boolean; google: boolean }> {
    let googleOk = false

    try {
      await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'OK'
      })
      googleOk = true
    } catch (e) {
      // Google not available
    }

    return {
      ok: googleOk,
      google: googleOk
    }
  }
}

// Re-export the SDK type for consumers
export { GoogleGenAI }

/**
 * Create a client with default configuration
 */
export function createClient(config?: NanoBananaConfig): NanoBananaClient {
  return new NanoBananaClient(config)
}
