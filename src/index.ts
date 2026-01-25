/**
 * Nano Banana API Client
 * Wraps the @google/genai package
 *
 * @packageDocumentation
 */

// Import the underlying package
// Note: You may need to adjust this import based on the package's export structure
import * as nanoBananaSdk from '@google/genai'

/**
 * Configuration for NanoBananaClient
 */
export interface NanoBananaConfig {
  /** API Key */
  apiKey: string
}

/**
 * Nano Banana API Client
 *
 * This client wraps the @google/genai package and provides
 * a consistent interface for use in our agent system.
 *
 * @example
 * ```typescript
 * const client = new NanoBananaClient({
 *   apiKey: 'your-api-key'
 * })
 * ```
 */
export class NanoBananaClient {
  private config: NanoBananaConfig
  private sdk: typeof nanoBananaSdk

  constructor(config: NanoBananaConfig) {
    this.config = config
    this.sdk = nanoBananaSdk
    this.apiKey = config.apiKey
  }

  /**
   * Get the underlying SDK instance
   * Use this for direct access to all SDK functionality
   */
  getSdk(): typeof nanoBananaSdk {
    return this.sdk
  }

  /**
   * Get the current configuration
   */
  getConfig(): NanoBananaConfig {
    return { ...this.config }
  }

  // TODO: Add wrapper methods for common operations
  // The methods below are examples - customize based on the actual SDK

  /**
   * Example method - replace with actual SDK operations
   */
  async healthCheck(): Promise<{ ok: boolean; sdk: string }> {
    return {
      ok: true,
      sdk: '@google/genai'
    }
  }
}

// Re-export types from the underlying package for convenience
export { nanoBananaSdk }
