# @zachary/nano-banana-api

An image generator

This package wraps the `@google/genai` npm package and provides a consistent interface for use in our agent system.

## Installation

```bash
npm install @zachary/nano-banana-api
```

## Usage

```typescript
import { NanoBananaClient } from '@zachary/nano-banana-api'

const client = new NanoBananaClient({
  apiKey: process.env.NANO-BANANA_API_KEY || ''
})

// Use wrapper methods
const health = await client.healthCheck()

// Or access the underlying SDK directly
const sdk = client.getSdk()
// sdk.someMethod(...)
```

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `apiKey` | `string` | API key for authentication |




## Underlying Package

This library wraps [`@google/genai`](https://www.npmjs.com/package/@google/genai).

Documentation: https://ai.google.dev/gemini-api/docs/image-generation#javascript

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test
```

## License

MIT
