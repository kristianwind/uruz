/**
 * Generate the PWA icon set (and favicon) with zero image dependencies.
 *
 * A tiny RGBA rasterizer draws the Uruz rune (ᚢ) in rune-gold on the deep
 * night background, then a minimal PNG encoder (Node's built-in zlib + a CRC
 * table) writes real .png files. Re-run with `npm run gen:icons`.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BG = [11, 16, 22, 255]; // #0b1016
const GOLD = [224, 168, 62, 255]; // #e0a83e

// ---- PNG encoder ----------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // Prepend a filter byte (0) to each scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Rasterizer -----------------------------------------------------------
function makeIcon(size: number, padRatio: number): Uint8Array {
  const px = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = BG[0];
    px[i * 4 + 1] = BG[1];
    px[i * 4 + 2] = BG[2];
    px[i * 4 + 3] = BG[3];
  }

  const pad = size * padRatio;
  const w = size - pad * 2;
  const top = pad;
  const bottom = size - pad;
  const stroke = Math.max(2, size * 0.09);

  // Uruz rune ᚢ: tall left vertical, a shoulder across the top, and a shorter
  // right vertical dropping from the shoulder.
  const leftX = pad + w * 0.28;
  const rightX = pad + w * 0.72;
  const shoulderY = top + w * 0.12;

  const segments: [number, number, number, number][] = [
    [leftX, top, leftX, bottom], // left leg (full height)
    [leftX, shoulderY, rightX, shoulderY + w * 0.06], // shoulder
    [rightX, shoulderY + w * 0.06, rightX, top + w * 0.62], // right leg (shorter)
  ];

  const distToSeg = (px_: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    let t = l2 === 0 ? 0 : ((px_ - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.hypot(px_ - cx, py - cy);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let d = Infinity;
      for (const s of segments) d = Math.min(d, distToSeg(x + 0.5, y + 0.5, s[0], s[1], s[2], s[3]));
      // Anti-aliased edge over ~1px.
      const a = Math.max(0, Math.min(1, stroke / 2 - d + 0.5));
      if (a > 0) {
        const i = (y * size + x) * 4;
        px[i] = Math.round(BG[0] * (1 - a) + GOLD[0] * a);
        px[i + 1] = Math.round(BG[1] * (1 - a) + GOLD[1] * a);
        px[i + 2] = Math.round(BG[2] * (1 - a) + GOLD[2] * a);
        px[i + 3] = 255;
      }
    }
  }
  return px;
}

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, pad: 0.22 },
  { file: "icon-512.png", size: 512, pad: 0.22 },
  { file: "icon-maskable-512.png", size: 512, pad: 0.3 }, // safe area for maskable
  { file: "apple-touch-icon.png", size: 180, pad: 0.2 },
  { file: "favicon-32.png", size: 32, pad: 0.16 },
];

for (const t of targets) {
  const png = encodePng(t.size, t.size, makeIcon(t.size, t.pad));
  writeFileSync(join(outDir, t.file), png);
  console.log(`  wrote public/icons/${t.file} (${t.size}×${t.size}, ${png.length} B)`);
}
console.log("✔ Icons generated");
