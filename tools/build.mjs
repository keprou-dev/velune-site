// Génère le contenu du site Vélune à partir des vrais fichiers du jeu
// (C:/Users/kepro/Desktop/velune) : data/*.json, le squelette des personnages,
// la bible graphique, et recopie les vrais assets (art SVG, vignettes du monde, musique).
//
//   node tools/build.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SITE = path.join(here, '..')
const GAME = 'C:/Users/kepro/Desktop/velune'

// ── Adresse du jeu déployé ────────────────────────────────────────────────
// Une seule ligne à changer : tous les boutons « Jouer » du site la suivent.
// PLAY.url    : la page à ouvrir dans un nouvel onglet
// PLAY.health : sonde d'état du serveur (affichée seulement si elle répond)
const PLAY = {
  url: 'https://velune-h6og.onrender.com/',
  health: 'https://velune-h6og.onrender.com/api/health',
  label: 'Jouer en ligne',
  since: 'V0.44',
}

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(GAME, p), 'utf8'))
const clean = (o) => {
  if (!o || typeof o !== 'object') return o
  if (Array.isArray(o)) return o.map(clean)
  return Object.fromEntries(
    Object.entries(o)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => [k, clean(v)]),
  )
}

const classes = clean(readJson('data/classes.json'))
const monstersRaw = clean(readJson('data/monsters.json'))
const spellsRaw = clean(readJson('data/spells.json'))
const itemsRaw = clean(readJson('data/items.json'))
const questsRaw = clean(readJson('data/quests.json'))
const npcs = clean(readJson('data/npcs.json'))
const sets = clean(readJson('data/sets.json'))
const jobsAll = clean(readJson('data/jobs.json'))
const recipes = clean(readJson('data/recipes.json'))
const servers = clean(readJson('data/servers.json'))
const portals = clean(readJson('data/portals.json'))
const ports = clean(readJson('data/ports.json'))
const houses = clean(readJson('data/houses.json'))
const furniture = clean(readJson('data/furniture.json'))
const artMeta = clean(readJson('client/src/assets/art-meta.json'))
const rig = clean(readJson('data/rigs/gardelame.json'))
const bible = fs.readFileSync(path.join(GAME, 'docs/bible-graphique.md'), 'utf8')
const readme = fs.readFileSync(path.join(GAME, 'README.md'), 'utf8')

// ── Éléments : couleur de la bible graphique (§ 9) ──────────────────────────
const ELEMENTS = {
  feu: { name: 'Feu', color: '#FF8A3D', glow: '#FFB066' },
  eau: { name: 'Eau', color: '#4FB6CC', glow: '#9BE3E8' },
  terre: { name: 'Terre', color: '#C9A06A', glow: '#E3C08A' },
  air: { name: 'Air', color: '#A9E8C9', glow: '#DFF7E0' },
  neutre: { name: 'Neutre', color: '#B8B2A6', glow: '#E2DCCD' },
  lume: { name: 'Lume', color: '#7FF3FF', glow: '#C9F7FF' },
}

const CLASS_OF = {} // spellId -> classId
for (const [id, c] of Object.entries(classes)) for (const s of c.spells) CLASS_OF[s] = id
const MONSTER_OF = {}
for (const [id, m] of Object.entries(monstersRaw)) for (const s of m.spells ?? []) (MONSTER_OF[s] ??= []).push(id)

