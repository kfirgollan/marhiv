// Regenerate Marhiv's PNG brand assets from the SVG sources.
//
//   npm i @resvg/resvg-js --no-save
//   node assets/brand/render.mjs
//
// resvg-js is a pure-Rust renderer: no system libraries, honors transparency
// and aspect ratio. SVG is the source of truth; this only rasterizes it.
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))

function render(svg, out, width) {
  const r = new Resvg(readFileSync(join(dir, svg), 'utf8'), {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true },
  })
  writeFileSync(join(dir, out), r.render().asPng())
  console.log(`${out}  (${width}px)`)
}

// App / extension icons — simplified mark, legible down to 16px, transparent corners.
for (const s of [16, 32, 48, 128, 256, 512]) {
  render('marhiv-icon.svg', `icons/icon-${s}.png`, s)
}
// Detailed mark for marketing surfaces.
render('marhiv-mark.svg', 'marhiv-mark-512.png', 512)
render('marhiv-mark.svg', 'marhiv-mark-1024.png', 1024)
// Horizontal lockup (760×200 @2x).
render('marhiv-wordmark.svg', 'marhiv-wordmark.png', 1520)
// Social / Open Graph card (1200×630).
render('marhiv-social.svg', 'marhiv-social.png', 1200)
