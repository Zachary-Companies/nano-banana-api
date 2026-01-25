const { NanoBananaClient } = require('./dist/index.js');

async function run() {
  console.log('Creating client...');
  const client = new NanoBananaClient();

  console.log('Generating PNG image with DALL-E...');
  console.log('This may take a moment...\n');

  try {
    const images = await client.generateImage(
      'A cute cartoon banana with sunglasses surfing on a wave, bright and cheerful',
      {
        size: '1024x1024',
        model: 'dall-e-3',
        quality: 'standard'
      }
    );

    console.log('Image generated successfully!');
    console.log('File saved to:', images[0].filePath);

    // Open the image
    require('child_process').exec('start "" "' + images[0].filePath + '"');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

run();
