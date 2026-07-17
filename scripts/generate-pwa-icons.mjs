#!/usr/bin/env node
/**
 * Generate branded / maskable PWA icons for rpapp-pickup (L57).
 * Pure Node zlib PNG writer — no native canvas dependency.
 *
 * Brand: Canva sailor blue (#00203F) + mint plate (#ADEFD1) + navy "P" lettermark.
 * Maskable: lettermark stays inside the center ~80% safe zone.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const BG = [0, 32, 63]; // #00203F sailor blue
const PLATE = [173, 239, 209]; // #ADEFD1 mint
const FG = [0, 32, 63]; // letter on mint plate

/** 5x7 glyph for "P" */
const GLYPH_P = [
  0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000,
];

/**
 * @param {Uint8Array} data
 * @returns {number}
 */
function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c ^= data[i];
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * @param {number} size
 * @param {(x: number, y: number, set: (r: number, g: number, b: number) => void) => void} paint
 * @returns {Buffer}
 */
function encodePngRgb(size, paint) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const px = row + 1 + x * 3;
      paint(x, y, (r, g, b) => {
        raw[px] = r;
        raw[px + 1] = g;
        raw[px + 2] = b;
      });
    }
  }
  const compressed = deflateSync(raw, { level: 9 });

  /** @param {string} type @param {Buffer} payload */
  function chunk(type, payload) {
    const typeBuf = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(payload.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, payload])), 0);
    return Buffer.concat([len, typeBuf, payload, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * @param {number} size
 * @param {boolean} maskable
 * @returns {Buffer}
 */
function renderIcon(size, maskable) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const plateRadius = size * (maskable ? 0.28 : 0.32);
  const glyphScale = size * (maskable ? 0.055 : 0.065);
  const glyphW = 5 * glyphScale;
  const glyphH = 7 * glyphScale;
  const glyphLeft = cx - glyphW / 2;
  const glyphTop = cy - glyphH / 2;

  return encodePngRgb(size, (x, y, set) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const edge = Math.max(Math.abs(dx), Math.abs(dy)) / (size / 2);
    const vignette = Math.min(1, Math.max(0, (edge - 0.72) / 0.28));
    const br = Math.round(BG[0] + 18 * vignette);
    const bg = Math.round(BG[1] + 28 * vignette);
    const bb = Math.round(BG[2] + 36 * vignette);
    set(br, bg, bb);

    if (dist <= plateRadius) {
      set(PLATE[0], PLATE[1], PLATE[2]);
    }

    const gx = Math.floor((x - glyphLeft) / glyphScale);
    const gy = Math.floor((y - glyphTop) / glyphScale);
    if (gx >= 0 && gx < 5 && gy >= 0 && gy < 7) {
      const row = GLYPH_P[gy];
      if (row !== undefined && ((row >> (4 - gx)) & 1) === 1) {
        set(FG[0], FG[1], FG[2]);
      }
    }
  });
}

const targets = [
  { name: 'pwa-192.png', size: 192, maskable: false },
  { name: 'pwa-512.png', size: 512, maskable: false },
  { name: 'pwa-512-maskable.png', size: 512, maskable: true },
];

for (const target of targets) {
  const png = renderIcon(target.size, target.maskable);
  const out = join(publicDir, target.name);
  writeFileSync(out, png);
  const sha = createHash('sha256').update(png).digest('hex').slice(0, 12);
  console.log(`wrote ${target.name} bytes=${png.length} sha256=${sha}`);
}
