# @zachary/nano-banana-api

Image generation client using Gemini native image generation (Nano Banana).

## Models

| Model | Alias | Description |
|-------|-------|-------------|
| `gemini-2.5-flash-image` | Nano Banana | Fast, efficient image generation |
| `gemini-3-pro-image-preview` | Nano Banana Pro | Professional quality, 4K support, thinking mode |

## Installation

```bash
npm install @zachary/nano-banana-api
```

## Configuration

The client loads the API key from:
1. `NanoBanana_ApiKey` environment variable
2. `.env` file in the current directory
3. `~/.agentic-loop/.env` file

Or pass directly:

```typescript
const client = new NanoBananaClient({ apiKey: 'your-api-key' })
```

## Usage

```typescript
import { NanoBananaClient, createClient } from '@zachary/nano-banana-api'

// Create client (uses API key from .env)
const client = createClient()

// Generate image (default: Nano Banana, 1:1)
const images = await client.generateImage('A sunset over mountains', {
  filename: 'sunset',
  save: true
})
console.log('Saved to:', images[0].filePath)

// Generate landscape image
const landscape = await client.generateImage('Mountain panorama', {
  aspectRatio: '16:9',
  save: true
})

// Generate 4K image with Pro model
const pro = await client.generateImage('Professional product photo', {
  model: 'gemini-3-pro-image-preview',
  aspectRatio: '1:1',
  imageSize: '4K',
  save: true
})

// Generate text
const text = await client.generateText('Explain quantum computing')
console.log(text)

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

- **`generateImage(prompt, options?)`** — Generate image using Gemini native image generation
- **`generateText(prompt, options?)`** — Generate text content using Gemini
- **`saveImage(base64Data, filename)`** — Save base64 image to disk
- **`listSavedImages()`** — List all saved images in output directory
- **`clearSavedImages()`** — Delete all saved images
- **`healthCheck()`** — Verify API connectivity
- **`getGenAI()`** — Access underlying GoogleGenAI instance

### Image Generation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `ImageModel` | `gemini-2.5-flash-image` | Model to use |
| `aspectRatio` | `AspectRatio` | `1:1` | Image aspect ratio |
| `imageSize` | `ImageSize` | — | Image size (Pro model only): `1K`, `2K`, `4K` |
| `save` | `boolean` | `true` | Save to disk |
| `filename` | `string` | — | Custom filename (without extension) |

### Supported Aspect Ratios

`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

## Development

```bash
npm install
npm run build
npm test
npm run test:integration  # requires NanoBanana_ApiKey
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NanoBanana_ApiKey` | Google AI API key |
