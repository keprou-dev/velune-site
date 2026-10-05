// Vérification visuelle : ouvre le site dans Chrome, parcourt chaque section,
// capture une image par section et remonte les erreurs console.
//
//   node tools/shots.mjs [--width 1440] [--height 900]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, '.shots')
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]),
)
const WIDTH = +(args.width || 1440)
const HEIGHT = +(args.height || 900)
const PORT = +(args.port || 8124)

const CHROME =
  process.env.CHROME_PATH ||
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) =>
    fs.existsSync(p),
  )

const SECTIONS = ['hero', 'univers', 'classes', 'combat', 'monde', 'grimoire', 'bestiaire', 'almanach', 'quetes', 'metiers', 'proprietes', 'social', 'economie', 'heros', 'tripot', 'roadmap', 'rejoindre']

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

const server = spawn(process.execPath, [path.join(root, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' })
const done = (code) => {
  server.kill()
  process.exit(code)
}
process.on('exit', () => server.kill())

await new Promise((r) => setTimeout(r, 700))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
})
const page = await browser.newPage()
page.setDefaultNavigationTimeout(90000)
page.setDefaultTimeout(30000)
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 })

const problems = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ' : ' + m.text())
})
page.on('pageerror', (e) => problems.push('pageerror : ' + e.message))
page.on('requestfailed', (r) => problems.push('requête échouée : ' + r.url()))

await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 1600))

// Le hero d'abord, tel qu'il s'affiche.
await page.screenshot({ path: path.join(out, '00-hero.png') })

for (let i = 0; i < SECTIONS.length; i++) {
  const id = SECTIONS[i]
  const ok = await page.evaluate((sel) => {
    const n = document.getElementById(sel)
    if (!n) return false
    const y = n.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: y, behavior: 'instant' })
    return true
  }, id)
  if (!ok) {
    problems.push('section absente : #' + id)
    continue
  }
  // Laisse les révélations au scroll se déclencher.
  await new Promise((r) => setTimeout(r, 750))
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.screenshot({ path: path.join(out, String(i + 1).padStart(2, '0') + '-' + id + '.png') })
}

// Quelques interactions : classe, modale, palette, tripot.
const interactions = []
async function tryIt(label, fn) {
  try {
    await fn()
    interactions.push('✓ ' + label)
  } catch (e) {
    interactions.push('✗ ' + label + ' — ' + e.message)
    problems.push('interaction ' + label + ' : ' + e.message)
  }
}

await tryIt('changer de classe (Sylvetireur)', async () => {
  await page.evaluate(() => document.querySelectorAll('.class-tab')[2].click())
  await new Promise((r) => setTimeout(r, 600))
  const name = await page.$eval('#classPanel h3', (n) => n.textContent)
  if (name !== 'Sylvetireur') throw new Error('classe affichée : ' + name)
  const joints = await page.$$eval('#classFigure [data-joint]', (n) => n.length)
  if (joints < 8) throw new Error('personnage non assemblé : ' + joints + ' jointures')
})
await page.evaluate(() => {
  const n = document.getElementById('classes')
  window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
})
await new Promise((r) => setTimeout(r, 1000))
await page.evaluate(() => document.querySelectorAll('.class-tab')[1].click())
await new Promise((r) => setTimeout(r, 900))
await page.screenshot({ path: path.join(out, '90-classe-sylvetireur.png') })
await page.evaluate(() => document.querySelectorAll('.class-tab')[3].click())
await new Promise((r) => setTimeout(r, 900))
await page.screenshot({ path: path.join(out, '90b-classe-lieur.png') })
await page.evaluate(() => document.querySelectorAll('.class-tab')[0].click())
await new Promise((r) => setTimeout(r, 700))

await tryIt('ouvrir un sort du grimoire', async () => {
  await page.evaluate(() => {
    const n = document.getElementById('grimoire')
    window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 700))
  await page.evaluate(() => document.querySelectorAll('#grimoireGrid .spell-card')[3].click())
  await new Promise((r) => setTimeout(r, 700))
  const open = await page.$eval('#modal', (n) => n.classList.contains('on'))
  if (!open) throw new Error('la modale ne s’ouvre pas')
})
await page.screenshot({ path: path.join(out, '91-modal-sort.png') })

