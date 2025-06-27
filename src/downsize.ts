import cliProgress from 'cli-progress';
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';

const INPUT_DIR = path.join('out', 'full');
const OUTPUT_DIR = path.join('out', 'small');
const SCALE = 0.07;

async function downsizeImages() {
  await fs.ensureDir(OUTPUT_DIR);
  const files = await fs.readdir(INPUT_DIR);
  const jpgFiles = files.filter((f) => f.toLowerCase().endsWith('.jpg'));

  // Initialize the progress bar
  const bar = new cliProgress.SingleBar({
    format: 'Downsizing |{bar}| {percentage}% || {value}/{total} Files || {filename}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  bar.start(jpgFiles.length, 0, { filename: '' });

  for (const file of jpgFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);
    try {
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) {
        bar.increment(1, { filename: `Skipping ${file}` });
        continue;
      }
      const newWidth = Math.round(metadata.width * SCALE);
      const newHeight = Math.round(metadata.height * SCALE);
      await image.resize(newWidth, newHeight).jpeg({ quality: 85 }).toFile(outputPath);
      bar.increment(1, { filename: file });
    } catch (err) {
      bar.increment(1, { filename: `Error: ${file}` });
    }
  }

  bar.stop();
  console.log('All images downsized!');
}

downsizeImages();