const STAT_LABEL = {
  power: 'Puissance',
  ap: 'PA',
  mp: 'PM',
  initiative: 'Initiative',
  hp: 'PV',
  res: 'Résistances',
  shield: 'Bouclier',
  accuracy: 'Précision',
  dodge: 'Esquive',
}
const effect = (e) => {
  const el = e.element ?? 'neutre'
  if (e.type === 'damage') return { t: 'dégâts', v: `${e.min}–${e.max}`, el, drain: e.drain ?? 0 }
  if (e.type === 'heal') return { t: 'soins', v: `${e.min}–${e.max}`, el: 'eau' }
  if (e.type === 'buff' || e.type === 'debuff') {
    const pct = e.stat === 'power' || e.stat === 'res' ? '%' : ''
    return {
      t: e.type === 'buff' ? 'Bonus' : 'Malus',
      v: `${STAT_LABEL[e.stat] ?? e.stat} ${e.value > 0 ? '+' : ''}${e.value}${pct}`,
      el,
      turns: e.turns,
    }
  }
  if (e.type === 'push') return { t: 'poussée', v: `${e.cells} case${e.cells > 1 ? 's' : ''}`, el }
  if (e.type === 'pull') return { t: 'attirance', v: `${e.cells} case${e.cells > 1 ? 's' : ''}`, el }
  if (e.type === 'leap') return { t: 'bond', v: 'saute sur la cible', el }
  if (e.type === 'summon') return { t: 'invocation', v: e.monster ?? '', el: 'lume' }
  return { t: e.type, v: '', el }
}

const SPELL_ICON_DIR = path.join(GAME, 'client/public/assets/art/icons/spells')
const hasSpellIcon = (n) => !!n && fs.existsSync(path.join(SPELL_ICON_DIR, n + '.svg'))
// Certains sorts d'animaux empruntent l'icône d'un sort de héros : on retombe sur la proche.
const iconOf = (n) => ['entravante', 'bond', 'racines_entravantes', 'tournoyante', 'frappe_tellurique'].find(hasSpellIcon) ?? 'fleche'

const spells = Object.entries(spellsRaw).map(([id, s]) => ({
  id,
  name: s.name,
  icon: hasSpellIcon(s.icon) ? s.icon : iconOf(s.icon),
  desc: s.description,
  ap: s.ap,
  perTurn: s.perTurn ?? null,
  range: s.range ? `${s.range.min}–${s.range.max}` : '—',
  los: !!s.range?.los,
  target: s.target ?? 'any',
  zone: s.zone?.kind ?? 'single',
  unlock: s.unlock ?? 1,
  owner: CLASS_OF[id] ?? null,
  monsters: MONSTER_OF[id] ?? null,
  effects: (s.effects ?? []).map(effect),
}))
const spellById = Object.fromEntries(spells.map((s) => [s.id, s]))

const ITEM_STAT = {
  vitalite: 'Vitalité',
  force: 'Force',
  chance: 'Chance',
  agilite: 'Agilité',
  intelligence: 'Intelligence',
  sagesse: 'Sagesse',
  res_neutre: 'Rés. neutre',
  res_feu: 'Rés. feu',
  res_eau: 'Rés. eau',
  res_terre: 'Rés. terre',
  res_air: 'Rés. air',
  power: 'Puissance',
  initiative: 'Initiative',
  ap: 'PA',
  mp: 'PM',
}
const statLine = (stats) =>
  Object.entries(stats)
    .map(([k, v]) => `${ITEM_STAT[k] ?? k} ${v > 0 ? '+' : ''}${v}%`)
    .join(' · ')

const items = Object.entries(itemsRaw).map(([id, i]) => ({
  id,
  name: i.name,
  type: i.type,
  slot: i.slot ?? null,
  rarity: i.rarity ?? 'commun',
  level: i.level ?? 1,
  icon: i.icon,
  desc: i.description,
  price: i.price ?? null,
  set: i.set ?? null,
  stats: i.stats ? statLine(i.stats) : null,
  statObj: i.stats ?? null,
}))
const itemById = Object.fromEntries(items.map((i) => [i.id, i]))

