/**
 * Test script to generate a visible image
 * Run with: npx ts-node test-image.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load API key
const envPath = path.join(process.env.USERPROFILE || '', '.agentic-loop', '.env')
dotenv.config({ path: envPath })

const apiKey = process.env.NanoBanana_ApiKey
if (!apiKey) {
  console.error('No API key found!')
  process.exit(1)
}

const outputDir = path.join(__dirname, 'temp')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function testImageGeneration() {
  const genAI = new GoogleGenerativeAI(apiKey!)

  console.log('Testing image generation with different models...\n')

  // Models to try for image generation
  const modelsToTry = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ]

  const prompt = 'Create an image of a happy yellow banana with sunglasses surfing on a wave'

  for (const modelName of modelsToTry) {
    console.log(`\n--- Trying model: ${modelName} ---`)

    try {
      const model = genAI.getGenerativeModel({ model: modelName })

      const result = await model.generateContent([
        { text: prompt }
      ])

      const response = result.response
      console.log('Response received')

      // Check for inline data (images)
      let foundImage = false
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            console.log('Found inline image data!')
            console.log('MIME type:', part.inlineData.mimeType)

            const ext = part.inlineData.mimeType.split('/')[1] || 'png'
            const filename = `${modelName.replace(/[^a-z0-9]/gi, '-')}_${Date.now()}.${ext}`
            const filePath = path.join(outputDir, filename)

            const buffer = Buffer.from(part.inlineData.data, 'base64')
            fs.writeFileSync(filePath, buffer)

            console.log(`Image saved to: ${filePath}`)
            console.log(`Size: ${buffer.length} bytes`)
            foundImage = true
          }
        }
      }

      if (!foundImage) {
        const text = response.text()
        console.log('No image data, got text response:')
        console.log(text.substring(0, 200) + (text.length > 200 ? '...' : ''))
      }

    } catch (error: any) {
      console.log('Error:', error.message)
    }
  }

  // Try with imagen-style prompt
  console.log('\n\n--- Trying with explicit image request ---')
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Try requesting image generation explicitly
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: 'Generate and return an image (as base64 PNG data) of: a cute cartoon banana character with big eyes and a smile' }]
      }]
    })

    const response = result.response

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          console.log('Got image!')
          const buffer = Buffer.from(part.inlineData.data, 'base64')
          const filePath = path.join(outputDir, `explicit_request_${Date.now()}.png`)
          fs.writeFileSync(filePath, buffer)
          console.log(`Saved to: ${filePath}`)
        }
      }
    }

    console.log('Text response:', response.text().substring(0, 300))
  } catch (error: any) {
    console.log('Error:', error.message)
  }

  // Generate SVG as alternative
  console.log('\n\n--- Generating SVG image ---')
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const result = await model.generateContent(
      'Create an SVG image of a happy banana character with sunglasses. Return ONLY the SVG code, no explanation.'
    )

    const svgCode = result.response.text()

    if (svgCode.includes('<svg')) {
      const svgMatch = svgCode.match(/<svg[\s\S]*<\/svg>/i)
      if (svgMatch) {
        const filePath = path.join(outputDir, `banana_${Date.now()}.svg`)
        fs.writeFileSync(filePath, svgMatch[0])
        console.log(`SVG saved to: ${filePath}`)
        console.log('You can open this SVG in a browser!')
      }
    } else {
      console.log('Response:', svgCode.substring(0, 300))
    }
  } catch (error: any) {
    console.log('Error:', error.message)
  }

  console.log('\n\nDone! Check the temp/ folder for generated files.')
  console.log('Open folder:', outputDir)
}

testImageGeneration().catch(console.error)
