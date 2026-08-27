// Genererer appens ikoner (til hjemmeskærm og PWA-manifest) som rene PNG-
// filer, uden nogen ekstern billed-afhængighed - kun Node's indbyggede
// "zlib" bruges til at komprimere billeddataene, sådan som PNG-formatet
// kræver. Kør scriptet igen, hvis du vil ændre farven eller designet:
//
//   node scripts/generate-icons.mjs
//
// Designet her skal altid matche public/icons/logo.svg (brugt som favicon) -
// to "stablede" kort med et sol/bjerg-billedsymbol foran, i appens rolige
// farvepalet. Ændrer du det ene, så ret det andet til at matche.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HER = dirname(fileURLToPath(import.meta.url))
const IKON_MAPPE = join(HER, '..', 'public', 'icons')

const BAGGRUND = [0x5b, 0x7f, 0xa6] // #5B7FA6 - rolig blå, samme som "Basis"-kategorien
const BAGVED_KORT = [0xdd, 0xd5, 0xc7] // #DDD5C7 - samme varme kant-farve som resten af appen
const FORREST_KORT = [0xfb, 0xf9, 0xf4] // #FBF9F4 - appens kort-baggrund
const SOL = [0xb4, 0x48, 0x3f] // #B4483F - samme dæmpede rød som "Slet"-knapper
const BJERG = [0x2e, 0x2a, 0x25] // #2E2A25 - appens mørke tekstfarve
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

// Fylder en vilkårlig polygon (bruges til bjerg-symbolet, som har to takker
// og dermed 5 hjørnepunkter) via "ray casting": et punkt er inde i figuren,
// hvis en vandret linje fra punktet krydser polygonens kant et ulige antal
// gange.
function fyldPolygon(pixels, size, punkter, farve) {
  const minX = Math.floor(Math.min(...punkter.map((p) => p[0])))
  const maxX = Math.ceil(Math.max(...punkter.map((p) => p[0])))
  const minY = Math.floor(Math.min(...punkter.map((p) => p[1])))
  const maxY = Math.ceil(Math.max(...punkter.map((p) => p[1])))

  function erInde(px, py) {
    let inde = false
    for (let i = 0, j = punkter.length - 1; i < punkter.length; j = i++) {
      const [xi, yi] = punkter[i]
      const [xj, yj] = punkter[j]
      const krydser = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
      if (krydser) inde = !inde
    }
    return inde
  }

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      if (erInde(x + 0.5, y + 0.5)) saetPixel(pixels, size, x, y, farve)
    }
  }
}

// Alle koordinater herunder er direkte fra public/icons/logo.svg's
// viewBox (0-512), skaleret med size/512 - se den fil for det "rigtige",
// håndredigerbare design. Denne funktion er bare en pixel-for-pixel
// gentegning af den samme figur, til brug for PNG-ikonerne.
function tegnIkon(size) {
  const s = size / 512
  const pixels = nytLaerred(size)

  // Det bagvedliggende, let forskudte kort
  fyldRundetFirkant(pixels, size, 116 * s, 116 * s, 356 * s, 356 * s, 40 * s, BAGVED_KORT)

  // Det forreste kort
  fyldRundetFirkant(pixels, size, 156 * s, 156 * s, 396 * s, 396 * s, 40 * s, FORREST_KORT)

  // Sol
  fyldCirkel(pixels, size, 232 * s, 232 * s, 24 * s, SOL)

  // Bjerg (to takker, ét sammenhængende omrids)
  fyldPolygon(
    pixels,
    size,
    [
      [176 * s, 356 * s],
      [236 * s, 276 * s],
      [266 * s, 306 * s],
      [306 * s, 246 * s],
      [356 * s, 356 * s],
    ],
    BJERG,
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