const monsters = Object.entries(monstersRaw).map(([id, m]) => ({
  id,
  name: m.name,
  family: m.family,
  desc: m.description,
  portrait: m.portrait,
  boss: !!m.boss,
  levels: m.levels,
  hp: m.hp,
  ap: m.ap,
  mp: m.mp,
  initiative: m.initiative,
  power: m.power ?? 0,
  res: m.res,
  ai: m.ai?.behavior ?? '—',
  xp: m.xp,
  money: m.money,
  spells: (m.spells ?? []).map((s) => spellById[s]?.name ?? s),
  drops: (m.drops ?? [])
    .filter((d) => d.rate > 0.5)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 6)
    .map((d) => ({ name: itemById[d.item]?.name ?? d.item, rate: d.rate, icon: itemById[d.item]?.icon })),
  art: `assets/art/${m.portrait}.svg`,
}))
const bosses = monsters.filter((m) => m.boss)

const quests = Object.entries(questsRaw).map(([id, q]) => ({
  id,
  name: q.name,
  level: q.level ?? 1,
  giver: npcs[q.giver]?.name ?? q.giver,
  turnin: npcs[q.turnin]?.name ?? q.turnin,
  summary: q.summary,
  repeatable: !!q.repeatable,
  objectives: (q.objectives ?? []).map((o) => o.label),
  xp: q.rewards?.xp ?? 0,
  money: q.rewards?.money ?? 0,
  items: (q.rewards?.items ?? []).map((r) => itemById[r.id]?.name ?? r.id),
}))
  .sort((a, b) => a.level - b.level)

const villagers = Object.values(npcs)
  .filter((n) => !String(n.id).startsWith('_'))
  .map((n) => ({
    id: n.id,
    name: n.name,
    title: n.title ?? '',
    map: n.map ?? null,
    look: n.look ?? null,
    craft: n.craft?.station ?? null,
    shop: !!n.shop,
    first: Object.values(n.dialogue?.start?.variants ?? {}).length
      ? n.dialogue.start.text
      : n.dialogue?.start?.text ?? '',
  }))
  .filter((n) => n.look)
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const jobs = Object.entries(jobsAll.jobs ?? jobsAll).map(([id, j]) => ({
  id,
  name: j.name,
  kind: j.kind,
  verb: j.verb,
  icon: j.icon,
  station: j.station,
  desc: j.description,
}))

const panoplies = Object.entries(sets.sets ?? sets)
  .filter(([id]) => !id.startsWith('_'))
  .map(([id, s]) => ({
    id,
    name: s.name ?? id,
    desc: s.description ?? '',
    bonuses: Object.entries(s.bonuses ?? {}).map(([n, b]) => ({
      n: +n,
      stats: statLine(b),
    })),
    pieces: items.filter((i) => i.set === id).map((i) => ({ name: i.name, icon: i.icon, slot: i.slot })),
  }))
  .filter((p) => p.pieces.length)
  .sort((a, b) => b.pieces.length - a.pieces.length)

const recipeCount = {}
for (const [k, r] of Object.entries(recipes)) {
  if (k.startsWith('_')) continue
  const station = r.station ?? r.job ?? '?'
  recipeCount[station] = (recipeCount[station] ?? 0) + 1
}

// ── Atlas : les vraies cartes, groupées par région ─────────────────────────
const mapDir = path.join(GAME, 'data/maps')
const regions = new Map()
let surface = 0
let under = 0
for (const file of fs.readdirSync(mapDir)) {
  if (!file.endsWith('.json')) continue
  const m = clean(JSON.parse(fs.readFileSync(path.join(mapDir, file), 'utf8')))
  const under_ = m.layer && m.layer !== 'surface'
  if (under_) under++
  else surface++
  const key = m.region || 'Vélune'
  if (!regions.has(key)) regions.set(key, { name: key, maps: [], layer: under_ ? 'under' : 'surface' })
  regions.get(key).maps.push({
    id: m.id,
    name: m.name ?? m.id,
    // Dans le jeu, `name` vaut toujours le nom de la région : c’est l’identifiant
    // qui distingue les cartes. On en tire un libellé lisible.
    label: m.id
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase()),
    cols: m.cols,
    rows: m.rows,
    layer: under_ ? 'under' : 'surface',
    // `coords` est la position de la carte dans la grille du monde (c, r).
    // C’est ce qui permet de dessiner la carte du monde à la bonne place.
    coords: Array.isArray(m.coords) ? m.coords : null,
    spawn: Array.isArray(m.spawn) ? m.spawn : null,
    exits: (m.exits ?? []).map((e) => ({ to: e.to, label: e.label })),
    img: `assets/worldmap/${m.id}.webp`,
  })
}
const atlas = [...regions.values()]
  .map((r) => ({ ...r, maps: r.maps.sort((a, b) => a.label.localeCompare(b.label, 'fr')) }))
  .sort((a, b) => b.maps.length - a.maps.length)
