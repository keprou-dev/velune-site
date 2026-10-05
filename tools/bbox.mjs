// Mesure la boîte englobante réelle des personnages assemblés, pour caler
// la viewBox du SVG sur ce qui est vraiment dessiné.
//   node tools/bbox.mjs
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 8125
const server = spawn(process.execPath, [path.join(root, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' })
process.on('exit', () => server.kill())
await new Promise((r) => setTimeout(r, 600))

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))

const boxes = await page.evaluate(() => {
  const out = {}
  for (const look of ['gardelame', 'arcaniste', 'sylvetireur', 'lieur']) {
    window.VeluneRig.mount(document.createElement('div'), { look })
    const host = document.createElement('div')
    host.style.cssText = 'position:absolute;left:-9999px;top:0'
    document.body.appendChild(host)
    window.VeluneRig.mount(host, { look, hideCape: false, animate: false })
    const svg = host.querySelector('svg')
    const b = svg.getBBox()
    out[look] = { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }
    host.remove()
  }
  return out
})
console.log(JSON.stringify(boxes, null, 2))
await browser.close()
server.kill()