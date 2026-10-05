/* ══════════════════════════════════════════════════════════════════════════
   VÉLUNE — site. Toutes les données viennent de window.VELUNE, généré par
   tools/build.mjs à partir des fichiers réels du jeu.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict'

  var V = window.VELUNE
  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }

  var el = function (tag, cls, html) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (html != null) n.innerHTML = html
    return n
  }
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }
  var nf = new Intl.NumberFormat('fr-FR')
  var num = function (n) { return nf.format(n) }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)) }

  var EL = V.elements
  var elColor = function (k) { return (EL[k] || EL.neutre).color }
  var elName = function (k) { return (EL[k] || EL.neutre).name }
  var RARITY = {
    commun: { label: 'Commun', color: 'var(--r-commun)' },
    peu_commun: { label: 'Peu commun', color: 'var(--r-peu_commun)' },
    rare: { label: 'Rare', color: 'var(--r-rare)' },
    epique: { label: 'Épique', color: 'var(--r-epique)' },
    legendaire: { label: 'Légendaire', color: 'var(--r-legendaire)' },
  }
  var rarityOf = function (r) { return RARITY[r] || RARITY.commun }

  /* ══════════════════════════════════════════════════════════════════════
     1. Préchargement, navigation, défilement, curseur
     ══════════════════════════════════════════════════════════════════════ */

  var loader = $('#loader')
  var nav = $('#nav')
  var progress = $('#scrollProgress')
  var toTop = $('#toTop')

  window.addEventListener('load', function () {
    setTimeout(function () {
      loader.classList.add('done')
      document.body.classList.remove('is-locked')
      revealScan()
    }, 420)
  })
  setTimeout(function () { loader.classList.add('done') }, 4000)

  // Nav collante + progression + bouton retour en haut
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop
    var h = document.documentElement.scrollHeight - window.innerHeight
    progress.style.transform = 'scaleX(' + (h > 0 ? clamp(y / h, 0, 1) : 0) + ')'
    nav.classList.toggle('stuck', y > 24)
    toTop.classList.toggle('on', y > window.innerHeight * 0.9)
    parallax(y)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }) })

  // Parallaxe du fond du hero
  var heroBg = $('#heroBg')
  function parallax(y) {
    if (!heroBg) return
    if (y > window.innerHeight * 1.3) return
    heroBg.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0) scale(' + (1 + y * 0.00012).toFixed(4) + ')'
  }

  // Menu mobile
  var burger = $('#burger'), navLinks = $('#navLinks')
  burger.addEventListener('click', function () {
    var open = navLinks.classList.toggle('open')
    burger.setAttribute('aria-expanded', String(open))
  })
  navLinks.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('open')
      burger.setAttribute('aria-expanded', 'false')
    }
  })

  // Curseur de Lume
  var glow = $('#cursorGlow')
  if (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var gx = 0, gy = 0, cx = 0, cy = 0, started = false
    window.addEventListener('pointermove', function (e) {
      gx = e.clientX; gy = e.clientY
      if (!started) { started = true; cx = gx; cy = gy; glow.classList.add('on') }
    })
    ;(function follow() {
      cx += (gx - cx) * 0.12
      cy += (gy - cy) * 0.12
      glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'
      requestAnimationFrame(follow)
    })()
  }

  // Révélations au scroll
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return
      e.target.classList.add('in')
      io.unobserve(e.target)
    })
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })

  function revealScan() {
    $$('.reveal:not(.in)').forEach(function (n) {
      // Les éléments déjà visibles au chargement partent immédiatement.
      if (n.getBoundingClientRect().top < window.innerHeight * 0.92) n.classList.add('in')
      else io.observe(n)
    })
  }
  revealScan()

  // Chiffres qui s'incrémentent
  var counters = []
  function countUp(node, to) {
    var start = performance.now()
    var dur = 1300
    function step(now) {
      var k = clamp((now - start) / dur, 0, 1)
      var eased = 1 - Math.pow(1 - k, 3)
      node.textContent = num(Math.round(to * eased))
      if (k < 1) requestAnimationFrame(step)
      else node.textContent = num(to)
    }
    requestAnimationFrame(step)
  }
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return
      countUp(e.target, +e.target.dataset.count)
      cio.unobserve(e.target)
    })
  }, { threshold: 0.4 })

  // Révélation active dans la navigation
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return
      var link = $('.nav-links a[href="#' + e.target.id + '"]')
      if (!link) return
      $$('.nav-links a').forEach(function (a) { a.classList.remove('active') })
      link.classList.add('active')
    })
  }, { rootMargin: '-45% 0px -50% 0px' })
  $$('main > section[id]').forEach(function (s) { spy.observe(s) })

  $('#year').textContent = new Date().getFullYear()

  /* ══════════════════════════════════════════════════════════════════════
     2. Poussière de Lume (canvas)
     ══════════════════════════════════════════════════════════════════════ */
  ;(function lume() {
    var canvas = $('#lumeCanvas')
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    var ctx = canvas.getContext && canvas.getContext('2d')
    if (!ctx) return
    var dpr = Math.min(window.devicePixelRatio || 1, 2)
    var motes = []
    var W = 0, H = 0

    function size() {
      W = canvas.width = innerWidth * dpr
      H = canvas.height = innerHeight * dpr
      canvas.style.width = innerWidth + 'px'
      canvas.style.height = innerHeight + 'px'
      var n = clamp(Math.round(innerWidth / 26), 26, 74)
      motes = []
      for (var i = 0; i < n; i++) {
        motes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: (0.7 + Math.random() * 2.4) * dpr,
          vx: (Math.random() - 0.5) * 0.16 * dpr,
          vy: -(0.05 + Math.random() * 0.26) * dpr,
          a: 0.12 + Math.random() * 0.5,
          p: Math.random() * Math.PI * 2,
          hue: Math.random() < 0.24 ? '201, 167, 255' : '127, 243, 255',
        })
      }
    }
    size()
    addEventListener('resize', size)

    function tick() {
      ctx.clearRect(0, 0, W, H)
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i]
        m.p += 0.012
        m.x += m.vx + Math.sin(m.p) * 0.16 * dpr
        m.y += m.vy
        if (m.y < -12) { m.y = H + 12; m.x = Math.random() * W }
        if (m.x < -12) m.x = W + 12
        if (m.x > W + 12) m.x = -12
        var tw = 0.55 + 0.45 * Math.sin(m.p * 1.7)
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r, 0, 6.2832)
        ctx.fillStyle = 'rgba(' + m.hue + ',' + (m.a * tw).toFixed(3) + ')'
        ctx.shadowBlur = 10 * dpr
        ctx.shadowColor = 'rgba(' + m.hue + ',0.55)'
        ctx.fill()
      }
      ctx.shadowBlur = 0
      requestAnimationFrame(tick)
    }
    tick()
  })()

  /* ══════════════════════════════════════════════════════════════════════
     3. Chiffres du hero + bandeau
     ══════════════════════════════════════════════════════════════════════ */
  var heroFigs = [
    { n: V.counts.maps, l: 'cartes jouables' },
    { n: V.counts.spells, l: 'sorts' },
    { n: V.counts.monsters, l: 'créatures' },
    { n: V.counts.items, l: 'objets' },
    { n: V.counts.recipes, l: 'recettes' },
  ]
  var heroStats = $('#heroStats')
  heroFigs.forEach(function (f, i) {
    var d = el('div', 'hero-fig')
    d.appendChild(el('b', null, '0')).dataset.count = f.n
    d.appendChild(el('span', null, f.l))
    heroStats.appendChild(d)
    var b = d.querySelector('b')
    b.style.setProperty('--d', i * 60 + 'ms')
    cio.observe(b)
  })

  var ticker = $('#ticker')
  var items = heroFigs.concat([
    { n: V.counts.quests, l: 'quêtes' },
    { n: V.counts.villagers, l: 'villageois' },
    { n: V.counts.bosses, l: 'boss' },
    { n: V.counts.jobs, l: 'métiers' },
    { n: V.counts.sets, l: 'panoplies' },
    { n: V.counts.portals, l: 'portails de Lune' },
    { n: V.counts.houses, l: 'maisons à vendre' },
  ])
  var line = items
    .map(function (f) { return '<span class="ticker-item"><b>' + num(f.n) + '</b> ' + f.l + '</span>' })
    .join('')
  ticker.innerHTML = line + line

  /* ══════════════════════════════════════════════════════════════════════
     3b. Notifications
     ══════════════════════════════════════════════════════════════════════ */
  var toastBox = $('#toasts')
  function toast(msg) {
    var t = el('div', 'toast', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v10"/><path d="M8 13l4 4 4-4"/><path d="M5 21h14"/></svg><span>' + esc(msg) + '</span>')
    toastBox.appendChild(t)
    setTimeout(function () { t.remove() }, 3600)
  }
  window.__toast = toast

  /* ══════════════════════════════════════════════════════════════════════
     4. Univers : palette et éléments
     ══════════════════════════════════════════════════════════════════════ */
  ;(function palette() {
    var NAMES = {
      '#0A1328': 'Nuit', '#15284A': 'Ciel', '#2F6070': 'Crépuscule', '#7FF3FF': 'Lume',
      '#C9A7FF': 'Lilas', '#FFD36B': 'Or chaud', '#FFF1D0': 'Crème', '#F6C76B': 'Or',
      '#E89A4A': 'Ambre', '#B5D66B': 'Herbe · pointe', '#8CC152': 'Herbe · claire',
      '#6FA544': 'Herbe · base', '#4E8A3E': 'Herbe · ombre', '#356B3A': 'Herbe · profonde',
      '#E3C08A': 'Terre', '#C9A06A': 'Terre · moyenne', '#A77B4F': 'Terre · foncée',
      '#7A5536': 'Terre · profonde', '#E2DCCD': 'Pierre', '#B8B2A6': 'Pierre · claire',
      '#8C8A86': 'Pierre · moyenne', '#5F6470': 'Pierre · foncée', '#C08A5A': 'Bois',
      '#8A5A3B': 'Bois · moyen', '#6B4028': 'Bois · foncé', '#4A2B1E': 'Bois · profond',
      '#D9694A': 'Toit · terre cuite', '#B24B35': 'Toit · ombre', '#5E7FA3': 'Toit · ardoise',
      '#435D7E': 'Ardoise · ombre', '#9BE3E8': 'Eau · écume', '#4FB6CC': 'Eau',
      '#2F86A6': 'Eau · moyenne', '#1E5E7E': 'Eau · profonde', '#2E3F5C': 'Ombre · teinte',
      '#3B3360': 'Ombre · violet', '#2A2238': 'Contour prune', '#3A2A22': 'Bois d’interface',
      '#D9A94E': 'Laiton', '#8A6326': 'Laiton · foncé', '#F3E4C4': 'Parchemin',
      '#D8434B': 'PV', '#3FB8E8': 'PA', '#6CC24A': 'PM', '#FF8A3D': 'Feu', '#DFF7E0': 'Air',
    }
    var sw = $('#swatches')
    Object.keys(V.palette)
      .sort(function (a, b) { return V.palette[b] - V.palette[a] })
      .slice(0, 30)
      .forEach(function (hex) {
        var b = el('button', 'swatch', '<span>' + hex + '</span>')
        b.style.background = hex
        b.title = (NAMES[hex] || 'Couleur') + ' ' + hex
        b.addEventListener('click', function () {
          if (navigator.clipboard) navigator.clipboard.writeText(hex)
          toast('Couleur copiée : ' + hex + ' — ' + (NAMES[hex] || 'sans nom'))
        })
        sw.appendChild(b)
      })

    var els = $('#elements')
    Object.keys(EL).forEach(function (k) {
      var c = el('span', 'element-chip', '<i></i>' + esc(EL[k].name))
      c.style.setProperty('--c', EL[k].color)
      els.appendChild(c)
    })
  })()

  /* ══════════════════════════════════════════════════════════════════════
     5. Les classes — personnages articulés réels
     ══════════════════════════════════════════════════════════════════════ */
  var ACCENTS = {
    gardelame: '#E89A4A',
    arcaniste: '#C9A7FF',
    sylvetireur: '#8CC152',
    lieur: '#7FF3FF',
  }
  var tabs = $('#classTabs'), panel = $('#classPanel')
  var current = null

  V.classes.forEach(function (c, i) {
    var accent = ACCENTS[c.id] || 'var(--lume)'
    var b = el('button', 'class-tab' + (i === 0 ? ' active' : ''))
    b.style.setProperty('--accent', accent)
    b.setAttribute('role', 'tab')
    b.setAttribute('aria-selected', String(i === 0))
    var img = document.createElement('img')
    img.src = c.emblem
    img.alt = ''
    img.loading = 'lazy'
    b.appendChild(img)
    b.appendChild(el('span', null, '<b>' + esc(c.name) + '</b><small>' + esc(c.role.split('·')[0].trim()) + '</small>'))
    b.addEventListener('click', function () { showClass(c.id) })
    tabs.appendChild(b)
  })

  function showClass(id) {
    current = id
    var c = V.classes.filter(function (x) { return x.id === id })[0]
    var accent = ACCENTS[id] || 'var(--lume)'
    $$('.class-tab').forEach(function (t, i) {
      var on = V.classes[i].id === id
      t.classList.toggle('active', on)
      t.setAttribute('aria-selected', String(on))
    })
    panel.style.setProperty('--accent', accent)
    panel.innerHTML = classHTML(c, accent)
    var fig = $('#classFigure', panel)
    if (fig && window.VeluneRig && window.VeluneRig.ready()) {
      window.VeluneRig.mount(fig, { look: c.look, label: c.name, hideCape: false })
    } else if (fig) {
      fig.innerHTML = '<img src="' + c.emblem + '" alt="" style="width:120px;opacity:.85">'
    }
    $$('.spell-chip', panel).forEach(function (chip) {
      chip.addEventListener('click', function () { openSpell(chip.dataset.id) })
    })
    // Les barres repartent de zéro à chaque changement.
    $$('.stat i', panel).forEach(function (n) { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '' })
  }

  function classHTML(c, accent) {
    var maxHp = c.hp.base + c.hp.perLevel * 199
    var elements = {}
    c.spells.forEach(function (s) {
      s.effects.forEach(function (e) { if (EL[e.el]) elements[e.el] = (elements[e.el] || 0) + 1 })
    })
    var stats = [
      { l: 'PV', v: maxHp, max: 60 + 8 * 199, s: 'PV' },
      { l: 'PA', v: c.ap, max: 7, s: 'PA' },
      { l: 'PM', v: c.mp, max: 6, s: 'PM' },
      { l: 'Initiative', v: c.initiative, max: 140, s: 'Initiative' },
      { l: 'Sorts', v: c.spells.length, max: 30, s: '#7FF3FF' },
      { l: 'Niveau max', v: 200, max: 200, s: '#C9A7FF' },
    ]
    return (
      '<figure class="class-figure" id="classFigure"></figure>' +
      '<div class="class-info">' +
      '<h3>' + esc(c.name) + '</h3>' +
      '<p class="class-role">' + esc(c.role) + '</p>' +
      '<p class="class-desc">' + esc(c.desc) + '</p>' +
      '<p class="class-tip"><span>⚔</span><span>' + esc(c.tip) + '</span></p>' +
      '<p class="class-spec">' + esc(c.spec) + '</p>' +
      '<div class="stats">' +
      stats
        .map(function (s, i) {
          return (
            '<div class="stat"><span>' + s.l + '</span><i style="--sc:' + s.s + ';--v:' +
            ((s.v / s.max) * 100).toFixed(1) + '%;--d:' + i * 70 + 'ms"></i><b>' + num(s.v) + '</b></div>'
          )
        })
        .join('') +
      '</div>' +
      '<div class="res-grid">' +
      Object.keys(c.res)
        .map(function (k) {
          var v = c.res[k]
          return (
            '<div class="res' + (v < 0 ? ' neg' : '') + '" style="--ec:' + elColor(k) + '"><span>' +
            elName(k) + '</span><b>' + (v > 0 ? '+' : '') + v + '</b></div>'
          )
        })
        .join('') +
      '</div>' +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.9rem">' +
      Object.keys(elements)
        .sort(function (a, b) { return elements[b] - elements[a] })
        .map(function (k) {
          return '<span class="pill" style="color:' + elColor(k) + ';border-color:' + elColor(k) + '55;background:' + elColor(k) + '14">' +
            elName(k) + ' · ' + elements[k] + '</span>'
        })
        .join('') +
      '</div>' +
      '<p style="font-size:.76rem;color:var(--txt-mute);margin-bottom:.6rem">' + c.spells.length +
      ' sorts, du niveau ' + Math.min.apply(null, c.spells.map(function (s) { return s.unlock })) + ' au niveau 200</p>' +
      '<div class="spell-strip">' +
      c.spells
        .slice()
        .sort(function (a, b) { return a.unlock - b.unlock })
        .map(function (s) {
          var ec = (s.effects[0] && elColor(s.effects[0].el)) || 'var(--lume)'
          return (
            '<button class="spell-chip" data-id="' + s.id + '" style="--ec:' + ec + '" title="' + esc(s.name) +
            ' — niv. ' + s.unlock + '"><img src="assets/art/icons/spells/' + s.icon + '.svg" alt="">' +
            '<span class="lv">' + s.unlock + '</span></button>'
          )
        })
        .join('') +
      '</div>' +
      '</div>'
    )
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. Combat : grille isométrique animée + règles
     ══════════════════════════════════════════════════════════════════════ */
  ;(function combat() {
    var stage = $('#isoStage')
    var COLS = 9, ROWS = 7
    var HW = 7 // demi-largeur d’une case, en % de la scène (2:1 → HH = HW / 2)
    var HH = HW / 2
    var OX = 43, OY = 38 // origine du losange, pour le centrer dans la scène
    var HERO = { c: 1, r: 5 }
    var FOE = { c: 7, r: 1 }

    // Projections du jeu : i = c − r, j = (c + r) / 2. Distance en déplacement diagonal.
    var isoOf = function (c, r) { return { i: c - r, j: (c + r) / 2 } }
    var dist = function (a, b) {
      var A = isoOf(a.c, a.r), B = isoOf(b.c, b.r)
      return (Math.abs(A.i - B.i) + Math.abs(A.j - B.j)) / 2
    }
    // Chemin A* déterministe : on avance d’abord en colonne, puis en ligne.
    var path = []
    for (var c = HERO.c; c <= FOE.c; c++) path.push({ c: c, r: HERO.r })
    for (var r2 = HERO.r - 1; r2 >= FOE.r; r2--) path.push({ c: FOE.c, r: r2 })
    var onPath = function (c, r) {
      return path.some(function (p) { return p.c === c && p.r === r })
    }
    // Une croix de zone autour de la cible, comme un sort en croix.
    var cross = [{ c: FOE.c, r: FOE.r }, { c: FOE.c - 1, r: FOE.r }, { c: FOE.c + 1, r: FOE.r }, { c: FOE.c, r: FOE.r - 1 }, { c: FOE.c, r: FOE.r + 1 }]
    var inCross = function (c, r) {
      return cross.some(function (p) { return p.c === c && p.r === r })
    }
    var ROCKS = [[3, 3], [4, 4], [3, 4], [5, 2]]

    for (var r3 = 0; r3 < ROWS; r3++) {
      for (var c3 = 0; c3 < COLS; c3++) {
        var p = isoOf(c3, r3)
        var px = OX + p.i * HW
        var py = OY + p.j * HH
        var kind = ''
        if (ROCKS.some(function (k) { return k[0] === c3 && k[1] === r3 })) kind = 'blocked'
        else if (inCross(c3, r3)) kind = 'zone'
        else if (dist({ c: c3, r: r3 }, HERO) <= 3) kind = 'reach'
        else if (onPath(c3, r3)) kind = 'path'
        var n = el('div', 'iso-cell ' + kind)
        n.style.left = px + '%'
        n.style.top = py + '%'
        stage.appendChild(n)
      }
    }
    var hp = isoOf(HERO.c, HERO.r), fp = isoOf(FOE.c, FOE.r)
    stage.insertAdjacentHTML(
      'beforeend',
      '<span class="iso-board" aria-hidden="true"></span>' +
        '<img class="iso-hero" style="left:' + (OX + hp.i * HW) + '%;top:' + (OY + hp.j * HH) + '%" src="assets/art/menu/emblem_gardelame.svg" alt="">' +
        '<img class="iso-foe" style="left:' + (OX + fp.i * HW) + '%;top:' + (OY + fp.j * HH) + '%" src="assets/art/monsters/boletin/portrait.svg" alt="">' +
        '<span class="iso-label">Case logique 128 × 64 px · isométrique 2:1 · 9 × 7 cases</span>' +
        '<div class="iso-legend">' +
        '<span><i style="background:#3FB8E8"></i> Portée du sort (3 PM)</span>' +
        '<span><i style="background:#C9A7FF"></i> Zone d’effet en croix</span>' +
        '<span><i style="background:#F6C76B"></i> Chemin A*</span>' +
        '<span><i style="background:#2E3F5C"></i> Obstacle</span>' +
        '</div>',
    )

    var rules = [
      ['Le tour par tour', 'L’initiative décide qui commence&nbsp;; chaque héros dispose de 6 à 7 PA et de 3 à 4 PM par tour. Un sort coûte de 1 à 7 PA, certains sont rejouables deux fois par tour.'],
      ['Les zones comptent', 'Cinq formes de zone dans le jeu&nbsp;: case unique, cercle, croix, ligne droite et perpendiculaire. Le serveur résout la zone, pas le client.'],
      ['Les boss ne trichent pas', 'Attaques annoncées au sol à esquiver, phases avec renforts, carapace à −80 % de dégâts tant que les gardes vivent, rage si le combat s’éternise.'],
      ['L’écart de niveau compte', 'Niveau 2 contre niveau 5&nbsp;: moitié des dégâts infligés, moitié en plus reçus, dans des limites de ×0,5 à ×1,5.'],
      ['Le groupe se partage', 'Le groupe présent sur la carte combat ensemble, tours limités à 45 s, gains partagés avec bonus de groupe, et le butin pour chacun.'],
      ['Les collisions poussent', '20 % de collision par case au rang 1, 40 % au rang 5&nbsp;: poussées et attirances d’une case de plus au rang maximum.'],
    ]
    $('#rules').innerHTML = rules
      .map(function (r, i) {
        return (
          '<div class="rule-card" style="transition-delay:' + i * 60 + 'ms"><span class="n">' +
          String(i + 1).padStart(2, '0') +
          '</span><div><b>' + r[0] + '</b><p>' + r[1] + '</p></div></div>'
        )
      })
      .join('')

    var bosses = V.bosses.slice().sort(function (a, b) { return a.levels[0] - b.levels[0] })
    $('#bossGrid').innerHTML = bosses
      .map(function (b, i) {
        return (
          '<div class="boss-card" style="transition-delay:' + Math.min(i * 50, 400) + 'ms">' +
          '<img src="' + b.art + '" alt="' + esc(b.name) + '">' +
          '<div><b>' + esc(b.name) + '</b><p>' + esc(b.desc) + '</p>' +
          '<p style="margin-top:.35rem"><span class="pill pill--gold">' + esc(b.family) + '</span> ' +
          '<span class="pill">' + num(b.xp) + ' XP</span></p></div>' +
          '<span class="lvl">niv<br>' + b.levels[0] + '</span></div>'
        )
      })
      .join('')
  })()

  /* ══════════════════════════════════════════════════════════════════════
     7. Modale de détail (sorts, créatures, objets, cartes)
     ══════════════════════════════════════════════════════════════════════ */
  var modal = $('#modal'), modalBox = $('#modalBox')
  var lastFocus = null

  function openModal(html, focusSel) {
    lastFocus = document.activeElement
    modalBox.innerHTML = '<button class="modal-close" data-close aria-label="Fermer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' + html
    modal.classList.add('on')
    modal.setAttribute('aria-hidden', 'false')
    document.body.classList.add('is-locked')
    var target = focusSel ? $(focusSel, modalBox) : $('.modal-close', modalBox)
    if (target) target.focus()
  }
  function closeModal() {
    modal.classList.remove('on')
    modal.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('is-locked')
    if (lastFocus && lastFocus.focus) lastFocus.focus()
  }
  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal()
  })

  function spellById(id) {
    return V.spells.filter(function (s) { return s.id === id })[0]
  }
  function openSpell(id) {
    var s = spellById(id)
    if (!s) return
    var owner = s.owner ? V.classes.filter(function (c) { return c.id === s.owner })[0] : null
    var ec = (s.effects[0] && elColor(s.effects[0].el)) || 'var(--lume)'
    var monsters = s.monsters
      ? V.monsters.filter(function (m) { return s.monsters.indexOf(m.id) > -1 })
      : []
    openModal(
      '<div class="modal-figure" style="--ec:' + ec + '"><img src="assets/art/icons/spells/' + s.icon + '.svg" alt=""></div>' +
        '<h3 class="title-md">' + esc(s.name) + '</h3>' +
        '<p style="color:var(--txt-dim);margin-block:.6rem 0">' + esc(s.desc || '') + '</p>' +
        '<div class="kv">' +
        kv('PA', s.ap) +
        kv('Portée', s.range) +
        kv('Zone', { single: 'Case', circle: 'Cercle', cross: 'Croix', line: 'Ligne', perpendicular: 'Perpendiculaire' }[s.zone] || s.zone) +
        kv('Cible', { any: 'Toutes', enemy: 'Ennemis', ally: 'Alliés', allies: 'Alliés', enemies: 'Ennemis', self: 'Soi-même' }[s.target] || s.target) +
        kv('Ligne de vue', s.los ? 'Oui' : 'Non') +
        kv('Débloqué', 'niv. ' + s.unlock) +
        '</div>' +
        '<h4 style="font-family:var(--sans);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--txt-mute);margin:1rem 0 .5rem">Effets</h4>' +
        '<ul style="display:grid;gap:.4rem">' +
        s.effects
          .map(function (e) {
            return (
              '<li class="tag" style="--ec:' + elColor(e.el) + ';display:flex;justify-content:space-between;width:100%">' +
              '<span>' + esc(e.t) + '</span><b>' + esc(e.v) + (e.turns ? ' · ' + e.turns + ' tour' + (e.turns > 1 ? 's' : '') : '') +
              (e.drain ? ' · ' + Math.round(e.drain * 100) + ' % de vol' : '') + '</b></li>'
            )
          })
          .join('') +
        '</ul>' +
        '<div class="tag-row">' +
        (owner ? '<span class="tag">' + esc(owner.name) + '</span>' : '') +
        (s.perTurn ? '<span class="tag" style="--ec:var(--grass)">2 fois par tour</span>' : '') +
        s.effects
          .filter(function (e) { return e.el && EL[e.el] })
          .map(function (e) { return '<span class="tag" style="--ec:' + elColor(e.el) + '">' + elName(e.el) + '</span>' })
          .join('') +
        '</div>' +
        (monsters.length
          ? '<p style="margin-top:1rem;font-size:.82rem;color:var(--txt-mute)">Utilisé par&nbsp;: ' +
            monsters.map(function (m) { return esc(m.name) }).join(', ') + '</p>'
          : ''),
    )
  }
  function kv(k, v) {
    return '<div><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>'
  }

  function openMonster(id) {
    var m = V.monsters.filter(function (x) { return x.id === id })[0]
    if (!m) return
    var hp = m.hp.base + m.hp.perLevel * (m.levels[1] - 1)
    openModal(
      '<div class="modal-figure" style="--ec:' + (m.boss ? 'var(--hp)' : 'var(--lume)') + '"><img src="' + m.art + '" alt=""></div>' +
        '<div style="display:flex;align-items:center;gap:.7rem;flex-wrap:wrap">' +
        '<h3 class="title-md">' + esc(m.name) + '</h3>' +
        (m.boss ? '<span class="pill" style="color:var(--hp);border-color:#D8434B66;background:#D8434B18">Boss</span>' : '') +
        '</div>' +
        '<p style="color:var(--txt-dim);margin-block:.6rem 1rem">' + esc(m.desc || '') + '</p>' +
        '<div class="kv">' +
        kv('Niveaux', m.levels[0] === m.levels[1] ? String(m.levels[0]) : m.levels[0] + ' – ' + m.levels[1]) +
        kv('PV', num(hp)) +
        kv('PA / PM', m.ap + ' / ' + m.mp) +
        kv('Initiative', m.initiative) +
        kv('Puissance', (m.power > 0 ? '+' : '') + m.power) +
        kv('XP', num(m.xp)) +
        kv('Lunes', m.money ? m.money[0] + ' – ' + m.money[1] : '—') +
        kv('IA', m.ai) +
        '</div>' +
        '<p style="font-size:.8rem;color:var(--txt-mute);margin-bottom:.3rem">Famille&nbsp;: ' + esc(m.family) + '</p>' +
        '<div class="tag-row">' +
        Object.keys(m.res || {})
          .map(function (k) {
            return '<span class="tag" style="--ec:' + elColor(k) + '">' + elName(k) + ' ' + (m.res[k] > 0 ? '+' : '') + m.res[k] + '</span>'
          })
          .join('') +
        '</div>' +
        (m.spells.length
          ? '<h4 style="font-family:var(--sans);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--txt-mute);margin:1.2rem 0 .5rem">Sorts</h4>' +
            '<div class="tag-row">' + m.spells.map(function (x) { return '<span class="tag">' + esc(x) + '</span>' }).join('') + '</div>'
          : '') +
        (m.drops.length
          ? '<h4 style="font-family:var(--sans);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--txt-mute);margin:1.2rem 0 .5rem">Butin</h4>' +
            '<ul style="display:grid;gap:.35rem">' +
            m.drops
              .map(function (d) {
                return (
                  '<li style="display:flex;align-items:center;gap:.6rem;font-size:.84rem">' +
                  (d.icon ? '<img src="assets/art/icons/items/' + d.icon + '.svg" alt="" style="width:24px;height:24px">' : '') +
                  '<span>' + esc(d.name) + '</span>' +
                  '<b style="margin-left:auto;color:var(--gold-hi);font-size:.76rem">' + d.rate + ' %</b></li>'
                )
              })
              .join('') +
            '</ul>'
          : ''),
    )
  }

  function openItem(id) {
    var it = V.items.filter(function (x) { return x.id === id })[0]
    if (!it) return
    var r = rarityOf(it.rarity)
    var set = it.set ? V.panoplies.filter(function (p) { return p.id === it.set })[0] : null
    openModal(
      '<div class="modal-figure" style="--ec:' + r.color + '"><img src="assets/art/icons/items/' + it.icon + '.svg" alt="" style="width:min(140px,44%)"></div>' +
        '<h3 class="title-md">' + esc(it.name) + '</h3>' +
        '<div class="tag-row" style="margin:.5rem 0 1rem">' +
        '<span class="tag" style="--ec:' + r.color + '">' + r.label + '</span>' +
        (it.slot ? '<span class="tag" style="--ec:var(--ap)">' + esc(it.slot) + '</span>' : '') +
        '<span class="tag" style="--ec:var(--gold-hi)">niv. ' + it.level + '</span>' +
        (it.price ? '<span class="tag" style="--ec:var(--gold-hi)">' + num(it.price) + ' ⬡</span>' : '') +
        '</div>' +
        '<p style="color:var(--txt-dim)">' + esc(it.desc || '') + '</p>' +
        (it.stats
          ? '<div style="margin-top:1rem"><p style="font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;color:var(--txt-mute);margin-bottom:.4rem">Bonus</p>' +
            '<p style="color:var(--pm);font-weight:700">' + esc(it.stats) + '</p></div>'
          : '') +
        (set
          ? '<div style="margin-top:1.2rem"><p style="font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;color:var(--txt-mute);margin-bottom:.4rem">Panoplie</p>' +
            '<p style="color:var(--gold-hi)">' + esc(set.name) + ' — ' + set.pieces.length + ' pièces</p>' +
            '<ul class="set-bonus" style="margin-top:.5rem">' +
            set.bonuses.map(function (b) { return '<li><span>' + b.n + ' pièces</span>' + esc(b.stats) + '</li>' }).join('') +
            '</ul></div>'
          : ''),
    )
  }

  function openMap(id, img, label, region, cols, rows) {
    openModal(
      '<div class="modal-figure map"><img src="' + img + '" alt=""></div>' +
        '<h3 class="title-md">' + esc(label) + '</h3>' +
        '<div class="kv">' +
        kv('Région', region || '—') +
        kv('Identifiant', id) +
        kv('Grille', (cols || '?') + ' × ' + (rows || '?') + ' cases') +
        '</div>' +
        '<p style="color:var(--txt-dim)">Une carte = un écran&nbsp;: zone jouable rectangulaire en quinconce, bords habillés de décor, jamais de noir, jamais de carte coupée.</p>',
    )
  }

  window.__veluneOpen = { spell: openSpell, monster: openMonster, item: openItem, map: openMap, modal: openModal, close: closeModal }

  /* ══════════════════════════════════════════════════════════════════════
     8. L’atlas : 367 cartes filtrables
     ══════════════════════════════════════════════════════════════════════ */
  var allMaps = []
  V.atlas.forEach(function (r) {
    r.maps.forEach(function (m) {
      m.regionName = r.name
      allMaps.push(m)
    })
  })

  var atlasGrid = $('#atlasGrid')
  var mapState = { q: '', layer: 'all', region: 'all', limit: 24 }
  var regionChips = V.atlas.filter(function (r) { return r.maps.length >= 2 }).slice(0, 16)

  $('#mapsCount').textContent = num(V.counts.maps)
  $('#layerFilters').innerHTML =
    '<button class="filt active" data-layer="all">Toutes</button>' +
    '<button class="filt" data-layer="surface">Surface</button>' +
    '<button class="filt" data-layer="under">Souterrain</button>'
  $('#regionFilters').innerHTML =
    '<button class="filt active" data-region="all">Toutes les régions</button>' +
    regionChips.map(function (r) { return '<button class="filt" data-region="' + esc(r.name) + '">' + esc(r.name) + ' <span style="opacity:.6">' + r.maps.length + '</span></button>' }).join('')

  function filteredMaps() {
    var q = mapState.q.trim().toLowerCase()
    return allMaps.filter(function (m) {
      if (mapState.layer !== 'all' && m.layer !== mapState.layer) return false
      if (mapState.region !== 'all' && m.regionName !== mapState.region) return false
      if (q && (m.label + ' ' + m.id + ' ' + m.regionName).toLowerCase().indexOf(q) === -1) return false
      return true
    })
  }
  function renderMaps() {
    var list = filteredMaps()
    $('#mapCount').innerHTML = '<b>' + num(list.length) + '</b> cartes'
    if (!list.length) {
      atlasGrid.innerHTML = '<div class="atlas-empty" style="grid-column:1/-1">Aucune carte ne correspond à cette recherche.</div>'
      $('#mapMore').style.display = 'none'
      return
    }
    var shown = list.slice(0, mapState.limit)
    atlasGrid.innerHTML = shown
      .map(function (m) {
        return (
          '<button class="map-card" data-id="' + m.id + '">' +
          '<img src="' + m.img + '" alt="' + esc(m.label) + '" loading="lazy" width="240" height="180">' +
          (m.layer === 'under' ? '<span class="under-tag">Souterrain</span>' : '') +
          '<span class="meta"><b>' + esc(m.label) + '</b><small>' + m.cols + '×' + m.rows + '</small></span>' +
          '</button>'
        )
      })
      .join('')
    $$('.map-card', atlasGrid).forEach(function (card) {
      card.addEventListener('click', function () {
        var m = list.filter(function (x) { return x.id === card.dataset.id })[0]
        openMap(m.id, m.img, m.label, m.regionName, m.cols, m.rows)
      })
    })
    var more = $('#mapMore')
    more.style.display = list.length > mapState.limit ? '' : 'none'
    more.textContent = 'Afficher plus de cartes (' + num(Math.max(0, list.length - mapState.limit)) + ' restantes)'
  }
  $('#mapSearch').addEventListener('input', function (e) { mapState.q = e.target.value; mapState.limit = 24; renderMaps() })
  $('#layerFilters').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    mapState.layer = b.dataset.layer; mapState.limit = 24
    $$('.filt', this).forEach(function (x) { x.classList.toggle('active', x === b) })
    renderMaps()
  })
  $('#regionFilters').addEventListener('click', function (e) {
    var b = e.target.closest('.filt'); if (!b) return
    mapState.region = b.dataset.region; mapState.limit = 24
    $$('.filt', this).forEach(function (x) { x.classList.toggle('active', x === b) })
    renderMaps()
  })
  $('#mapMore').addEventListener('click', function () { mapState.limit += 48; renderMaps() })
  $('#playWorldBtn').addEventListener('click', function () {
    var first = allMaps.filter(function (m) { return m.id === 'hautsaule_place' })[0]
    if (first) openMap(first.id, first.img, first.label, first.regionName, first.cols, first.rows)
  })
  renderMaps()

  window.__veluneAtlas = { open: function (id) {
    var m = allMaps.filter(function (x) { return x.id === id })[0]
    if (m) openMap(m.id, m.img, m.label, m.regionName, m.cols, m.rows)
  } }

  // Points d'entrée pour la seconde moitié du site
  window.VS = {
    V: V, esc: esc, el: el, num: num,
    openSpell: openSpell, openMonster: openMonster, openItem: openItem, openModal: openModal, closeModal: closeModal,
    kv: kv, elColor: elColor, elName: elName, rarityOf: rarityOf, toast: toast,
    showClass: showClass, classHTML: classHTML, ACCENTS: ACCENTS,
  }

  // Première classe affichée tout de suite (le personnage articulé arrive ensuite).
  showClass(V.classes[0].id)
})()