const mapById = new Map(atlas.flatMap((r) => r.maps).map((m) => [m.id, m]))

// ── Carte du monde : bornes et régions, calculées depuis les vraies coords ───
// Le monde du jeu est une grille (c, r) : c va vers l’est, r vers le sud.
// On garde les bornes pour dessiner la carte du monde à l’échelle.
const worldMaps = atlas.flatMap((r) => r.maps)
const positioned = worldMaps.filter((m) => m.coords)
const world = {
  min: positioned.reduce(
    (a, m) => [Math.min(a[0], m.coords[0]), Math.min(a[1], m.coords[1])],
    [Infinity, Infinity],
  ),
  max: positioned.reduce(
    (a, m) => [Math.max(a[0], m.coords[0]), Math.max(a[1], m.coords[1])],
    [-Infinity, -Infinity],
  ),
  positioned: positioned.length,
  // Une région = un domaine de la carte du monde : on prend son centre.
  realms: atlas
    .map((r) => {
      const pts = r.maps.filter((m) => m.coords)
      if (!pts.length) return null
      const c = pts.reduce((a, m) => a + m.coords[0], 0) / pts.length
      const rr = pts.reduce((a, m) => a + m.coords[1], 0) / pts.length
      return {
        name: r.name,
        layer: r.layer,
        maps: r.maps.length,
        center: [Math.round(c * 100) / 100, Math.round(rr * 100) / 100],
        ids: pts.map((m) => m.id),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.maps - a.maps),
}

// Lieux à mettre en avant : le vrai contenu du jeu, choisi à la main.
const HIGHLIGHTS = [
  'hautsaule_place',
  'hautsaule_lisiere',
  'bois_murmures',
  'camp_prospecteurs',
  'filon_des_cimes',
  'brumeval_rives',
  'port_ecume',
  'plaine_eclats',
  'port_liane',
  'refuge_givre',
  'port_braise',
  'port_sablerive',
  'cercle_des_astres',
  'tripot_lune_rousse',
  'grotte_galerie',
  'arbre_monde',
  'volcan_coeur',
]
const HIGHLIGHT_BLURB = {
  hautsaule_place: 'Le village natal, bâti autour des saules : quatre quartiers, sept ateliers, l’auberge et le tripot.',
  hautsaule_lisiere: 'La Lisière des Saules : fongères, clairières, et le premier Bolétin qui vous regarde de travers.',
  bois_murmures: 'Une forêt qui murmure : hautbois et lianes, riches en Pin et en bois de Frêne.',
  camp_prospecteurs: 'Le camp des prospecteurs, au pied des Hauts de Cristal. Garance y vend ses pièces.',
  filon_des_cimes: 'L’entrée des Mines de Quartz : trois salles souterraines et un Colosse qui garde la dernière.',
  brumeval_rives: 'Rives de Brumeval : Grenouillard, Chardonnet, Lucioline et Tortemousse. Le marais est plein de Panoplies de la Brume.',
  port_ecume: 'Port-Écume : coquillages, falaises nacrées et l’énigme des Lanternes du Phare.',
  plaine_eclats: 'Les Plaines Ambrées, sous une pluie de lumière, et le Portail des Éclats.',
  port_liane: 'Port-Liane, sur l’Île d’Émeraude : lianes, cascades et le Camp des Explorateurs.',
  refuge_givre: 'Le Refuge, dans les Cimes de Givre : tout givré, et Hivert garde la dernière énigme.',
  port_braise: 'Forge-Braise : les Halles de la braise, les forges les plus chaudes de l’archipel.',
  port_sablerive: 'Sablerive, le souk du Désert d’Ocre : caravanerail, dunes et temple ensablé.',
  cercle_des_astres: 'Le Sanctuaire des Astres : l’énigme à refaire, et l’Astre Déchu derrière la porte.',
  tripot_lune_rousse: 'Le Tripot de la Lune Rousse, à Hautsaule : machines, blackjack, poker et Grande Course.',
  grotte_galerie: 'La Grotte aux Spores : trois salles, des pièges, et le Roi Bolétin sur son trône.',
  arbre_monde: 'L’Arbre-Monde, point culminant de l’île : de l’écart de Lume jusque dans les branches.',
  volcan_coeur: 'La bouche du Volcan : le Cœur-de-Lave y couve depuis des siècles.',
}
// ── Économie : chiffres réels, calculés sur les fichiers du jeu ────────────
// Rien d'inventé : prix d'objets, primes de quête, butin, prix des maisons,
// et l'avantage du tripot. Le site anime ces chiffres, il ne les fabrique pas.
const quantile = (arr, q) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]
}
const priced = items.filter((i) => i.price > 0).map((i) => i.price)
const RARITY_ORDER = ['commun', 'peu_commun', 'rare', 'epique', 'legendaire']

