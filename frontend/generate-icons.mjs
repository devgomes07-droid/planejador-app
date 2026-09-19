import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const PRIMARY = [74, 111, 165, 255];
const PRIMARY_DARK = [55, 85, 128, 255];
const WHITE = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let n = 0; n < buffer.length; n++) {
    let c = (crc ^ buffer[n]) & 0xff;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(size, pixelAt) {
  const rowLength = size * 4 + 1;
  const raw = Buffer.alloc(rowLength * size);

  for (let y = 0; y < size; y++) {
    raw[y * rowLength] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x / size, y / size);
      const offset = y * rowLength + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits por canal
  header[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundedRect(u, v, x0, y0, x1, y1, radius) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false;
  const cx = Math.min(Math.max(u, x0 + radius), x1 - radius);
  const cy = Math.min(Math.max(v, y0 + radius), y1 - radius);
  return (u - cx) ** 2 + (v - cy) ** 2 <= radius ** 2;
}

function makeIcon(roundedBackground) {
  return (u, v) => {
    if (roundedBackground && !inRoundedRect(u, v, 0, 0, 1, 1, 0.22)) {
      return TRANSPARENT;
    }

    // Calendário branco
    if (inRoundedRect(u, v, 0.24, 0.26, 0.76, 0.76, 0.05)) {
      // Faixa de cima
      if (v < 0.38) return PRIMARY_DARK;

      // Quadradinhos dos dias (3 colunas x 2 linhas)
      for (let col = 0; col < 3; col++) {
        for (let row = 0; row < 2; row++) {
          const x0 = 0.315 + col * 0.14;
          const y0 = 0.46 + row * 0.14;
          if (inRoundedRect(u, v, x0, y0, x0 + 0.09, y0 + 0.09, 0.015)) {
            return PRIMARY;
          }
        }
      }
      return WHITE;
    }

    return PRIMARY;
  };
}

mkdirSync('public', { recursive: true });

writeFileSync('public/icon-192.png', encodePng(192, makeIcon(true)));
writeFileSync('public/icon-512.png', encodePng(512, makeIcon(true)));
writeFileSync('public/icon-maskable-512.png', encodePng(512, makeIcon(false)));
writeFileSync('public/apple-touch-icon.png', encodePng(180, makeIcon(false)));

console.log('Ícones gerados em public/');