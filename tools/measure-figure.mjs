// Mesure la taille réellement affichée des personnages, pour caler le cadre.
//   node tools/measure-figure.mjs
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 8127
const server = spawn(process.execPath, [path.join(root, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' })
process.on('exit', () => server.kill())
await new Promise((r) => setTimeout(r, 700))

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1600))

const m = await page.evaluate(() => {
  const out = {}
  const hero = document.querySelector('#heroFigure svg')
  const cls = document.querySelector('#classFigure svg')
  const r = (n) => {
    if (!n) return null
    const b = n.getBoundingClientRect()
    const bb = n.getBBox()
    return {
      boxCss: Math.round(b.width) + '×' + Math.round(b.height),
      drawn: Math.round(bb.width) + '×' + Math.round(bb.height),
      // hauteur du personnage en % de la hauteur du hero
      pctHero: Math.round((n.getBBox().height / 176) * 100) + ' % du cadre',
    }
  }
  out.hero = r(hero)
  out.classe = r(cls)
  out.viewport = window.innerHeight
  return out
})
console.log(JSON.stringify(m, null, 2))
await browser.close()
server.kill()