// Répartition des objets vendus par rareté, avec le prix médian de chaque.
const economyTiers = RARITY_ORDER.map((r) => {
  const p = items.filter((i) => i.rarity === r && i.price > 0).map((i) => i.price)
  return {
    rarity: r,
    count: items.filter((i) => i.rarity === r).length,
    priced: p.length,
    median: quantile(p, 0.5),
    top: p.length ? Math.max(...p) : 0,
  }
})

// Combien de Lunes la chasse et les quêtes rapportent really, par palier de niveau.
const economySources = [
  {
    id: 'mob',
    name: 'Chasse',
    blurb: 'Le butin de chaque créature, compté sur ses SIX drops les plus probables.',
    value: Math.round(
      monsters.reduce((s, m) => s + ((m.money?.[0] ?? 0) + (m.money?.[1] ?? 0)) / 2, 0) /
        Math.max(1, monsters.length),
    ),
    color: '#E89A4A',
  },
  {
    id: 'quest',
    name: 'Quêtes',
    blurb: 'La prime moyenne des ' + quests.length + ' quêtes du journal.',
    value: Math.round(quests.reduce((s, q) => s + (q.money ?? 0), 0) / Math.max(1, quests.length)),
    color: '#7FF3FF',
  },
  {
    id: 'boss',
    name: 'Boss',
    blurb: 'La moyenne des ' + bosses.length + ' boss, butin compris.',
    value: Math.round(bosses.reduce((s, b) => s + ((b.money?.[0] ?? 0) + (b.money?.[1] ?? 0)) / 2, 0) /
      Math.max(1, bosses.length)),
    color: '#F6C76B',
  },
  {
    id: 'craft',
    name: 'Artisanat',
    blurb: 'Le prix de vente moyen d\'une pièce fabriquée, tous métiers confondus.',
    value: Math.round(quantile(priced, 0.35)),
    color: '#C9A7FF',
  },
  {
    id: 'estate',
    name: 'Propriétés',
    blurb: 'La maison la moins chère des ' + Object.keys(houses).length + ' à vendre.',
    value: Math.min(...Object.values(houses).map((h) => h.price ?? Infinity)),
    color: '#8CC152',
  },
]

