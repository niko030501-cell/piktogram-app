// Genererer appens ikoner (til hjemmeskærm og PWA-manifest) som rene PNG-
// filer, uden nogen ekstern billed-afhængighed - kun Node's indbyggede
// "zlib" bruges til at komprimere billeddataene, sådan som PNG-formatet
// kræver. Kør scriptet igen, hvis du vil ændre farven eller designet:
//
//   node scripts/generate-icons.mjs
//
// Ikonet er bevidst enkelt og roligt: en ensfarvet baggrund med et hvidt
// "billede"-symbol (fotoramme med sol og bjerg) centreret i midten.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HER = dirname(fileURLToPath(import.meta.url))
const IKON_MAPPE = join(HER, '..', 'public', 'icons')

const BAGGRUND = [0x5b, 0x7f, 0xa6] // #5B7FA6 - rolig blå, samme som "Basis"-kategorien
const HVID = [0xff, 0xff, 0xff]

function nytLaerred(size) {
  // RGBA-buffer, én Uint8Array per pixel-række (4 byte pr. pixel)
  const pixels = new Uint8ClampedArray(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = BAGGRUND[0]
    pixels[i * 4 + 1] = BAGGRUND[1]
    pixels[i * 4 + 2] = BAGGRUND[2]
    pixels[i * 4 + 3] = 255
  }
  return pixels
}

function saetPixel(pixels, size, x, y, farve) {
  if (x < 0 || y < 0 || x >= size || y >= size) return
  const i = (y * size + x) * 4
  pixels[i] = farve[0]
  pixels[i + 1] = farve[1]
  pixels[i + 2] = farve[2]
  pixels[i + 3] = 255
}

function fyldRundetFirkant(pixels, size, x0, y0, x1, y1, r, farve) {
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      const indeI = erIRundetFirkant(x + 0.5, y + 0.5, x0, y0, x1, y1, r)
      if (indeI) saetPixel(pixels, size, x, y, farve)
    }
  }
}

function erIRundetFirkant(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false
  const naerX = px < x0 + r ? x0 + r : px > x1 - r ? x1 - r : px
  const naerY = py < y0 + r ? y0 + r : py > y1 - r ? y1 - r : py
  if ((px === naerX) || (py === naerY)) return true // ikke i et hjørne-felt
  return (px - naerX) ** 2 + (py - naerY) ** 2 <= r * r
}

function fyldCirkel(pixels, size, cx, cy, r, farve) {
  for (let y = Math.floor(cy - r); y < Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x < Math.ceil(cx + r); x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) saetPixel(pixels, size, x, y, farve)
    }
  }
}

function fyldTrekant(pixels, size, p1, p2, p3, farve) {
  const minX = Math.floor(Math.min(p1[0], p2[0], p3[0]))
  const maxX = Math.ceil(Math.max(p1[0], p2[0], p3[0]))
  const minY = Math.floor(Math.min(p1[1], p2[1], p3[1]))
  const maxY = Math.ceil(Math.max(p1[1], p2[1], p3[1]))

  function fortegn(a, b, c) {
    return (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1])
  }

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const p = [x + 0.5, y + 0.5]
      const d1 = fortegn(p, p1, p2)
      const d2 = fortegn(p, p2, p3)
      const d3 = fortegn(p, p3, p1)
      const harNeg = d1 < 0 || d2 < 0 || d3 < 0
      const harPos = d1 > 0 || d2 > 0 || d3 > 0
      if (!(harNeg && harPos)) saetPixel(pixels, size, x, y, farve)
    }
  }
}

function tegnIkon(size) {
  const pixels = nytLaerred(size)

  const margin = size * 0.24
  const rammeStr = size - margin * 2
  const radius = size * 0.06
  fyldRundetFirkant(pixels, size, margin, margin, margin + rammeStr, margin + rammeStr, radius, HVID)

  const indreMargin = margin + rammeStr * 0.12
  const indreStr = rammeStr * 0.76
  fyldRundetFirkant(
    pixels,
    size,
    indreMargin,
    indreMargin,
    indreMargin + indreStr,
    indreMargin + indreStr,
    radius * 0.6,
    BAGGRUND,
  )

  const solX = indreMargin + indreStr * 0.28
  const solY = indreMargin + indreStr * 0.32
  const solR = indreStr * 0.11
  fyldCirkel(pixels, size, solX, solY, solR, HVID)

  fyldTrekant(
    pixels,
    size,
    [indreMargin + indreStr * 0.08, indreMargin + indreStr * 0.85],
    [indreMargin + indreStr * 0.4, indreMargin + indreStr * 0.45],
    [indreMargin + indreStr * 0.62, indreMargin + indreStr * 0.68],
    HVID,
  )
  fyldTrekant(
    pixels,
    size,
    [indreMargin + indreStr * 0.62, indreMargin + indreStr * 0.68],
    [indreMargin + indreStr * 0.8, indreMargin + indreStr * 0.5],
    [indreMargin + indreStr * 0.92, indreMargin + indreStr * 0.85],
    HVID,
  )
  fyldTrekant(
    pixels,
    size,
    [indreMargin + indreStr * 0.08, indreMargin + indreStr * 0.85],
    [indreMargin + indreStr * 0.62, indreMargin + indreStr * 0.68],
    [indreMargin + indreStr * 0.92, indreMargin + indreStr * 0.85],
    HVID,
  )

  return pixels
}

// --- Minimal PNG-encoder (kun det appen har brug for: 8-bit RGBA) ---

function crc32(buf) {
  let c
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(pixels, size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type: RGBA
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdr = chunk('IHDR', ihdrData)

  // Hver scanline skal indledes med et filter-byte (0 = "ingen filtrering")
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0
    const pixelStart = y * size * 4
    Buffer.from(pixels.buffer, pixels.byteOffset + pixelStart, size * 4).copy(raw, rowStart + 1)
  }
  const idat = chunk('IDAT', deflateSync(raw))

  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

mkdirSync(IKON_MAPPE, { recursive: true })

for (const size of [180, 192, 512]) {
  const png = encodePNG(tegnIkon(size), size)
  const filnavn = size === 180 ? 'apple-touch-icon-180.png' : `icon-${size}.png`
  writeFileSync(join(IKON_MAPPE, filnavn), png)
  console.log(`Skrev ${filnavn} (${png.length} bytes)`)
}

// Det maskable ikon bruger samme tegning - marginen (24 %) ligger allerede
// pænt inden for det sikre 80 %-område, som Android kan beskære til.
const maskablePng = encodePNG(tegnIkon(512), 512)
writeFileSync(join(IKON_MAPPE, 'icon-512-maskable.png'), maskablePng)
console.log(`Skrev icon-512-maskable.png (${maskablePng.length} bytes)`)
