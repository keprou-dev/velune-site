// Compare les personnages assemblés par le site avec la planche de référence
// produite par le jeu lui-même (tools/art/figure.mjs).
//
//   node tools/compare-figure.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const GAME = 'C:/Users/kepro/Desktop/velune'
const out = path.join(root, '.shots')
const PORT = 8126
fs.mkdirSync(out, { recursive: true })

const server = spawn(process.execPath, [path.join(root, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' })
process.on('exit', () => server.kill())
await new Promise((r) => setTimeout(r, 700))

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1000, height: 340, deviceScaleFactor: 2 })
await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1600))

// Une planche des quatre classes, assemblée exactement comme sur le site.
// On ne touche pas au body : les <symbol> vivent dedans.
await page.evaluate(() => {
  const strip = document.createElement('div')
  strip.id = 'strip'
  strip.style.cssText =
    'position:fixed;inset:0;z-index:99999;display:flex;gap:0;background:#6FA544;align-items:flex-end'
  document.body.appendChild(strip)
  for (const c of window.VELUNE.classes) {
    const cell = document.createElement('div')
    cell.style.cssText = 'width:250px;height:340px;display:grid;place-items:center'
    strip.appendChild(cell)
    window.VeluneRig.mount(cell, { look: c.look, label: c.name, hideCape: false, animate: false })
  }
})
await new Promise((r) => setTimeout(r, 900))
const rendered = await page.evaluate(() =>
  [...document.querySelectorAll('#strip svg use')].filter((u) => u.getBoundingClientRect().width > 1).length,
)
console.log('Pièces effectivement rendues :', rendered, '/', await page.evaluate(() => document.querySelectorAll('#strip svg use').length))
await page.screenshot({ path: path.join(out, 'fig-site.png') })
await browser.close()
server.kill()

// La planche du jeu : 4 premières cellules de figures-front.png.
const refPath = path.join(GAME, 'tools/art/out/figures-front.png')
if (!fs.existsSync(refPath)) {
  console.log('Planche de référence absente — lancez d’abord :')
  console.log('  cd ' + GAME + ' && node tools/art/figure.mjs 3 front')
  process.exit(2)
}
const meta = await sharp(refPath).metadata()
const cellW = Math.round(110 * 3) // le script du jeu rend à l’échelle 3
const cellH = Math.round(150 * 3)
const cells = []
for (let i = 0; i < 4; i++) {
  const buf = await sharp(refPath)
    .extract({ left: i * cellW + 20, top: 20, width: cellW - 20, height: cellH - 60 })
    .resize(250, 320, { fit: 'contain', background: '#6FA544' })
    .toBuffer()
  cells.push(buf)
}
const ref = await sharp({ create: { width: 1000, height: 320, channels: 3, background: '#6FA544' } })
  .composite(cells.map((input, i) => ({ input, left: i * 250, top: 0 })))
  .png()
  .toBuffer()
await sharp(ref).toFile(path.join(out, 'fig-jeu.png'))

const site = await sharp(path.join(out, 'fig-site.png')).resize(1000).png().toBuffer()
const compare = await sharp({ create: { width: 1000, height: 660, channels: 3, background: '#0a1328' } })
  .composite([
    { input: ref, left: 0, top: 0 },
    { input: site, left: 0, top: 340 },
  ])
  .jpeg({ quality: 82 })
  .toBuffer()
fs.writeFileSync(path.join(out, 'fig-comparaison.jpg'), compare)

console.log('Planche du jeu   : .shots/fig-jeu.png')
console.log('Planche du site  : .shots/fig-site.png')
console.log('Comparaison      : .shots/fig-comparaison.jpg  (haut = jeu, bas = site)')