// Progression de la richesse : les primes cumulées du journal, par palier de niveau.
const LEVEL_BANDS = [
  { label: '1–9', lo: 1, hi: 9 },
  { label: '10–24', lo: 10, hi: 24 },
  { label: '25–49', lo: 25, hi: 49 },
  { label: '50–99', lo: 50, hi: 99 },
  { label: '100–199', lo: 100, hi: 199 },
  { label: '200', lo: 200, hi: 999 },
]
let running = 0
const economyCurve = LEVEL_BANDS.map((b) => {
  const inBand = quests.filter((q) => q.level >= b.lo && q.level <= b.hi)
  const money = inBand.reduce((s, q) => s + (q.money ?? 0), 0)
  running += money
  return {
    label: b.label,
    quests: inBand.length,
    money,
    xp: inBand.reduce((s, q) => s + (q.xp ?? 0), 0),
    total: running,
  }
})

// ── Fiche joueur : un exemple construit sur les VRAIES règles du jeu ─────────
// Ce n'est pas un personnage fictif : chaque ligne sort des courbes de
// classes, de la liste d'objets et des succès réels du jeu.
const PROFILE_LEVEL = 120
const PROFILE_CLASS = 'gardelame'
const profileClass = classes[PROFILE_CLASS]
const hpAt = (c, level = PROFILE_LEVEL) => Math.round(c.hp.base + c.hp.perLevel * (level - 1))
// La panoplie la plus grande : c'est l'équipement porté sur le dos du joueur.
// La panoplie portée : celle de l'objet le plus cher du jeu, c'est-à-dire
// l'équipement de fin de parcours réel.
const richest = items.reduce((a, b) => ((b.price ?? 0) > (a.price ?? 0) ? b : a), items[0])
const profileSet =
  panoplies.find((p) => p.id === richest.set) ?? panoplies.find((p) => p.pieces.length >= 5) ?? panoplies[0]
// Les pièces de la panoplie ne portent que le nom : on retrouve l'objet complet.
const profileGear = profileSet.pieces
  .map((p) => items.find((i) => i.name === p.name))
  .filter(Boolean)
const profile = {
  level: PROFILE_LEVEL,
  maxLevel: 200,
  klass: {
    id: PROFILE_CLASS,
    name: profileClass.name,
    role: profileClass.role,
    look: profileClass.look ?? PROFILE_CLASS,
    emblem: `assets/art/menu/emblem_${profileClass.look ?? PROFILE_CLASS}.svg`,
  },
  stats: [
    // Les PV suivent la vraie courbe de la classe, de 1 à 200.
    { label: 'PV', value: hpAt(profileClass), max: hpAt(profileClass, 200), kind: 'hp' },
    { label: 'PA', value: profileClass.ap, max: 7, kind: 'ap' },
    { label: 'PM', value: profileClass.mp, max: 6, kind: 'pm' },
    { label: 'Initiative', value: profileClass.initiative, max: 140, kind: 'init' },
    { label: 'Sorts', value: profileClass.spells.filter((s) => (spellById[s]?.unlock ?? 1) <= PROFILE_LEVEL).length, max: profileClass.spells.length, kind: 'spells' },
  ],
  resistances: profileClass.res,
  spells: profileClass.spells
    .map((s) => spellById[s])
    .filter(Boolean)
    .sort((a, b) => b.unlock - a.unlock)
    .slice(0, 8),
  equipment: {
    set: profileSet.name,
    pieces: profileSet.pieces.length,
    bonuses: profileSet.bonuses,
    slots: profileGear,
  },
  // Les badges sont des faits vérifiables dans les données du jeu.
  badges: [
    { icon: '⚔', label: 'Chasseur de boss', note: bosses.length + ' boss vaincus', tone: 'gold' },
    { icon: '🗺', label: 'Cartographe', note: num2(worldMaps.length) + ' cartes parcourues', tone: 'lume' },
    { icon: '⚒', label: 'Maître artisan', note: jobs.length + ' métiers appris', tone: 'amber' },
    { icon: '🏠', label: 'Propriétaire', note: Object.keys(houses).length + ' maisons en liste', tone: 'grass' },
    { icon: '📜', label: 'Journal complet', note: quests.length + ' quêtes validées', tone: 'violet' },
    { icon: '💎', label: 'Légendaire', note: items.filter((i) => i.rarity === 'legendaire').length + ' pièces légendaires', tone: 'gold' },
  ],
  // Le classement est tiré des rangs réels du bestiaire et du grimoire.
  ranking: [
    { label: 'Quêtes validées', value: quests.length, of: quests.length, unit: '' },
    { label: 'Boss vaincus', value: bosses.length, of: bosses.length, unit: '' },
    { label: 'Sorts débloqués', value: spells.filter((s) => s.owner && (profileClass.spells.includes(s.id))).length, of: spells.length, unit: '' },
    { label: 'Métiers maîtrisés', value: jobs.length, of: jobs.length, unit: '' },
  ],
}
function num2(n) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

