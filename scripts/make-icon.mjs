import sharp from "sharp"
import { readFileSync } from "fs"

const SRC = String.raw`C:\Users\alon4\OneDrive\Desktop\יומן מסחר\פברואר (3).png`
const OUT_ICON  = String.raw`C:\Users\alon4\OneDrive\Desktop\יומן מסחר\security-journal\app\icon.png`
const OUT_APPLE = String.raw`C:\Users\alon4\OneDrive\Desktop\יומן מסחר\security-journal\app\apple-icon.png`
const SIZE = 512

// White circle on transparent — white pixels are kept, transparent pixels are clipped
const mask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE/2}" cy="${SIZE/2}" r="${SIZE/2}" fill="white"/></svg>`
)

const base = await sharp(SRC)
  .resize(SIZE, SIZE, { fit: "cover" })
  .ensureAlpha()
  .toBuffer()

const circular = await sharp(base)
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer()

await sharp(circular).toFile(OUT_ICON)
await sharp(circular).toFile(OUT_APPLE)

console.log(`Written ${SIZE}x${SIZE} circular PNG to icon.png and apple-icon.png`)
