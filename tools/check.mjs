// Vérification sans navigateur : charge le site dans jsdom, exécute les
// scripts, signale toute erreur, vérifie que chaque section est remplie et
// que toutes les ressources référencées existent sur le disque.
//
//   node tools/check.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jsdom from 'jsdom'
import * as acorn from 'acorn'

const { JSDOM, VirtualConsole } = jsdom
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')

const errors = []
const warnings = []

// Analyse syntaxique de chaque script avant de l'exécuter : une faute de
// brackets se voit ici, avec son numéro de ligne, au lieu d'une erreur muette.
console.log('── Syntaxe ─────────────────────────────────────')
for (const rel of [
  'assets/js/site.js',
  'assets/js/modules.js',
  'assets/js/kingdom.js',
  'assets/js/motion.js',
  'assets/js/rig.js',
  'assets/vendor/gsap.min.js',
  'assets/vendor/ScrollTrigger.min.js',
]) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) {
    errors.push('script absent : ' + rel)
    console.log(`  ✗ ${rel.padEnd(34)} absent`)
    continue
  }
  try {
    acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 2022, sourceType: 'script' })
    console.log(`  ✓ ${rel}`)
  } catch (e) {
    errors.push(`syntaxe : ${rel} — ${e.message}`)
    console.log(`  ✗ ${rel.padEnd(34)} ${e.message}`)
  }
}
console.log('')

const vc = new VirtualConsole()
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.message || e)))
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')))
vc.on('warn', (...a) => warnings.push('console.warn: ' + a.join(' ')))
vc.on('log', () => {})

const dom = new JSDOM(html, {
  url: 'http://localhost:8123/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: vc,
})
const win = dom.window
const $ = (s) => win.document.querySelector(s)
const $$ = (s) => [...win.document.querySelectorAll(s)]

// Le socle dont le site a besoin, que jsdom ne fournit pas.
const readFile = (rel) => {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) {
    errors.push('fichier manquant : ' + rel)
    return null
  }
  return fs.readFileSync(file, 'utf8')
}

win.fetch = (url) => {
  const rel = String(url).replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, '')
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) {
    errors.push('404 (fetch) : ' + rel)
    return Promise.reject(new Error('404 ' + rel))
  }
  const body = fs.readFileSync(file)
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body.toString('utf8')),
    json: () => Promise.resolve(JSON.parse(body.toString('utf8'))),
  })
}
class IO {
  constructor(cb) { this.cb = cb }
  observe(n) { this.cb([{ isIntersecting: true, target: n }], this) }
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}
win.IntersectionObserver = IO
win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
win.matchMedia = () => ({
  matches: false, media: '', onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false },
})
win.scrollTo = () => {}
win.Element.prototype.scrollIntoView = () => {}
win.navigator.clipboard = { writeText: () => Promise.resolve() }
win.HTMLCanvasElement.prototype.getContext = () => null
win.requestAnimationFrame = (fn) => win.setTimeout(() => fn(Date.now()), 16)
win.cancelAnimationFrame = (id) => win.clearTimeout(id)

// Exécution des scripts du site, dans l'ordre du HTML.
const SCRIPTS = [
  'assets/js/data.js',
  'assets/js/rig.js',
  'assets/js/site.js',
  'assets/js/modules.js',
  'assets/js/kingdom.js',
]
for (const s of SCRIPTS) {
  const src = readFile(s)
  if (src == null) continue
  try {
    win.eval(src)
  } catch (e) {
    errors.push('à l’exécution de ' + s + ' : ' + e.message)
  }
}

// Laisse les fetch() du squelette se terminer et les figures se monter.
await new Promise((r) => setTimeout(r, 1200))

console.log('── Erreurs ─────────────────────────────────────')
if (errors.length) errors.forEach((e) => console.log('  ✗ ' + e.split('\n')[0]))
else console.log('  ✓ aucune')
if (warnings.length) {
  console.log('── Avertissements ───────────────────────────────')
  ;[...new Set(warnings)].slice(0, 10).forEach((w) => console.log('  ! ' + w.slice(0, 150)))
}