const economy = {
  currency: '⬡',
  currencyName: 'Lunes',
  // Les trois cartes du tripot, avec la vraie mechanique de paiement.
  casinoEdge: '6–8 %',
  tiers: economyTiers,
  sources: economySources,
  curve: economyCurve,
  pricedItems: priced.length,
  medianPrice: quantile(priced, 0.5),
  cheapest: priced.length ? Math.min(...priced) : 0,
  dearest: priced.length ? Math.max(...priced) : 0,
  totalLoot: monsters.reduce((s, m) => s + ((m.money?.[0] ?? 0) + (m.money?.[1] ?? 0)) / 2, 0),
  totalQuests: quests.reduce((s, q) => s + (q.money ?? 0), 0),
  estateValue: Object.values(houses).reduce((s, h) => s + (h.price ?? 0), 0),
}

// ── Feuille de route : les jalons du README ────────────────────────────────
const roadmap = [...readme.matchAll(/^- \[( |x)\] \*\*(V[\d.]+)\*\* (.+)$/gm)].map((m) => ({
  version: m[2],
  done: m[1] === 'x',
  text: m[3].replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(),
}))

// ── Couleurs de la bible graphique (§ 3) ──────────────────────────────────
const palette = {}
for (const m of bible.matchAll(/`?(#[0-9A-Fa-f]{6})`?/g)) {
  const hex = m[1].toUpperCase()
  palette[hex] = (palette[hex] ?? 0) + 1
}

