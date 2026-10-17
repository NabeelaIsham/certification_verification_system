// Requires npm ci in both Backend (sharp) and Frontend (SVGO).
const fs = require('fs/promises');
const path = require('path');
const { createRequire } = require('module');
const sharp = require('sharp');
const frontendRequire = createRequire(path.resolve(__dirname, '../../Frontend/package.json'));
const { optimize } = frontendRequire('svgo');

async function run() {
  for (const name of ['favicon.svg', 'certiverxia-logo.svg']) {
    const file = path.resolve(__dirname, '../../Frontend/public', name);
    const original = await fs.readFile(file, 'utf8');
    if (!original.includes('<mask')) {
      console.log(`${name}: already simplified`);
      continue;
    }
    const { width, height } = await sharp(Buffer.from(original)).metadata();
    // These exports contain raster art, not vector paths. Flatten redundant masks
    // at their declared display resolution, preserving transparency and layout.
    const png = await sharp(Buffer.from(original)).png({ compressionLevel: 9 }).toBuffer();
    const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
    const result = optimize(source, { path: file, multipass: true }).data;
    const before = await sharp(Buffer.from(original)).ensureAlpha().raw().toBuffer();
    const after = await sharp(Buffer.from(result)).ensureAlpha().raw().toBuffer();
    // Cairo's alpha round-trip can differ by one channel value out of 255.
    if (before.length !== after.length || before.some((value, index) => Math.abs(value - after[index]) > 1)) {
      throw new Error(`Optimization changed rendered pixels beyond rounding tolerance: ${name}`);
    }
    if (Buffer.byteLength(result) < Buffer.byteLength(original)) await fs.writeFile(file, result);
    console.log(`${name}: ${Buffer.byteLength(original)} -> ${Math.min(Buffer.byteLength(result), Buffer.byteLength(original))} bytes; rendered channels differ by at most 1/255`);
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
