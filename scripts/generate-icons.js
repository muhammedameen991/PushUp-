import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPNG(width, height, r, g, b) {
  // Simple solid/bordered PNG generator
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // Deflate
  ihdrData.writeUInt8(0, 11); // Filter 0
  ihdrData.writeUInt8(0, 12); // Interlace 0
  const ihdr = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded container / badge
      if (dist <= radius) {
        // Terracotta base #C5684D
        let pr = r;
        let pg = g;
        let pb = b;
        let pa = 255;

        // Draw simple push-up bar graphic in white
        const ny = y / height;
        const nx = x / width;
        // Floor line
        if (ny >= 0.72 && ny <= 0.76 && nx >= 0.2 && nx <= 0.8) {
          pr = 255; pg = 255; pb = 255;
        }
        // Body plank line
        const plankY = 0.52 + (nx - 0.25) * 0.35;
        if (nx >= 0.25 && nx <= 0.75 && Math.abs(ny - plankY) < 0.04) {
          pr = 255; pg = 255; pb = 255;
        }
        // Head
        const hdx = nx - 0.22;
        const hdy = ny - 0.48;
        if (hdx * hdx + hdy * hdy <= 0.05 * 0.05) {
          pr = 255; pg = 255; pb = 255;
        }
        // Arrow pointing up
        if (ny >= 0.25 && ny <= 0.38 && Math.abs(nx - 0.5) <= 0.02) {
          pr = 255; pg = 255; pb = 255;
        }
        if (ny >= 0.23 && ny <= 0.30 && Math.abs(Math.abs(nx - 0.5) - (ny - 0.23) * 0.9) < 0.02) {
          pr = 255; pg = 255; pb = 255;
        }

        rawData[pxOffset] = pr;
        rawData[pxOffset + 1] = pg;
        rawData[pxOffset + 2] = pb;
        rawData[pxOffset + 3] = pa;
      } else {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const outDir = path.resolve('public');
fs.mkdirSync(outDir, { recursive: true });

// Terracotta: #C5684D -> 197, 104, 77
const png192 = createPNG(192, 192, 197, 104, 77);
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), png192);

const png512 = createPNG(512, 512, 197, 104, 77);
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), png512);

const png180 = createPNG(180, 180, 197, 104, 77);
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), png180);

console.log('PWA PNG icons generated successfully in public/');