await tryIt('fermer la modale', async () => {
  await page.click('#modal .modal-close')
  await new Promise((r) => setTimeout(r, 400))
  const open = await page.$eval('#modal', (n) => n.classList.contains('on'))
  if (open) throw new Error('la modale reste ouverte')
})

await tryIt('recherche globale (Ctrl+K)', async () => {
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyK')
  await page.keyboard.up('Control')
  await new Promise((r) => setTimeout(r, 400))
  await page.type('#paletteInput', 'quartz')
  await new Promise((r) => setTimeout(r, 500))
  const n = await page.$$eval('.palette-item', (l) => l.length)
  if (!n) throw new Error('aucun résultat pour « quartz »')
  interactions.push('  → ' + n + ' résultats pour « quartz »')
})
await page.screenshot({ path: path.join(out, '92-palette.png') })
await page.keyboard.press('Escape')

await tryIt('faire tourner les machines du tripot', async () => {
  await page.evaluate(() => {
    const n = document.getElementById('tripot')
    window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 600))
  await page.click('#spinBtn')
  await new Promise((r) => setTimeout(r, 1600))
  const reels = await page.$$eval('#reels .reel', (l) => l.map((n) => n.textContent))
  if (reels.some((t) => !t)) throw new Error('rouleaux vides : ' + JSON.stringify(reels))
  interactions.push('  → rouleaux : ' + reels.join(' '))
})
await page.screenshot({ path: path.join(out, '93-tripot.png') })

await tryIt('filtrer le bestiaire sur les boss', async () => {
  await page.evaluate(() => {
    const n = document.getElementById('bestiaire')
    window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 600))
  await page.evaluate(() => document.querySelector('[data-boss="1"]').click())
  await new Promise((r) => setTimeout(r, 500))
  const n = await page.$$eval('.beast-card', (l) => l.length)
  if (!n) throw new Error('aucun boss affiché')
  interactions.push('  → ' + n + ' boss filtrés')
})

