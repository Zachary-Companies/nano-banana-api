const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.env.USERPROFILE, '.agentic-loop', '.env') });

const genAI = new GoogleGenerativeAI(process.env.NanoBanana_ApiKey);
const outputDir = path.join(__dirname, 'temp');

async function run() {
  console.log('Generating SVG...');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const result = await model.generateContent(
    'Create an SVG image of a simple yellow smiley face emoji. Return ONLY the SVG code, no markdown or explanation.'
  );

  const text = result.response.text();
  const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);

  if (svgMatch) {
    const filePath = path.join(outputDir, 'smiley_' + Date.now() + '.svg');
    fs.writeFileSync(filePath, svgMatch[0]);
    console.log('SVG saved to:', filePath);

    // Open it
    require('child_process').exec('start "" "' + filePath + '"');
  } else {
    console.log('No SVG found. Response:', text.substring(0, 500));
  }
}

run().catch(console.error);
