const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, '..', 'icons', 'aiinteractionhub.png');
const sizes = [128, 256, 512];

async function ensureDir(dir){
  await fs.promises.mkdir(dir, { recursive: true });
}

async function run(){
  for(const size of sizes){
    const outDir = path.join(__dirname, '..', 'icons', 'hicolor', `${size}x${size}`, 'apps');
    await ensureDir(outDir);
    const outFile = path.join(outDir, 'aiinteractionhub.png');
    try{
      await sharp(input).resize(size, size).toFile(outFile);
      console.log(`Generated ${outFile}`);
    }catch(err){
      console.error(`Failed to generate ${outFile}:`, err.message);
      // fallback: copy original if resize fails
      try{
        await fs.promises.copyFile(input, outFile);
        console.log(`Copied fallback to ${outFile}`);
      }catch(copyErr){
        console.error('Fallback copy also failed:', copyErr.message);
      }
    }
  }
}

run();