await tryIt('chercher une carte dans l’atlas', async () => {
  await page.evaluate(() => {
    const n = document.getElementById('monde')
    window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
    const i = document.getElementById('mapSearch')
    i.value = 'grotte'
    i.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await new Promise((r) => setTimeout(r, 700))
  const n = await page.$$eval('.map-card', (l) => l.length)
  if (!n) throw new Error('aucune carte trouvée pour « grotte »')
  interactions.push('  → ' + n + ' cartes pour « grotte »')
})
await page.screenshot({ path: path.join(out, '94-atlas-filtre.png') })

// ── La carte du monde : zoom, marqueur, panneau ────────────────────────
await tryIt('carte du monde : ouvrir un domaine', async () => {
  await page.evaluate(() => {
    const n = document.getElementById('monde')
    window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
    document.getElementById('mapSearch').value = ''
    document.getElementById('mapSearch').dispatchEvent(new Event('input', { bubbles: true }))
  })
  await new Promise((r) => setTimeout(r, 900))
  const tiles = await page.$$eval('.wm-tile', (l) => l.length)
  if (tiles < 300) throw new Error('carte du monde vide : ' + tiles + ' tuiles')
  await page.evaluate(() => document.querySelector('#wmPins .wm-pin').click())
  await new Promise((r) => setTimeout(r, 1200))
  const open = await page.$eval('#wmPanel', (n) => n.classList.contains('is-open'))
  if (!open) throw new Error('le panneau du domaine ne s’ouvre pas')
  const name = await page.$eval('#wmPanelInner h4', (n) => n.textContent.trim())
  const thumbs = await page.$$eval('#wmPanelInner .wm-thumb', (l) => l.length)
  interactions.push('  → domaine « ' + name + ' », ' + tiles + ' tuiles, ' + thumbs + ' vignettes')
})
await page.screenshot({ path: path.join(out, '97-carte-domaine.png') })

await tryIt('carte du monde : zoom et recadrage', async () => {
  const before = await page.$eval('#wmZoomLabel', (n) => n.textContent)
  await page.evaluate(() => document.querySelector('[data-zoom="in"]').click())
  await page.evaluate(() => document.querySelector('[data-zoom="in"]').click())
  await new Promise((r) => setTimeout(r, 400))
  const zoomed = await page.$eval('#wmZoomLabel', (n) => n.textContent)
  if (before === zoomed) throw new Error('le zoom ne change pas (' + before + ')')
  await page.evaluate(() => document.getElementById('wmReset').click())
  await new Promise((r) => setTimeout(r, 1100))
  const back = await page.$eval('#wmZoomLabel', (n) => n.textContent)
  interactions.push('  → zoom ' + before + ' → ' + zoomed + ' → ' + back)
})

await tryIt('carte du monde : glisser la carte', async () => {
  const box = await page.$eval('#wmCanvas', (n) => {
    const r = n.parentElement.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.w / 2 - 90, box.y + box.h / 2 - 60, { steps: 12 })
  await page.mouse.up()
  await new Promise((r) => setTimeout(r, 300))
  const moved = await page.$eval('#wmCanvas', (n) => n.style.transform)
  if (!moved || moved === 'none') throw new Error('la carte ne se déplace pas')
})

// ── L'économie : compteurs, transaction ────────────────────────────────
await tryIt('économie : compteurs animés', async () => {
  await page.evaluate(() => {
    const n = document.getElementById('economie')
    window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 2200))
  const vals = await page.$$eval('.econ-cell-value', (l) => l.map((n) => n.textContent.trim()))
  if (vals.some((v) => !v || v === '0' || v === '⬡ 0 ⬡')) throw new Error('compteurs vides : ' + JSON.stringify(vals))
  interactions.push('  → registre : ' + vals.slice(0, 3).join(' · '))
})
await page.screenshot({ path: path.join(out, '98-economie.png') })

await tryIt('économie : une transaction', async () => {
  await page.evaluate(() => document.querySelector('.econ-source').click())
  await new Promise((r) => setTimeout(r, 500))
  const toast = await page.$$eval('.toast', (l) => l.map((n) => n.textContent.trim()))
  if (!toast.length) throw new Error('aucune notification après la transaction')
  interactions.push('  → ' + toast[0].slice(0, 60))
})
await page.screenshot({ path: path.join(out, '99-economie-transaction.png') })

await tryIt('économie : le marché par rareté', async () => {
  await page.evaluate(() => document.querySelector('.econ-tier[data-rarity="legendaire"]').click())
  await new Promise((r) => setTimeout(r, 500))
  const toast = await page.$$eval('.toast', (l) => l.map((n) => n.textContent.trim()))
  if (!toast.some((t) => /Légendaire/.test(t))) throw new Error('la légende ne parle pas du légendaire')
})

// ── Le domaine : acquisition ───────────────────────────────────────────
await tryIt('propriétés : acquérir une maison', async () => {
  await page.evaluate(() => {
    const n = document.getElementById('proprietes')
    window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 1400))
  await page.evaluate(() => document.querySelector('.estate-buy').click())
  await new Promise((r) => setTimeout(r, 900))
  const state = await page.$eval('.estate-card', (n) => ({
    owned: n.classList.contains('is-owned'),
    label: n.querySelector('.estate-buy').textContent,
    disabled: n.querySelector('.estate-buy').disabled,
  }))
  if (!state.owned || !state.disabled || state.label !== 'Possédé') {
    throw new Error('la maison n’est pas marquée possédée : ' + JSON.stringify(state))
  }
  interactions.push('  → ' + state.label)
})
await page.screenshot({ path: path.join(out, '9a-proprietes.png') })

// ── La fiche du héros ─────────────────────────────────────────────────
await tryIt('fiche du héros : niveau et équipement', async () => {
  await page.evaluate(() => {
    const n = document.getElementById('heros')
    window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 2200))
  const lvl = await page.$eval('#profileLevel', (n) => n.textContent.trim())
  if (!/^1[12]\d$/.test(lvl)) throw new Error('niveau affiché : ' + lvl)
  const gear = await page.$$eval('#profileGear .gear-slot', (l) => l.length)
  if (gear < 3) throw new Error('équipement vide')
  await page.evaluate(() => document.querySelector('#profileGear .gear-slot').click())
  await new Promise((r) => setTimeout(r, 700))
  const open = await page.$eval('#modal', (n) => n.classList.contains('on'))
  if (!open) throw new Error('la fiche d’objet ne s’ouvre pas')
  await page.click('#modal .modal-close')
  interactions.push('  → niveau ' + lvl + ', ' + gear + ' pièces d’équipement')
})
await page.screenshot({ path: path.join(out, '9b-heros.png') })

// ── Les transitions ne doivent jamais bloquer un clic ──────────────────
// ── Rien ne doit rester coincé dans l’état « avant animation » ──────────
// C’est le piège classique d’une animation lancée au mauvais moment sur la
// timeline racine : l’élément garde son état initial et devient invisible.
await tryIt('aucun élément bloqué dans son état initial', async () => {
  const stuck = []
  for (const id of ['hero', 'monde', 'economie', 'proprietes', 'heros']) {
    await page.evaluate((s) => document.getElementById(s).scrollIntoView({ behavior: 'instant' }), id)
    await new Promise((r) => setTimeout(r, 2600))
    const bad = await page.evaluate((sel) => {
      const out = []
      for (const n of document.querySelectorAll(sel)) {
        const r = n.getBoundingClientRect()
        if (!r.width || !r.height) continue
        if (r.bottom < 0 || r.top > window.innerHeight) continue
        const cs = getComputedStyle(n)
        if (+cs.opacity < 0.9) out.push((n.className || n.tagName) + ' opacite ' + cs.opacity)
      }
      return out
    }, '.wm-tile, .wm-pin, .econ-cell, .econ-source, .econ-tier, .estate-card, .pstat, .badge, .rank-row, .sheet-panel, .gear-slot')
    if (bad.length) stuck.push('#' + id + ' → ' + bad.slice(0, 3).join(', ') + (bad.length > 3 ? ' (+' + (bad.length - 3) + ')' : ''))
  }
  const navTop = await page.evaluate(() => document.getElementById('nav').getBoundingClientRect().top)
  if (navTop < -2) stuck.push('la navigation est hors ecran (top ' + Math.round(navTop) + ')')
  if (stuck.length) throw new Error(stuck.join(' | '))
  interactions.push('  → 5 sections balayées, rien de bloqué, navigation en place')
})

await tryIt('le mouvement ne bloque pas les clics', async () => {
  // On regarde seulement ce qui est à l'écran : hors fenêtre, elementFromPoint
  // ne peut rien renvoyer et le test ne voudrait plus rien dire.
  const SEL = '.btn, .filt, .estate-buy, .econ-tier, .econ-source, .map-card, .gear-slot, .spell-chip, .wm-pin, .nav-links a'
  let checked = 0
  for (const id of ['monde', 'heros', 'economie', 'proprietes']) {
    await page.evaluate((s) => document.getElementById(s).scrollIntoView({ behavior: 'instant' }), id)
    await new Promise((r) => setTimeout(r, 900))
    const res = await page.evaluate((sel) => {
      const nodes = [...document.querySelectorAll(sel)]
      let tested = 0
      let blocked = 0
      for (const n of nodes) {
        const r = n.getBoundingClientRect()
        if (!r.width || !r.height) continue
        // On teste le centre : c'est lui qu'un pointeur viserait.
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        if (cy < 4 || cy > window.innerHeight - 4 || cx < 4 || cx > window.innerWidth - 4) continue
        tested++
        const hit = document.elementFromPoint(cx, cy)
        if (!hit || !(n === hit || n.contains(hit) || hit.contains(n))) blocked++
      }
      return { tested, blocked }
    }, SEL)
    checked += res.tested
    if (res.blocked) throw new Error('#' + id + ' : ' + res.blocked + '/' + res.tested + ' éléments cliquables couverts')
  }
  if (checked < 10) throw new Error('trop peu d’éléments testés : ' + checked)
  interactions.push('  → ' + checked + ' éléments cliquables à l’écran, aucun couvert')
})

// ── La page ne doit pas pousser de vide sous le pied ───────────────────
const blank = await page.evaluate(() => {
  const h = document.documentElement.scrollHeight
  const last = document.querySelector('.footer')
  return { h, footerBottom: last ? Math.round(last.getBoundingClientRect().bottom + window.scrollY) : 0 }
})
if (blank.h - blank.footerBottom > 2500) {
  problems.push('vide de ' + (blank.h - blank.footerBottom) + ' px sous le pied de page')
}
interactions.push('  → pied de page à ' + blank.footerBottom + ' px sur ' + blank.h + ' (' + (blank.h - blank.footerBottom) + ' px de marge)')

// Mobile
await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1400))
await page.screenshot({ path: path.join(out, '95-mobile-hero.png') })
await page.evaluate(() => document.getElementById('classes').scrollIntoView({ behavior: 'instant' }))
await new Promise((r) => setTimeout(r, 1000))
await page.screenshot({ path: path.join(out, '96-mobile-classes.png') })
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
if (overflow > 2) problems.push('débordement horizontal sur mobile : ' + overflow + ' px')
interactions.push(overflow <= 2 ? '✓ pas de débordement horizontal sur mobile' : '✗ débordement de ' + overflow + ' px')

for (const [id, file] of [['proprietes', '96b-mobile-proprietes.png'], ['economie', '96c-mobile-economie.png'], ['heros', '96d-mobile-heros.png'], ['monde', '96e-mobile-monde.png']]) {
  await page.evaluate((s) => document.getElementById(s).scrollIntoView({ behavior: 'instant' }), id)
  await new Promise((r) => setTimeout(r, 1400))
  await page.screenshot({ path: path.join(out, file) })
  const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (o > 2) problems.push('débordement horizontal sur mobile dans #' + id + ' : ' + o + ' px')
}

// ── Respect de prefers-reduced-motion ─────────────────────────────────
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 })
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3200))
const calm = await page.evaluate(() => {
  const vis = (s) => {
    const n = document.querySelector(s)
    if (!n) return null
    return +getComputedStyle(n).opacity
  }
  return {
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    hero: vis('.hero-title'),
    sub: vis('.hero-sub'),
    loader: vis('#loader'),
    econCells: [...document.querySelectorAll('.econ-cell')].length,
    tiles: document.querySelectorAll('.wm-tile').length,
  }
})
await page.screenshot({ path: path.join(out, '9c-reduced-motion.png') })
if (calm.reduced && (calm.hero < 0.99 || calm.sub < 0.99)) {
  problems.push('avec mouvement réduit, du contenu reste masqué (titre ' + calm.hero + ', sous-titre ' + calm.sub + ')')
}
if (calm.reduced && calm.tiles < 300) problems.push('avec mouvement réduit, la carte du monde est vide')
interactions.push(
  calm.reduced
    ? '✓ mouvement réduit : contenu visible (' + (calm.hero >= 0.99 ? 'titre' : 'titre masqué') + ', ' + calm.tiles + ' tuiles)'
    : '· la préférence de mouvement réduit n’a pas été appliquée par le navigateur',
)

// Métriques de rendu
const metrics = await page.evaluate(() => ({
  sections: document.querySelectorAll('main > section[id]').length,
  images: document.images.length,
  broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
  height: document.documentElement.scrollHeight,
  // Combien d'éléments animés tournent en ce moment : la performance ne doit
  // pas dépendre d'une pluie de GIF, mais d'une poignée de transforms.
  animating: document.getAnimations ? document.getAnimations().length : -1,
}))

await browser.close()

console.log('── Interactions ─────────────────────────────────')
interactions.forEach((i) => console.log('  ' + i))
console.log('\n── Console & réseau ─────────────────────────────')
if (problems.length) [...new Set(problems)].forEach((p) => console.log('  ✗ ' + p.slice(0, 180)))
else console.log('  ✓ aucune erreur, aucune requête échouée')
console.log('\n── Rendu ────────────────────────────────────────')
console.log(`  ${metrics.sections} sections · ${metrics.images} images · ${metrics.broken} image(s) cassée(s) · page haute de ${metrics.height} px`)
console.log(`  ${metrics.animating} animation(s) active(s) au dernier rendu`)
console.log(`  captures dans ${path.relative(root, out)}/`)

done(problems.length || metrics.broken ? 1 : 0)