console.log('\n── Sections remplies ────────────────────────────')
const CHECKS = [
  ['#heroStats .hero-fig', 5, 'chiffres du hero'],
  ['#ticker .ticker-item', 10, 'bandeau de chiffres'],
  ['#swatches .swatch', 20, 'palette'],
  ['#elements .element-chip', 6, 'éléments'],
  ['#classTabs .class-tab', 4, 'onglets de classes'],
  ['#classPanel .stat', 6, 'stats de classe'],
  ['#classPanel .spell-chip', 20, 'sortes de classe'],
  ['#isoStage .iso-cell', 40, 'grille isométrique'],
  ['#rules .rule-card', 6, 'règles de combat'],
  ['#bossGrid .boss-card', 11, 'boss'],
  ['#atlasGrid .map-card', 24, 'cartes de l’atlas'],
  ['#grimoireGrid .spell-card', 48, 'grimoire'],
  ['#beastGrid .beast-card', 30, 'bestiaire'],
  ['#almanachGrid .item-card', 60, 'almanach'],
  ['#setsGrid .set-card', 12, 'panoplies'],
  ['#questList .quest', 60, 'quêtes'],
  ['#jobsGrid .job-card', 7, 'métiers'],
  ['#housesGrid .house-card', 8, 'maisons'],
  ['#socialGrid .card', 6, 'fonctions sociales'],
  ['#villagersGrid .card', 18, 'villageois'],
  ['#gameList .game-item', 8, 'jeux du tripot'],
  ['#timeline .tl-item', 40, 'feuille de route'],
  ['#serverGrid .server-card', 3, 'serveurs'],
  ['#betRow .chip', 6, 'mises du tripot'],
  ['#reels .reel', 3, 'rouleaux'],
  ['#chatLog .chat-line', 1, 'discussion'],
  ['#wmLand .wm-tile', 300, 'tuiles de la carte du monde'],
  ['#wmPins .wm-pin', 5, 'marqueurs de domaine'],
  ['#wmPanelInner .kicker', 1, 'panneau de la carte'],
  ['#econLedger .econ-cell', 6, 'registre de l’économie'],
  ['#econSources .econ-source', 5, 'sources de monnaie'],
  ['#econTiers .econ-tier', 5, 'marché par rareté'],
  ['#econPlot .econ-bar', 6, 'barres de richesse'],
  ['#estateLedger .estate-cell', 4, 'registre du domaine'],
  ['#profileStats .pstat', 5, 'statistiques du héros'],
  ['#profileRes .res-chip', 5, 'résistances'],
  ['#profileGear .gear-slot', 3, 'équipement'],
  ['#profileBadges .badge', 6, 'titres gagnés'],
  ['#profileRank .rank-row', 4, 'classement'],
]
let bad = 0
for (const [sel, min, label] of CHECKS) {
  const n = $$(sel).length
  const ok = n >= min
  if (!ok) bad++
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(24)} ${n}${ok ? '' : `  (attendu ≥ ${min})`}`)
}

console.log('\n── Personnages articulés ────────────────────────')
const rigOk = $$('#classPanel #classFigure svg [data-joint]').length
const heroOk = $$('#heroFigure svg [data-joint]').length
const piecesOk = $$('#classFigure use').length
console.log(`  ${rigOk > 8 ? '✓' : '✗'} jointures du héros de classe   ${rigOk}`)
console.log(`  ${heroOk > 8 ? '✓' : '✗'} jointures du héros du hero     ${heroOk}`)
console.log(`  ${piecesOk >= 7 ? '✓' : '✗'} pièces SVG habillées          ${piecesOk}`)
if (rigOk <= 8 || heroOk <= 8 || piecesOk < 7) bad++

console.log('\n── Chiffres injectés depuis les fichiers du jeu ─')
const V = win.VELUNE
if (!V) { console.log('  ✗ window.VELUNE absent'); bad++ } else {
  const flat = (s) => s.replace(/[\s  ]/g, '')
  const pairs = [
    ['#mapsCount', V.counts.maps], ['#spellsCount', V.counts.spells],
    ['#monstersCount', V.counts.monsters], ['#itemsCount', V.counts.items],
    ['#setsCount', V.counts.sets], ['#questsCount', V.counts.quests],
    ['#recipesCount', V.counts.recipes], ['#villagersCount', V.counts.villagers],
    ['#jobsCount', V.counts.jobs], ['#milestonesCount', V.roadmap.length],
  ]
  for (const [sel, n] of pairs) {
    const node = $(sel)
    const shown = node ? flat(node.textContent) : ''
    const want = flat(new Intl.NumberFormat('fr-FR').format(n))
    const ok = shown === want
    if (!ok) bad++
    console.log(`  ${ok ? '✓' : '✗'} ${sel.padEnd(16)} ${shown || '(vide)'}${ok ? '' : `  ≠ ${want}`}`)
  }
}

console.log('\n── Ressources référencées ───────────────────────')
const refs = new Set()
$$('img').forEach((i) => { const s = i.getAttribute('src'); if (s && !s.startsWith('http')) refs.add(s) })
$$('audio').forEach((a) => { const s = a.getAttribute('src'); if (s) refs.add(s) })
V.classes.forEach((c) => refs.add(c.emblem))
V.servers.forEach((s) => refs.add(s.art))
V.monsters.forEach((m) => refs.add(m.art))
V.spells.forEach((s) => refs.add('assets/art/icons/spells/' + s.icon + '.svg'))
V.items.forEach((i) => refs.add('assets/art/icons/items/' + i.icon + '.svg'))
V.houses.forEach((h) => refs.add(h.img))
V.atlas.forEach((r) => r.maps.forEach((m) => refs.add(m.img)))
V.jobs.forEach((j) => refs.add('assets/art/icons/items/' + j.icon + '.svg'))
const missing = [...refs].filter((s) => !fs.existsSync(path.join(root, s)))
console.log(`  ${missing.length ? '✗' : '✓'} ${refs.size} ressources, ${missing.length} manquantes`)
missing.slice(0, 12).forEach((m) => console.log('    · ' + m))
if (missing.length) bad++

const fail = errors.length || bad
console.log(`\n${fail ? '✗ ÉCHEC' : '✓ TOUT PASSE'} — ${errors.length} erreur(s), ${bad} contrôle(s) en échec`)
process.exit(fail ? 1 : 0)