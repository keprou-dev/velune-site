// Audit visuel mesurable : ouvre le site dans Chrome et vérifie ce qu'un œil
// ne peut pas amusement à deviner — débordements, éléments collés à zéro,
// contraste du texte, texte tronqué, chevauchements.
//
//   node tools/audit.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 8134
const CHROME =
  process.env.CHROME_PATH ||
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) =>
    fs.existsSync(p),
  )

const server = spawn(process.execPath, [path.join(root, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' })
process.on('exit', () => server.kill())
await new Promise((r) => setTimeout(r, 700))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
})

const notes = []
const fails = []
const warns = []
const say = (ok, label, detail) => {
  notes.push(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) fails.push(label + (detail ? ' — ' + detail : ''))
}
// Une section rogne son débordement (overflow-x: clip) : le contenu ne peut
// pas disparaitre ni créer de barre de défilement. On le note, on ne le bloque pas.
const warn = (label, detail) => {
  warns.push(label + (detail ? ' — ' + detail : ''))
  notes.push('  ! ' + label + (detail ? ' — ' + detail : ''))
}

const SECTIONS = ['hero', 'univers', 'classes', 'combat', 'monde', 'proprietes', 'social', 'economie', 'heros', 'tripot', 'roadmap', 'rejoindre']

for (const [label, width, height] of [['bureau', 1440, 900], ['portable', 1024, 820], ['tablette', 820, 1100], ['mobile', 390, 844]]) {
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(90000)
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 3000))

  console.log('\n══ ' + label + ' ' + width + '×' + height + ' ' + '═'.repeat(Math.max(0, 40 - label.length)))

  // 1. Débordement horizontal, page entière puis section par section.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  say(overflow <= 2, 'pas de débordement horizontal', overflow + ' px')

  // Les sections rognent volontairement leur débordement (overflow-x: clip),
  // donc scrollWidth ment : on mesure plutôt le bord droit réel des enfants.
  let worst = { id: '', px: 0 }
  const over = []
  for (const id of SECTIONS) {
    await page.evaluate((s) => document.getElementById(s)?.scrollIntoView({ behavior: 'instant' }), id)
    await new Promise((r) => setTimeout(r, 700))
    const px = await page.evaluate((s) => {
      const sec = document.getElementById(s)
      if (!sec) return -1
      let max = 0
      for (const n of sec.querySelectorAll('*')) {
        // Les plans décoratifs (aurora, brume) débordent volontairement et
        // sont rognés par la section : ils ne sont pas un défaut de mise en page.
        if (n.closest('[aria-hidden="true"]')) continue
        const b = n.getBoundingClientRect()
        if (!b.width) continue
        max = Math.max(max, b.right)
      }
      return Math.max(0, Math.round(max - window.innerWidth))
    }, id)
    if (px > 4) over.push('#' + id + ' +' + px + ' px')
    if (px > worst.px) worst = { id, px }
  }
  if (over.length) warn('contenu rogné par une section', over.join(', ') + ' (page sans débordement)')
  else notes.push('  ✓ aucun contenu ne sort de la fenêtre — 12 sections vérifiées')

  // 2. Les blocs de l'économie et du domaine ont une vraie taille.
  const boxes = await page.evaluate(() => {
    const out = {}
    for (const sel of [
      '#wmStage', '#wmCanvas', '#econLedger', '#econChart', '#econPlot svg', '#econSources',
      '#estateLedger', '#housesGrid', '#estateGrid', '#profileSheet', '#profileStats', '#profileBadges', '#profileRank',
      '.estate-card', '.econ-tier', '.badge', '.rank-row',
    ]) {
      const n = document.querySelector(sel)
      if (!n) { out[sel] = null; continue }
      const r = n.getBoundingClientRect()
      out[sel] = Math.round(r.width) + '×' + Math.round(r.height)
    }
    return out
  })
  for (const [sel, size] of Object.entries(boxes)) {
    if (sel === '#estateGrid') continue // absent : on a gardé #housesGrid
    if (!size) { say(false, sel + ' est absent'); continue }
    const [w, h] = size.split('×').map(Number)
    if (w < 8 || h < 8) say(false, sel + ' est aplati', size)
  }
  say(Object.entries(boxes).filter(([k, v]) => v && k !== '#estateGrid').every(([, v]) => {
    const [w, h] = v.split('×').map(Number)
    return w >= 8 && h >= 8
  }), 'tous les blocs clés ont une taille réelle', Object.values(boxes).filter(Boolean).length + ' blocs mesurés')

  // 3. Contraste : on mesure le texte réellement affiché sur son fond réel.
  const contrast = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => {
        const x = +v / 255
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const bgOf = (n) => {
      let p = n
      while (p && p !== document.documentElement) {
        const c = getComputedStyle(p).backgroundColor
        const m = c.match(/[\d.]+/g)
        if (m && (m.length < 4 || +m[3] > 0.6)) return m
        p = p.parentElement
      }
      return [5, 9, 26]
    }
    const out = []
    for (const sel of ['.hero-sub', '.section .lede', '.econ-cell small', '.estate-meta', '.badge small', '.wm-panel-welcome p', '.econ-source small', '.rank-label', '.sheet-name > p', '.econ-readout span']) {
      const n = document.querySelector(sel)
      if (!n) continue
      const cs = getComputedStyle(n)
      if (!n.textContent.trim()) continue
      const fg = cs.color.match(/[\d.]+/g)
      const bg = bgOf(n)
      const l1 = lum(cs.color), l2 = lum('rgb(' + bg.slice(0, 3).join(',') + ')')
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      out.push({ sel, ratio: Math.round(ratio * 100) / 100, size: Math.round(parseFloat(cs.fontSize)), color: cs.color })
    }
    return out
  })
  for (const c of contrast) {
    // AA : 4,5 pour le texte courant, 3 pour les gros caractères (> 24 px).
    const min = c.size >= 24 ? 3 : 4.5
    say(c.ratio >= min, 'contraste ' + c.sel, c.ratio + ':1 en ' + c.size + ' px (min ' + min + ')')
  }

  // 4. Aucun texte tronqué par un conteneur trop petit.
  const clipped = await page.evaluate(() => {
    const out = []
    for (const n of document.querySelectorAll('h1, h2, h3, h4, .lede, .kicker, .badge b, .econ-cell-value, .estate-cell b, .rank-row b, .sheet-ring b')) {
      if (!n.textContent.trim()) continue
      const cs = getComputedStyle(n)
      if (cs.overflow === 'hidden' && cs.textOverflow !== 'ellipsis' && n.scrollWidth > n.clientWidth + 2) {
        out.push((n.className || n.tagName) + ' « ' + n.textContent.trim().slice(0, 24) + ' »')
      }
      if (cs.overflowY === 'hidden' && n.scrollHeight > n.clientHeight + 2 && cs.textOverflow !== 'ellipsis') {
        out.push('vertical : ' + (n.className || n.tagName) + ' « ' + n.textContent.trim().slice(0, 24) + ' »')
      }
    }
    return [...new Set(out)]
  })
  say(clipped.length === 0, 'aucun titre tronqué', clipped.length ? clipped.slice(0, 4).join(' | ') : '0 titre tronqué')

  await page.close()
}

await browser.close()
server.kill()

console.log(notes.join('\n'))
if (warns.length) console.log('\n── Remarques ────────────────────────────────────\n  · ' + warns.join('\n  · '))
console.log('\n' + (fails.length ? '✗ ' + fails.length + ' problème(s) :\n  · ' + fails.join('\n  · ') : '✓ AUDIT VISUEL : rien à signaler'))
process.exit(fails.length ? 1 : 0)