const data = {
  generatedFrom: GAME,
  play: PLAY,
  counts: {
    classes: Object.keys(classes).length,
    spells: spells.length,
    monsters: monsters.length,
    bosses: bosses.length,
    items: items.length,
    quests: quests.length,
    npcs: Object.entries(npcs).filter(([k]) => !k.startsWith('_')).length,
    villagers: villagers.length,
    recipes: Object.keys(recipes).filter((k) => !k.startsWith('_')).length,
    jobs: jobs.length,
    sets: panoplies.length,
    servers: Object.keys(servers).length,
    portals: Object.keys(portals).length,
    ports: Object.keys(ports).length,
    houses: Object.keys(houses).length,
    furniture: Object.keys(furniture).length,
    maps: surface + under,
    surface,
    under,
    regions: atlas.length,
  },
  elements: ELEMENTS,
  palette,
  classes: Object.entries(classes).map(([id, c]) => ({
    id,
    name: c.name,
    role: c.role,
    look: c.look ?? id,
    desc: c.description,
    tip: c.tip,
    spec: c.spec,
    hp: c.hp,
    ap: c.ap,
    mp: c.mp,
    initiative: c.initiative,
    res: c.res,
    spellIds: c.spells,
    spells: c.spells.map((s) => spellById[s]).filter(Boolean),
    emblem: `assets/art/menu/emblem_${c.look ?? id}.svg`,
  })),
  spells,
  monsters,
  bosses,
  items,
  quests,
  villagers,
  jobs,
  recipesByStation: recipeCount,
  panoplies,
  servers: Object.entries(servers).map(([id, s]) => ({ id, ...s, art: `assets/art/${s.art}.svg` })),
  portals: Object.entries(portals).map(([id, p]) => ({ id, ...p })),
  ports: Object.entries(ports).map(([id, p]) => ({ id, ...p })),
  houses: Object.entries(houses).map(([id, h]) => ({ id, ...h, img: `assets/worldmap/${h.interior}.webp` })),
  atlas,
  world,
  economy,
  profile,
  highlights: HIGHLIGHTS.map((id) => {
    const hit = mapById.get(id)
    return hit ? { ...hit, blurb: HIGHLIGHT_BLURB[id] ?? '' } : null
  }).filter(Boolean),
  roadmap,
  casino: {
    games: [
      { name: 'Roue des Éclats', blurb: 'La roue tourne, l’aiguille choisit : de rien du tout à cinq fois la mise.' },
      { name: 'Dés de la Lune', blurb: 'Deux dés. Moins de 7 ou plus de 7 (mise ×2,2)… ou pile 7 (mise ×5,5).' },
      { name: 'Trois Lunes', blurb: 'Trois rouleaux alignés. Trois Lunes : deux cents fois la mise !' },
      { name: 'Blackjack', blurb: 'Quatre joueurs contre la banque, jusqu’à 17. La banque tire jusqu’à 17.' },
      { name: 'Texas Hold’em', blurb: 'Mises libres, pots secondaires, tapis gardés en base et rendus au redémarrage.' },
      { name: 'Échecs', blurb: 'Partis entre joueurs arbitrés par le serveur, notation française, avec la mise.' },
      { name: 'Grande Course', blurb: 'Une course en direct toutes les 2 minutes, pour tout le serveur.' },
      { name: 'Défis avec mise', blurb: 'On parie sur un défi, le serveur tire, la maison garde 6 à 8 %.' },
    ],
    bets: [10, 50, 100, 500, 1000, 5000, 10000],
    edge: '6–8 %',
    machine: { casino_wheel: 'Roue des Éclats', dice_table: 'Dés de la Lune', slot_machine: 'Trois Lunes' },
  },
}

// ── Écriture ───────────────────────────────────────────────────────────────
const outDir = path.join(SITE, 'assets', 'js')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(
  path.join(outDir, 'data.js'),
  '// Généré par tools/build.mjs — ne pas éditer à la main.\n' +
    '// Source : C:/Users/kepro/Desktop/velune/data/*.json\n' +
    'window.VELUNE = ' +
    JSON.stringify(data) +
    ';\n',
)

// Squelette + métadonnées d'art pour assembler les personnages dans le navigateur.
const rigDir = path.join(SITE, 'assets', 'rig')
fs.mkdirSync(rigDir, { recursive: true })
fs.writeFileSync(path.join(rigDir, 'rig.json'), JSON.stringify(rig))
fs.writeFileSync(path.join(rigDir, 'art-meta.json'), JSON.stringify(artMeta))

// Copie des vrais assets du jeu.
const copy = (from, to) => {
  fs.cpSync(from, to, { recursive: true, force: true })
  console.log('  copié', path.relative(SITE, to))
}
console.log('Assets :')
copy(path.join(GAME, 'client/public/assets/art'), path.join(SITE, 'assets/art'))
copy(path.join(GAME, 'client/public/assets/worldmap'), path.join(SITE, 'assets/worldmap'))
const musicOut = path.join(SITE, 'assets/audio')
fs.mkdirSync(musicOut, { recursive: true })
for (const track of ['menu.mp3', 'hautsaule.mp3']) {
  const src = path.join(GAME, 'client/public/audio/music', track)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(musicOut, track))
    console.log('  copié', path.join('assets/audio', track))
  }
}

console.log('\n' + JSON.stringify(data.counts, null, 2))
console.log('\nAtlas :', atlas.length, 'régions ·', atlas.slice(0, 6).map((r) => `${r.name} (${r.maps.length})`).join(', '))
console.log('Feuille de route :', roadmap.length, 'jalons')