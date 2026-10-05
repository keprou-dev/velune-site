/* ══════════════════════════════════════════════════════════════════════════
   VÉLUNE — modules de contenu : grimoire, bestiaire, almanach, quêtes,
   métiers, village, tripot, feuille de route, serveurs, recherche globale.
   Dépend de window.VS (défini dans site.js).
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict'

  var V = window.VELUNE
  var VS = window.VS
  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }
  var esc = VS.esc, num = VS.num, el = VS.el

  /* ── Compteurs d'en-tête ───────────────────────────────────────────── */
  $('#spellsCount').textContent = num(V.counts.spells)
  $('#monstersCount').textContent = num(V.counts.monsters)
  $('#bossesCount').textContent = num(V.counts.bosses)
  $('#itemsCount').textContent = num(V.counts.items)
  $('#setsCount').textContent = num(V.counts.sets)
  $('#questsCount').textContent = num(V.counts.quests)
  $('#jobsCount').textContent = num(V.counts.jobs)
  $('#recipesCount').textContent = num(V.counts.recipes)
  $('#villagersCount').textContent = num(V.counts.villagers)
  $('#milestonesCount').textContent = num(V.counts.roadmap || V.roadmap.length)

  /* ══════════════════════════════════════════════════════════════════════
     Grimoire
     ══════════════════════════════════════════════════════════════════════ */
  var spellState = { q: '', owner: 'all', el: 'all', limit: 48 }
  var spellGrid = $('#grimoireGrid')

  $('#spellOwners').innerHTML =
    '<button class="filt active" data-owner="all">Tous</button>' +
    V.classes.map(function (c) { return '<button class="filt" data-owner="' + c.id + '">' + esc(c.name) + '</button>' }).join('') +
    '<button class="filt" data-owner="monstres">Sorts de créatures</button>'
  $('#spellElements').innerHTML =
    '<button class="filt active" data-el="all">Tous éléments</button>' +
    Object.keys(V.elements)
      .map(function (k) {
        return '<button class="filt" data-el="' + k + '" data-color style="--c:' + V.elements[k].color + '">' + esc(V.elements[k].name) + '</button>'
      })
      .join('')

  function filteredSpells() {
    var q = spellState.q.trim().toLowerCase()
    return V.spells.filter(function (s) {
      if (spellState.owner === 'monstres' && !s.monsters) return false
      if (spellState.owner !== 'all' && spellState.owner !== 'monstres' && s.owner !== spellState.owner) return false
      if (spellState.el !== 'all' && !s.effects.some(function (e) { return e.el === spellState.el })) return false
      if (q && (s.name + ' ' + s.desc + ' ' + s.id).toLowerCase().indexOf(q) === -1) return false
      return true
    })
  }

  function renderSpells() {
    var list = filteredSpells()
    $('#spellCount').innerHTML = '<b>' + num(list.length) + '</b> sorts'
    if (!list.length) {
      spellGrid.innerHTML = '<div class="empty" style="grid-column:1/-1">Aucun sort ne correspond.</div>'
      $('#spellMore').style.display = 'none'
      return
    }
    spellGrid.innerHTML = list
      .slice(0, spellState.limit)
      .map(function (s) {
        var ec = VS.elColor((s.effects[0] && s.effects[0].el) || 'neutre')
        return (
          '<button class="spell-card" data-id="' + s.id + '" style="--ec:' + ec + '" title="' + esc(s.name) + '">' +
          '<span class="ap">' + s.ap + ' PA</span>' +
          '<img src="assets/art/icons/spells/' + s.icon + '.svg" alt="" loading="lazy">' +
          '<b>' + esc(s.name) + '</b>' +
          '<span class="unlock">niv. ' + s.unlock + '</span>' +
          (s.perTurn ? '<span class="perTurn">×2/tour</span>' : '') +
          '</button>'
        )
      })
      .join('')
    $$('.spell-card', spellGrid).forEach(function (card) {
      card.addEventListener('click', function () { VS.openSpell(card.dataset.id) })
    })
    var more = $('#spellMore')
    more.style.display = list.length > spellState.limit ? '' : 'none'
    more.textContent = 'Afficher plus de sorts (' + num(Math.max(0, list.length - spellState.limit)) + ' restants)'
  }

  $('#spellSearch').addEventListener('input', function (e) { spellState.q = e.target.value; spellState.limit = 48; renderSpells() })
  $('#spellOwners').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    spellState.owner = b.dataset.owner; spellState.limit = 48
    $$('.filt', this).forEach(function (x) { x.classList.toggle('active', x === b) })
    renderSpells()
  })
  $('#spellElements').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    spellState.el = b.dataset.el; spellState.limit = 48
    $$('.filt', this).forEach(function (x) { x.classList.toggle('active', x === b) })
    renderSpells()
  })
  $('#spellMore').addEventListener('click', function () { spellState.limit += 96; renderSpells() })
  renderSpells()

  /* ══════════════════════════════════════════════════════════════════════
     Bestiaire
     ══════════════════════════════════════════════════════════════════════ */
  var beastState = { q: '', range: 0, family: 'all', bosses: false, limit: 30 }
  var beastGrid = $('#beastGrid')

  var RANGES = [
    { v: 0, l: 'Tous' }, { v: 1, l: 'Niv. 1–9' }, { v: 10, l: 'Niv. 10–24' },
    { v: 25, l: 'Niv. 25–49' }, { v: 50, l: 'Niv. 50+' },
  ]
  $('#beastRanges').innerHTML =
    RANGES.map(function (r, i) { return '<button class="filt' + (i === 0 ? ' active' : '') + '" data-range="' + r.v + '">' + r.l + '</button>' }).join('') +
    '<button class="filt" data-boss="1">Boss seulement</button>'

  var families = []
  V.monsters.forEach(function (m) { if (families.indexOf(m.family) === -1) families.push(m.family) })
  $('#beastFamilies').innerHTML =
    '<button class="filt active" data-family="all">Toutes familles</button>' +
    families.slice(0, 14).map(function (f) { return '<button class="filt" data-family="' + esc(f) + '">' + esc(f) + '</button>' }).join('')

  function inRange(m, r) {
    if (!r) return true
    var lo = r === 1 ? 1 : r === 10 ? 10 : r === 25 ? 25 : 50
    var hi = r === 1 ? 9 : r === 10 ? 24 : r === 25 ? 49 : Infinity
    return m.levels[1] >= lo && m.levels[0] <= hi
  }

  function filteredBeasts() {
    var q = beastState.q.trim().toLowerCase()
    return V.monsters.filter(function (m) {
      if (!inRange(m, beastState.range)) return false
      if (beastState.family !== 'all' && m.family !== beastState.family) return false
      if (beastState.bosses && !m.boss) return false
      if (q && (m.name + ' ' + m.family + ' ' + m.desc).toLowerCase().indexOf(q) === -1) return false
      return true
    })
  }

  function renderBeasts() {
    var list = filteredBeasts()
    $('#beastCount').innerHTML = '<b>' + num(list.length) + '</b> créatures'
    if (!list.length) {
      beastGrid.innerHTML = '<div class="empty" style="grid-column:1/-1">Aucune créature ne correspond.</div>'
      $('#beastMore').style.display = 'none'
      return
    }
    beastGrid.innerHTML = list
      .slice(0, beastState.limit)
      .map(function (m) {
        var lv = m.levels[0] === m.levels[1] ? 'niv. ' + m.levels[0] : 'niv. ' + m.levels[0] + '–' + m.levels[1]
        return (
          '<button class="beast-card' + (m.boss ? ' boss' : '') + '" data-id="' + m.id + '">' +
          '<span class="lv">' + m.levels[0] + '</span>' +
          '<img src="' + m.art + '" alt="" loading="lazy">' +
          '<b>' + esc(m.name) + '</b><small>' + esc(lv) + ' · ' + esc(m.family) + '</small></button>'
        )
      })
      .join('')
    $$('.beast-card', beastGrid).forEach(function (card) {
      card.addEventListener('click', function () { VS.openMonster(card.dataset.id) })
    })
    var more = $('#beastMore')
    more.style.display = list.length > beastState.limit ? '' : 'none'
    more.textContent = 'Afficher plus de créatures (' + num(Math.max(0, list.length - beastState.limit)) + ' restantes)'
  }

  $('#beastSearch').addEventListener('input', function (e) { beastState.q = e.target.value; beastState.limit = 30; renderBeasts() })
  $('#beastRanges').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    if (b.dataset.boss) beastState.bosses = !beastState.bosses
    else { beastState.range = +b.dataset.range; beastState.bosses = false }
    beastState.limit = 30
    $$('.filt', this).forEach(function (x) {
      x.classList.toggle('active', x.dataset.boss ? beastState.bosses : x === b)
    })
    renderBeasts()
  })
  $('#beastFamilies').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    beastState.family = b.dataset.family; beastState.limit = 30
    $$('.filt', this).forEach(function (x) { x.classList.toggle('active', x === b) })
    renderBeasts()
  })
  $('#beastMore').addEventListener('click', function () { beastState.limit += 36; renderBeasts() })
  renderBeasts()

  /* ══════════════════════════════════════════════════════════════════════
     Almanach
     ══════════════════════════════════════════════════════════════════════ */
  var itemState = { q: '', type: 'all', rarity: 'all', limit: 60 }
  var almanach = $('#almanachGrid')

  var TYPES = [
    { v: 'all', l: 'Tout' }, { v: 'equipment', l: 'Équipement' },
    { v: 'consumable', l: 'Consommable' }, { v: 'resource', l: 'Ressource' },
  ]
  $('#itemTypes').innerHTML = TYPES.map(function (t, i) {
    return '<button class="filt' + (i === 0 ? ' active' : '') + '" data-type="' + t.v + '">' + t.l + '</button>'
  }).join('')
  var RARITIES = ['commun', 'peu_commun', 'rare', 'epique', 'legendaire']
  $('#rarityFilters').innerHTML = RARITIES.map(function (r) {
    return '<button class="filt" data-rarity="' + r + '" data-color style="--c:' + VS.rarityOf(r).color + '">' + VS.rarityOf(r).label + '</button>'
  }).join('')
  $('#rarityLegend').innerHTML = RARITIES.map(function (r) {
    return '<span><i style="--c:' + VS.rarityOf(r).color + '"></i>' + VS.rarityOf(r).label + '</span>'
  }).join('')

  function filteredItems() {
    var q = itemState.q.trim().toLowerCase()
    return V.items.filter(function (i) {
      if (itemState.type !== 'all' && i.type !== itemState.type) return false
      if (itemState.rarity !== 'all' && i.rarity !== itemState.rarity) return false
      if (q && (i.name + ' ' + i.desc + ' ' + (i.set || '')).toLowerCase().indexOf(q) === -1) return false
      return true
    })
  }

  function renderItems() {
    var list = filteredItems()
    $('#itemCount').innerHTML = '<b>' + num(list.length) + '</b> objets'
    if (!list.length) {
      almanach.innerHTML = '<div class="empty" style="grid-column:1/-1">Aucun objet ne correspond.</div>'
      $('#itemMore').style.display = 'none'
      return
    }
    almanach.innerHTML = list
      .slice(0, itemState.limit)
      .map(function (i) {
        var r = VS.rarityOf(i.rarity)
        return (
          '<button class="item-card ' + esc(i.rarity) + '" data-id="' + i.id + '" style="--rc:' + r.color + '" title="' + esc(i.name) + '">' +
          '<img src="assets/art/icons/items/' + i.icon + '.svg" alt="" loading="lazy">' +
          '<b>' + esc(i.name) + '</b>' +
          (i.price ? '<span class="price">' + num(i.price) + ' ⬡</span>' : '') +
          '</button>'
        )
      })
      .join('')
    $$('.item-card', almanach).forEach(function (card) {
      card.addEventListener('click', function () { VS.openItem(card.dataset.id) })
    })
    var more = $('#itemMore')
    more.style.display = list.length > itemState.limit ? '' : 'none'
    more.textContent = 'Afficher plus d’objets (' + num(Math.max(0, list.length - itemState.limit)) + ' restants)'
  }

  $('#itemSearch').addEventListener('input', function (e) { itemState.q = e.target.value; itemState.limit = 60; renderItems() })
  $('#itemTypes').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    itemState.type = b.dataset.type; itemState.limit = 60
    $$('.filt', this).forEach(function (x) { x.classList.toggle('active', x === b) })
    renderItems()
  })
  $('#rarityFilters').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    itemState.rarity = itemState.rarity === b.dataset.rarity ? 'all' : b.dataset.rarity
    itemState.limit = 60
    $$('.filt', this).forEach(function (x) { x.classList.toggle('active', x.dataset.rarity === itemState.rarity) })
    renderItems()
  })
  $('#itemMore').addEventListener('click', function () { itemState.limit += 90; renderItems() })
  renderItems()

  $('#setsGrid').innerHTML = V.panoplies
    .slice(0, 12)
    .map(function (p, i) {
      return (
        '<div class="card set-card" style="transition-delay:' + Math.min(i * 40, 400) + 'ms">' +
        '<div class="set-head"><b>' + esc(p.name) + '</b><span class="pill pill--gold">' + p.pieces.length + ' pièces</span></div>' +
        (p.desc ? '<p>' + esc(p.desc) + '</p>' : '') +
        '<div class="set-pieces">' +
        p.pieces.map(function (pc) {
          return '<img src="assets/art/icons/items/' + pc.icon + '.svg" alt="' + esc(pc.name) + '" title="' + esc(pc.name) + '">'
        }).join('') +
        '</div>' +
        '<ul class="set-bonus">' +
        p.bonuses.map(function (b) { return '<li><span>' + b.n + ' pièces</span>' + esc(b.stats) + '</li>' }).join('') +
        '</ul></div>'
      )
    })
    .join('')

  /* ══════════════════════════════════════════════════════════════════════
     Quêtes
     ══════════════════════════════════════════════════════════════════════ */
  var questState = { q: '' }
  function renderQuests() {
    var q = questState.q.trim().toLowerCase()
    var list = V.quests.filter(function (x) {
      if (!q) return true
      return (x.name + ' ' + x.summary + ' ' + x.giver + ' ' + (x.objectives || []).join(' ')).toLowerCase().indexOf(q) > -1
    })
    $('#questCount').innerHTML = '<b>' + num(list.length) + '</b> quêtes'
    $('#questList').innerHTML = list
      .slice(0, 90)
      .map(function (x) {
        return (
          '<article class="quest">' +
          '<div class="quest-head"><b>' + esc(x.name) + '</b>' +
          (x.repeatable ? '<span class="pill pill--grass">Contrat</span>' : '') +
          '<span class="lvl">niv. ' + x.level + '</span></div>' +
          '<p>' + esc(x.summary) + '</p>' +
          (x.objectives && x.objectives.length
            ? '<div class="obj">' + x.objectives.map(function (o) { return '<span>' + esc(o) + '</span>' }).join('') + '</div>'
            : '') +
          '<p class="rew">' + esc(x.giver) + ' → ' + esc(x.turnin) +
          ' · ' + num(x.xp) + ' XP · ' + num(x.money) + ' ⬡' +
          (x.items && x.items.length ? ' · ' + x.items.map(esc).join(', ') : '') + '</p>' +
          '</article>'
        )
      })
      .join('')
  }
  $('#questSearch').addEventListener('input', function (e) { questState.q = e.target.value; renderQuests() })
  renderQuests()

  /* ══════════════════════════════════════════════════════════════════════
     Métiers, chaîne d'artisanat, maisons
     ══════════════════════════════════════════════════════════════════════ */
  var STATION = {
    scierie: 'Scierie', fonderie: 'Fonderie', herboristerie: 'Herboristerie',
    forge: 'Forge', alchimie: 'Laboratoire d’alchimie', couture: 'Atelier de couture', joaillerie: 'Joaillerie',
  }
  $('#jobsGrid').innerHTML = V.jobs
    .map(function (j, i) {
      var n = V.recipesByStation[j.station] || 0
      return (
        '<article class="card job-card" style="transition-delay:' + Math.min(i * 50, 400) + 'ms">' +
        '<div class="job-head">' +
        '<img src="assets/art/icons/items/' + j.icon + '.svg" alt="" loading="lazy">' +
        '<div><b>' + esc(j.name) + '</b><small>' + (j.kind === 'recolte' ? 'Récolte' : 'Artisanat') + '</small></div>' +
        '</div>' +
        '<p>' + esc(j.desc) + '</p>' +
        '<div class="job-foot"><span>' + (STATION[j.station] || j.station) + '</span>' +
        '<span>' + j.verb + ' · ' + n + ' recettes</span></div>' +
        '</article>'
      )
    })
    .join('')

  var CHAIN = [
    'Pin cueilli', 'Bûcheron', 'Bois de Frêne', 'Scierie', 'Planche de Frêne',
    'Forgeron', 'Lingot de Cuivre', 'Lame d’acier', 'Monture', 'Forge',
    'Alchimiste', 'Teinture', 'Bijoutier', 'Alliage lunaire', 'Éclat de Lume', 'Lame d’Éclat',
  ]
  $('#chainCard').innerHTML =
    '<p style="color:var(--txt-dim);margin-bottom:.4rem">' + num(V.counts.recipes) +
    ' recettes, 22 pièces intermédiaires, et des clés de donjon fabricables (Grotte aux Spores à 5 %).</p>' +
    '<div class="chain">' +
    CHAIN.map(function (c, i) {
      return (
        '<span class="chain-node">' + esc(c) + '</span>' +
        (i < CHAIN.length - 1 ? '<span class="chain-arrow">→</span>' : '')
      )
    }).join('') +
    '</div>'

  $('#housesGrid').innerHTML = V.houses
    .map(function (h, i) {
      return (
        '<article class="card house-card" style="transition-delay:' + Math.min(i * 50, 400) + 'ms">' +
        '<img src="' + h.img + '" alt="' + esc(h.name) + '" loading="lazy">' +
        '<div class="house-body"><b>' + esc(h.name) + '</b>' +
        '<p style="color:var(--txt-dim);font-size:.85rem;margin:.3rem 0 .7rem">' + esc(h.description || '') + '</p>' +
        '<span class="house-price">' + num(h.price) + ' ⬡</span></div></article>'
      )
    })
    .join('')

  /* ══════════════════════════════════════════════════════════════════════
     Village & social
     ══════════════════════════════════════════════════════════════════════ */
  var SOCIAL = [
    ['Discussion', 'Canaux Carte et Général, bulles au-dessus des têtes, historique, anti-spam et texte brut côté serveur.'],
    ['Groupes de 4', 'Invitation, canal dédié, cadre des membres, chef de groupe et exclusion. Un groupe par salle de donjon.'],
    ['Échange direct', 'Chacun pose objets et Lunes sur la table, double validation, délai de 2,5 s sur une offre modifiée, échange atomique côté serveur.'],
    ['Défis en duel', 'Une minute pour accepter, un héros de chaque côté, sans XP ni butin ni perte : les PV sont rendus et on reste sur place.'],
    ['Hôtel des ventes', 'Aurèle tient le comptoir à Hautsaule, et dans les camps : les joueurs se fixent leurs propres prix.'],
    ['Amis & classements', 'Amis en ligne et où ils se trouvent, connexions annoncées, classements niveau, fortune, métiers et casino.'],
  ]
  $('#socialGrid').innerHTML = SOCIAL.map(function (s, i) {
    return (
      '<article class="card" style="transition-delay:' + Math.min(i * 55, 400) + 'ms">' +
      '<h3 class="card-title">' + esc(s[0]) + '</h3><p class="card-text">' + esc(s[1]) + '</p></article>'
    )
  }).join('')

  $('#villagersGrid').innerHTML = V.villagers
    .slice(0, 18)
    .map(function (v, i) {
      return (
        '<article class="card" style="transition-delay:' + Math.min(i * 30, 300) + 'ms;padding:1rem 1.1rem">' +
        '<b style="font-family:var(--display);font-weight:400">' + esc(v.name) + '</b>' +
        '<p style="color:var(--lume);font-size:.76rem;letter-spacing:.06em;margin:.1rem 0 .4rem">' + esc(v.title) + '</p>' +
        '<p style="color:var(--txt-dim);font-size:.82rem">' + esc(v.first.length > 132 ? v.first.slice(0, 130) + '…' : v.first) + '</p>' +
        (v.craft || v.shop
          ? '<div class="tag-row" style="margin-top:.6rem"><span class="tag">' +
            (v.craft ? 'Atelier : ' + (STATION[v.craft] || v.craft) : 'Boutique') + '</span></div>'
          : '') +
        '</article>'
      )
    })
    .join('')

  // Discussion factice, mais qui parle comme le vrai canal.
  var CHAT_SEED = {
    Carte: [
      ['Brann', 'Quelqu’un pour le contrat de chasse du Bolétin ?'],
      ['Amaury', 'La forge de la place est complète, filez à la scierie.'],
      ['Pervenche', 'Il reste des chambres à l’auberge, j’ai de la place en haut.'],
      ['Aurèle', 'Je rachète vos ressources, majoration contre le prix du tripot.'],
    ],
    Général: [
      ['Mère Saulée', 'Les Portails de Lune se réveillent pierre après pierre.'],
      ['Garance', 'Le Colosse de Quartz reprend ses forces : ne rush pas.'],
      ['Hivert', 'Les Pierres de Givre se sont déplacées, énigme à refaire.'],
    ],
    Groupe: [
      ['Hypno', 'Je prends le tank, restez derrière moi.'],
      ['Écholot', 'J’ai de quoi jouer une Grande Course, on tente ?'],
      ['Hypno', 'On y va.'],
    ],
  }
  var chatLog = $('#chatLog')
  var chatChannel = 'Carte'
  var chatTimers = []
  function pushLine(who, text, cls) {
    var line = el('div', 'chat-line ' + (cls || ''), '<b>' + esc(who) + '</b>&nbsp;' + esc(text))
    chatLog.appendChild(line)
    while (chatLog.children.length > 7) chatLog.firstChild.remove()
  }
  function startChat() {
    chatTimers.forEach(clearTimeout)
    chatTimers = []
    chatLog.innerHTML = ''
    pushLine('Système', 'Canal ' + chatChannel.toLowerCase() + ' — connecté.', 'sys')
    ;(CHAT_SEED[chatChannel] || []).forEach(function (m, i) {
      chatTimers.push(setTimeout(function () { pushLine(m[0], m[1], chatChannel === 'Groupe' && i === 2 ? 'me' : '') }, 700 + i * 1500))
    })
  }
  $$('.chat-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.chat-tabs button').forEach(function (x) { x.classList.toggle('active', x === b) })
      chatChannel = b.dataset.channel
      startChat()
    })
  })
  $('#chatForm').addEventListener('submit', function (e) {
    e.preventDefault()
    var input = $('#chatInput')
    var v = input.value.trim()
    if (!v) return
    pushLine('Vous', v, 'me')
    input.value = ''
  })
  startChat()

  /* ══════════════════════════════════════════════════════════════════════
     Tripot — la mécanique réelle des machines du jeu
     (shared/casino/games.ts : REEL, slotMult, MOON_PAY)
     ══════════════════════════════════════════════════════════════════════ */
  var REEL = [
    { id: 'feuille', symbol: '🍃', weight: 6, three: 5, name: 'Feuille' },
    { id: 'champignon', symbol: '🍄', weight: 5, three: 9, name: 'Champignon' },
    { id: 'eclat', symbol: '💎', weight: 3, three: 25, name: 'Éclat' },
    { id: 'cle', symbol: '🗝', weight: 2, three: 60, name: 'Clé' },
    { id: 'lune', symbol: '🌙', weight: 1, three: 200, name: 'Lune' },
  ]
  var MOON_PAY = [0, 1, 5]
  var purse = 1000
  var bet = 50
  var auto = null

  function slotMult(reels) {
    if (reels[0] === reels[1] && reels[1] === reels[2]) return REEL.filter(function (s) { return s.id === reels[0] })[0].three
    return MOON_PAY[reels.filter(function (s) { return s === 'lune' }).length]
  }
  function spin() {
    var total = REEL.reduce(function (s, x) { return s + x.weight }, 0)
    function pick() {
      var k = Math.floor(Math.random() * total)
      for (var i = 0; i < REEL.length; i++) { if (k < REEL[i].weight) return REEL[i]; k -= REEL[i].weight }
      return REEL[0]
    }
    return [pick(), pick(), pick()]
  }

  var reelNodes = $$('#reels .reel')
  var purseNode = $('#purse')
  var betLabel = $('#betLabel')
  var logNode = $('#machineLog')

  function setPurse() { purseNode.textContent = num(purse) }
  function setBet() { betLabel.textContent = num(bet) + ' ⬡' }

  $('#betRow').innerHTML = [10, 50, 100, 500, 1000, 5000]
    .map(function (b) { return '<button class="chip' + (b === 50 ? ' active' : '') + '" data-bet="' + b + '">' + num(b) + '</button>' })
    .join('')
  $('#betRow').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return
    bet = +b.dataset.bet
    $$('.chip', this).forEach(function (x) { x.classList.toggle('active', x === b) })
    setBet()
  })

  function doSpin() {
    if (bet > purse) {
      logNode.innerHTML = '<b class="down">Pas assez de Lunes.</b> Réapprovisionnez-vous ou baissez la mise.'
      return
    }
    purse -= bet
    setPurse()
    reelNodes.forEach(function (n) { n.classList.add('spinning'); n.classList.remove('win') })

    var reels = spin()
    var mult = slotMult(reels.map(function (r) { return r.id }))
    var win = bet * mult

    setTimeout(function () {
      reelNodes.forEach(function (n, i) {
        n.classList.remove('spinning')
        n.textContent = reels[i].symbol
        n.title = reels[i].name
      })
      if (win > 0) {
        purse += win
        setPurse()
        reelNodes.forEach(function (n) { n.classList.add('win') })
        logNode.innerHTML =
          '<b class="up">+' + num(win) + ' ⬡</b> — ' +
          (mult >= 200 ? 'Trois Lunes !' : mult >= 5 ? 'Trois ' + reels[0].symbol + ' !' : 'La lune paie même seule.') +
          ' Mise ×' + mult + '.'
        if (mult >= 60) VS.toast('Le tripot de la Lune Rousse est content.')
      } else {
        logNode.innerHTML = '<b class="down">Rien.</b> La maison garde ' + num(bet) + ' ⬡ — avantage 6–8 %.'
      }
    }, 900)
  }

  $('#spinBtn').addEventListener('click', doSpin)
  $('#autoBtn').addEventListener('click', function () {
    if (auto) { clearInterval(auto); auto = null; this.textContent = 'Machine auto'; this.classList.remove('active'); return }
    var self = this
    self.textContent = 'Stop'
    self.classList.add('active')
    auto = setInterval(doSpin, 1600)
  })
  $('#resetBtn').addEventListener('click', function () { purse = 1000; setPurse(); logNode.textContent = 'Portemonnaie réapprovisionné.' })
  setPurse(); setBet()

  $('#gameList').innerHTML = V.casino.games
    .map(function (g, i) {
      return (
        '<button class="game-item" style="text-align:left;transition-delay:' + Math.min(i * 45, 360) + 'ms">' +
        '<span class="n">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span><b>' + esc(g.name) + '</b><p>' + esc(g.blurb) + '</p></span></button>'
      )
    })
    .join('')

  /* ══════════════════════════════════════════════════════════════════════
     Feuille de route
     ══════════════════════════════════════════════════════════════════════ */
  var tlState = 'all'
  var timeline = $('#timeline')
  function renderTimeline() {
    var list = V.roadmap.filter(function (m) { return tlState === 'all' || (tlState === 'done' ? m.done : !m.done) })
    timeline.innerHTML = list
      .map(function (m, i) {
        return (
          '<div class="tl-item reveal' + (m.done ? '' : ' todo') + '" style="transition-delay:' + Math.min(i * 25, 500) + 'ms">' +
          '<span class="tl-dot">' + esc(m.version.replace('V', '')) + '</span>' +
          '<div><b>' + esc(m.version) + (m.done ? ' · livré' : ' · à venir') + '</b><p>' + esc(m.text) + '</p></div></div>'
        )
      })
      .join('')
    $$('.reveal', timeline).forEach(function (n) { n.classList.add('in') })
  }
  $('#tlFilter').innerHTML = ['all', 'done', 'todo']
    .map(function (k, i) {
      var l = { all: 'Tous les jalons', done: 'Livrés', todo: 'À venir' }[k]
      return '<button class="filt' + (i === 0 ? ' active' : '') + '" data-tl="' + k + '">' + l + '</button>'
    })
    .join('')
  $('#tlFilter').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    tlState = b.dataset.tl
    $$('.filt', this).forEach(function (x) { x.classList.toggle('active', x === b) })
    renderTimeline()
  })
  renderTimeline()

  /* ══════════════════════════════════════════════════════════════════════
     Serveurs
     ══════════════════════════════════════════════════════════════════════ */
  var PLAY = V.play || {}
  $('#serverGrid').innerHTML = V.servers
    .map(function (s, i) {
      return (
        '<article class="server-card' + (s.open ? '' : ' closed') + '" style="transition-delay:' + i * 70 + 'ms">' +
        '<img src="' + s.art + '" alt="" loading="lazy">' +
        '<div class="server-body">' +
        '<span class="server-status"><i></i>' + (s.open ? 'Ouvert' : 'Bientôt') + '</span>' +
        '<h3 style="margin-top:.5rem">' + esc(s.name) + '</h3>' +
        '<span class="pill">' + esc(s.kind) + '</span>' +
        '<p>' + esc(s.tagline) + '</p>' +
        (s.open
          ? (PLAY.url
            ? '<a class="btn btn-primary" data-play target="_blank" rel="noopener noreferrer" href="' + esc(PLAY.url) +
              '" style="padding:.6rem 1.2rem;font-size:.82rem">Jouer sur ' + esc(s.name) + '</a>'
            : '<a class="btn btn-primary" href="#rejoindre" style="padding:.6rem 1.2rem;font-size:.82rem">Jouer sur ' + esc(s.name) + '</a>')
          : '<span class="btn btn-ghost" style="padding:.6rem 1.2rem;font-size:.82rem;cursor:default">Bientôt</span>') +
        '</div></article>'
      )
    })
    .join('')

  /* ══════════════════════════════════════════════════════════════════════
     Recherche globale (Ctrl + K)
     ══════════════════════════════════════════════════════════════════════ */
  var palette = $('#palette'), pInput = $('#paletteInput'), pResults = $('#paletteResults')
  var pSel = 0
  var pItems = []

  function index() {
    var out = []
    V.spells.forEach(function (s) {
      out.push({ kind: 'Sort', label: s.name, sub: (s.desc || '').slice(0, 70), img: 'assets/art/icons/spells/' + s.icon + '.svg', run: function () { VS.openSpell(s.id) } })
    })
    V.monsters.forEach(function (m) {
      out.push({ kind: 'Créature', label: m.name, sub: 'niv. ' + m.levels[0] + ' · ' + m.family, img: m.art, run: function () { VS.openMonster(m.id) } })
    })
    V.items.forEach(function (i) {
      out.push({ kind: 'Objet', label: i.name, sub: VS.rarityOf(i.rarity).label + ' · niv. ' + i.level, img: 'assets/art/icons/items/' + i.icon + '.svg', run: function () { VS.openItem(i.id) } })
    })
    return out
  }
  var INDEX = index()

  function runSearch(q) {
    q = q.trim().toLowerCase()
    if (!q) {
      pItems = INDEX.filter(function (x) { return x.kind === 'Créature' }).slice(0, 8)
    } else {
      pItems = INDEX.filter(function (x) { return (x.label + ' ' + x.sub).toLowerCase().indexOf(q) > -1 }).slice(0, 24)
    }
    pSel = 0
    renderPalette()
  }
  function renderPalette() {
    if (!pItems.length) {
      pResults.innerHTML = '<div class="empty" style="margin:.5rem">Aucun résultat.</div>'
      return
    }
    var html = ''
    var last = ''
    pItems.forEach(function (x, i) {
      if (x.kind !== last) { html += '<div class="palette-group">' + x.kind + '</div>'; last = x.kind }
      html +=
        '<button class="palette-item' + (i === pSel ? ' sel' : '') + '" data-i="' + i + '">' +
        '<img src="' + x.img + '" alt="">' +
        '<span><b>' + esc(x.label) + '</b><small>' + esc(x.sub) + '</small></span>' +
        '<span class="kind">↵</span></button>'
    })
    pResults.innerHTML = html
    $$('.palette-item', pResults).forEach(function (b) {
      b.addEventListener('click', function () { pItems[+b.dataset.i].run(); closePalette() })
    })
  }
  function openPalette() {
    palette.classList.add('on')
    palette.setAttribute('aria-hidden', 'false')
    pInput.value = ''
    runSearch('')
    setTimeout(function () { pInput.focus() }, 40)
  }
  function closePalette() {
    palette.classList.remove('on')
    palette.setAttribute('aria-hidden', 'true')
  }
  $('#searchBtn').addEventListener('click', openPalette)
  pInput.addEventListener('input', function () { runSearch(pInput.value) })
  pInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); pSel = Math.min(pSel + 1, pItems.length - 1); renderPalette() }
    if (e.key === 'ArrowUp') { e.preventDefault(); pSel = Math.max(pSel - 1, 0); renderPalette() }
    if (e.key === 'Enter' && pItems[pSel]) { pItems[pSel].run(); closePalette() }
  })
  palette.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closePalette() })
  window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.classList.contains('on') ? closePalette() : openPalette() }
    if (e.key === 'Escape') { closePalette(); VS.closeModal(); closePalette() }
    // Raccourcis façon jeu
    if (e.target.matches('input, textarea')) return
    if (e.key.toLowerCase() === 'l') { e.preventDefault(); document.getElementById('almanach').scrollIntoView({ behavior: 'smooth' }) }
    if (e.key.toLowerCase() === 'm') { e.preventDefault(); document.getElementById('monde').scrollIntoView({ behavior: 'smooth' }) }
  })

  /* ══════════════════════════════════════════════════════════════════════
     Musique
     ══════════════════════════════════════════════════════════════════════ */
  var music = $('#music'), musicBtn = $('#musicBtn')
  music.volume = 0.35
  musicBtn.addEventListener('click', function () {
    if (music.paused) {
      music.play().then(function () { musicBtn.classList.add('on') }).catch(function () {
        VS.toast('Impossible de lire la musique depuis le fichier local.')
      })
    } else {
      music.pause()
      musicBtn.classList.remove('on')
    }
  })

  /* ══════════════════════════════════════════════════════════════════════
     Amorçage : squelette puis classes
     ══════════════════════════════════════════════════════════════════════ */
  var looks = V.classes.map(function (c) { return c.look })
  window.VeluneRig.prepare(looks).then(function () {
    window.VeluneRig.mount($('#heroFigure'), { look: 'gardelame', label: 'Gardelame, classe Gardelame', hideCape: false })
    // Les classes sont déjà affichées avec leur emblème : on les rhabille en vrai.
    VS.showClass(V.classes[0].id)
  })
})()