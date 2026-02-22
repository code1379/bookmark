const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function resizeIcon() {
  const inputPath = path.join(__dirname, 'app', 'icon.png');
  const outputPath = path.join(__dirname, 'app', 'icon-small.png');
  
  await sharp(inputPath)
    .resize(32, 32)
    .toFile(outputPath);
  
  fs.unlinkSync(inputPath);
  fs.renameSync(outputPath, inputPath);
  
  console.log('Icon resized to 32x32');
}

resizeIcon().catch(console.error);
