# @zachary/nano-banana-api

A TypeScript client for Google's Generative AI (Gemini) with image generation capabilities.

## Installation

```bash
npm install @zachary/nano-banana-api
```

## Configuration

The client automatically loads API keys from:
1. `NanoBanana_ApiKey` environment variable
2. `.env` file in the current directory
3. `~/.agentic-loop/.env` file

Or pass the API key directly:

```typescript
const client = new NanoBananaClient({ apiKey: 'your-api-key' })
```

## Usage

```typescript
import { NanoBananaClient, createClient } from '@zachary/nano-banana-api'

// Create client (uses API key from .env)
const client = createClient()

// Generate text
const text = await client.generateText('Explain quantum computing in simple terms')
console.log(text)

// Generate image (returns description or image data depending on model capabilities)
const images = await client.generateImage('A sunset over mountains', {
  filename: 'sunset',
  save: true
})
console.log('Saved to:', images[0].filePath)

// Health check
const health = await client.healthCheck()
console.log('API Status:', health.ok ? 'OK' : 'Error')
```

## API

### `NanoBananaClient`

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | from env | Google AI API key |
| `outputDir` | `string` | `./temp` | Directory for saved images |

#### Methods

- **`generateText(prompt, options?)`** - Generate text content
- **`generateImage(prompt, options?)`** - Generate image or image description
- **`saveImage(base64Data, filename)`** - Save base64 image to disk
- **`listSavedImages()`** - List all saved images in output directory
- **`clearSavedImages()`** - Delete all saved images
- **`healthCheck()`** - Verify API connectivity
- **`getGenAI()`** - Access underlying GoogleGenerativeAI instance

### Image Generation Options

```typescript
await client.generateImage('A cute cat', {
  model: 'gemini-2.0-flash-exp',  // Model to use
  save: true,                      // Save to disk (default: true)
  filename: 'my-cat'               // Custom filename
})
```

## Output Directory

Images and descriptions are saved to the `temp/` folder by default:
- This folder is gitignored
- Use `clearSavedImages()` to clean up

## Note on Image Generation

The standard Google Generative AI SDK (`@google/generative-ai`) primarily supports text generation. Direct image generation requires:
- Google Vertex AI with Imagen models
- Or use the returned text descriptions as prompts for other image generation services

The `generateImage` method will return:
- Image data (base64) if the model supports inline image responses
- Text description of the image if direct generation isn't available

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run unit tests
npm test

# Run integration tests (requires API key)
npm run test:integration
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NanoBanana_ApiKey` | Google AI API key |

## License

MIT
