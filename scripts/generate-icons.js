'use strict';
/**
 * Generates all required icon assets using only built-in Node.js modules.
 * Outputs:
 *   assets/icon.png       — 256×256, main app icon
 *   assets/icon.ico       — Windows ICO (embeds the 256×256 PNG)
 *   assets/tray-icon.png  — 32×32, system tray icon
 *
 * Design: purple (#a78bfa) network/proxy symbol on dark (#0d0d0d) background.
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 (required by PNG format) ───────────────────────────────────────────
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG builder ───────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const lenB  = Buffer.alloc(4);  lenB.writeUInt32BE(data.length);
  const crcB  = Buffer.alloc(4);  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function buildPNG(width, height, pixels /* RGBA Uint8Array */) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit depth, RGBA colour type

  // Raw scanlines: filter byte (0 = None) + RGBA per pixel
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
      raw[dst+3] = pixels[src+3];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO builder (embeds PNG — supported on Windows Vista+) ───────────────────
function buildICO(pngBuf, size) {
  const hdr = Buffer.alloc(6);
  hdr.writeUInt16LE(0, 0); // reserved
  hdr.writeUInt16LE(1, 2); // type: 1 = ICO
  hdr.writeUInt16LE(1, 4); // 1 image

  const dir = Buffer.alloc(16);
  dir[0] = size >= 256 ? 0 : size; // 0 means 256
  dir[1] = size >= 256 ? 0 : size;
  dir[2] = 0; dir[3] = 0;          // colorCount, reserved
  dir.writeUInt16LE(1,  4);        // planes
  dir.writeUInt16LE(32, 6);        // bit depth
  dir.writeUInt32LE(pngBuf.length, 8);
  dir.writeUInt32LE(22, 12);       // data offset: 6 (hdr) + 16 (dir)

  return Buffer.concat([hdr, dir, pngBuf]);
}

// ── Pixel drawing ─────────────────────────────────────────────────────────────
const BG     = [13,  13,  13,  255]; // #0d0d0d
const PURPLE = [167, 139, 250, 255]; // #a78bfa

/**
 * 256×256 app icon:
 *  – Dark rounded square background
 *  – Outer purple ring
 *  – 4 spokes connecting ring to inner circle
 *  – Filled purple inner circle
 */
function drawAppIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const outerR      = size * 0.44;
  const outerRingIn = size * 0.39;
  const innerR      = size * 0.155;
  const spokeHW     = size * 0.028; // half-width of each spoke
  const cornerR     = size * 0.14;  // rounded corners of background square

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx   = x - cx;
      const dy   = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i    = (y * size + x) * 4;

      // Rounded-square background clip
      const bx = Math.abs(dx) - (size * 0.5 - cornerR);
      const by = Math.abs(dy) - (size * 0.5 - cornerR);
      const inBg = bx <= 0 || by <= 0 ||
                   Math.sqrt(Math.max(bx, 0) ** 2 + Math.max(by, 0) ** 2) <= cornerR;

      if (!inBg) {
        // Fully transparent outside rounded square
        px[i] = px[i+1] = px[i+2] = px[i+3] = 0;
        continue;
      }

      let col = BG;

      if (dist >= outerRingIn && dist <= outerR) {
        col = PURPLE;                          // outer ring
      } else if (dist <= innerR) {
        col = PURPLE;                          // inner filled circle
      } else if (dist > innerR && dist < outerRingIn) {
        // Spokes: 4 narrow bands aligned to axes
        if (Math.abs(dx) <= spokeHW || Math.abs(dy) <= spokeHW) col = PURPLE;
      }

      px[i] = col[0]; px[i+1] = col[1]; px[i+2] = col[2]; px[i+3] = col[3];
    }
  }
  return px;
}

/**
 * 32×32 tray icon: solid purple circle on transparent background.
 * Kept simple so it reads clearly at small size.
 */
function drawTrayIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r  = size * 0.43;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx   = x - cx;
      const dy   = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i    = (y * size + x) * 4;

      if (dist <= r) {
        px[i] = PURPLE[0]; px[i+1] = PURPLE[1]; px[i+2] = PURPLE[2]; px[i+3] = 255;
      }
      // else: transparent (all zeros from alloc)
    }
  }
  return px;
}

// ── Generate & write ──────────────────────────────────────────────────────────
const assetsDir = path.join(__dirname, '../assets');
fs.mkdirSync(assetsDir, { recursive: true });

console.log('Generating icons…\n');

const icon256px  = drawAppIcon(256);
const icon256png = buildPNG(256, 256, icon256px);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), icon256png);
console.log('  ✓  assets/icon.png       (256×256)');

const iconIco = buildICO(icon256png, 256);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), iconIco);
console.log('  ✓  assets/icon.ico       (256×256, PNG-in-ICO)');

const tray32px  = drawTrayIcon(32);
const tray32png = buildPNG(32, 32, tray32px);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), tray32png);
console.log('  ✓  assets/tray-icon.png  (32×32)');

console.log('\nDone.');
console.log('Note: macOS distribution also needs assets/icon.icns');
console.log('      Convert icon.png → icon.icns at cloudconvert.com if needed.');
