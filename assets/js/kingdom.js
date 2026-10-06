/* ══════════════════════════════════════════════════════════════════════════
   VÉLUNE — le royaume.

   Ce que le site gagne ici, par-dessus le socle de site.js / modules.js :
   · l'accueil cinématique (logo, titre, profondeur au pointeur) ;
   · la carte du monde bâtie sur les vraies coordonnées des cartes du jeu ;
   · l'économie : compteurs, courbe de richesse, raretés, effets de transaction ;
   · le domaine : les maisons en cartes de profondeur, avec acquisition animée ;
   · la fiche du héros : blason, niveau, statistiques, équipement, titres.

   Aucune de ces briques n'est obligatoire : sans GSAP (window.VM absent) ou
   sans mouvement autorisé, le contenu reste écrit tel quel, en statique.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict'

  var V = window.VELUNE
  var VS = window.VS
  var doc = document
  var win = window

  var $ = function (s, r) { return (r || doc).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)) }
  var esc = VS.esc, num = VS.num, el = VS.el

  var nf = new Intl.NumberFormat('fr-FR')
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)) }

  var listOf = function (t) {
    if (!t) return []
    if (typeof t === 'string') return $$(t)
    if (t.nodeType) return [t]
    return Array.prototype.slice.call(t).filter(Boolean)
  }

  // Si GSAP n'a pas été chargé (pas de réseau, script bloqué, test jsdom),
  // on fournit les mêmes primitives en version neutre : le contenu reste
  // écrit et lisible, il ne bouge simplement pas.
  var VM = window.VM || {
    reduced: false,
    fine: true,
    lenis: null,
    gsap: null,
    ease: 'power3.out',
    reveal: function (t) {
      listOf(t).forEach(function (n) { n.classList.add('in') })
    },
    enter: function () {},
    count: function (node, to, opts) {
      var node = listOf(node)[0]
      if (!node) return
      node.textContent = (opts && opts.prefix || '') + Math.round(to).toLocaleString('fr-FR') + (opts && opts.suffix || '')
    },
    depth: function () {},
    tilt: function () {},
    magnetic: function () {},
    parallax: function () {},
    meter: function () {},
    pulse: function () {},
    refresh: function () {},
    scrollTo: function (t) {
      var node = listOf(t)[0]
      if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'auto', block: 'start' })
    },
  }
  var A = VM.gsap // null si GSAP n'a pas été chargé

  /* ══════════════════════════════════════════════════════════════════════
     0. Accroche : on attend que le préchargement soit terminé
     ══════════════════════════════════════════════════════════════════════ */
  var loader = $('#loader')
  var ready = false
  var waiting = []
  function boot(fn) {
    if (ready) return fn()
    waiting.push(fn)
  }
  function flush() {
    if (ready) return
    ready = true
    waiting.splice(0).forEach(function (fn) {
      try { fn() } catch (e) { if (win.console) console.warn('[velune]', e) }
    })
  }
  if (loader) {
    new MutationObserver(function () {
      if (loader.classList.contains('done')) flush()
    }).observe(loader, { attributes: true, attributeFilter: ['class'] })
    // Filet de sécurité : si le préchargement n'est jamais retiré (script bloqué,
    // plugin, Capture), le site ne reste pas derrière un voile noir.
    setTimeout(flush, 5000)
  } else {
    flush()
  }

  /* ══════════════════════════════════════════════════════════════════════
     1. Accueil cinématique
     ══════════════════════════════════════════════════════════════════════ */
  ;(function heroReveal() {
    var hero = $('#hero')
    if (!hero || !A) return

    var copy = $('.hero-copy', hero)
    var fig = $('.hero-hero', hero)
    var cue = $('.scroll-cue', hero)
    var title = $('#heroTitle')

    // On masque d'abord, on joue ensuite : pas de clignotement à l'arrivée.
    var targets = [
      $('.hero-eyebrow', hero),
      title,
      $('.hero-sub', hero),
      $('.hero-actions', hero),
      $('#heroStats'),
      fig,
      cue,
    ].filter(Boolean)
    A.set(targets, { autoAlpha: 0 })
    A.set('.hero-eyebrow, .hero-sub, .hero-actions, .hero-figs', { y: 26 })
    A.set(title, { y: 40 })
    A.set(fig, { scale: 0.9, y: 34 })

    // Profondeur multicouche au pointeur : le fond, la brume, la crête, le héros.
    VM.depth(hero, { strength: 54 })

    // Le logo du préchargement : un dernier coup de projecteur avant le rideau.
    var mark = $('.loader-mark')
    // La navigation part du haut : c'est le seul état qu'on pose hors timeline.
    A.set('#nav', { yPercent: -100 })

    boot(function () {
      var tl = A.timeline({ defaults: { ease: VM.ease } })
      if (mark) {
        tl.to(mark, { scale: 1.5, rotate: 24, duration: 0.7, ease: 'power2.in' }, 0)
          .to('.loader-word', { letterSpacing: '1.1em', opacity: 0.25, duration: 0.6 }, 0)
      }
      tl.add(function () { loader && loader.classList.add('done') }, 0.06)
        // La navigation tombe en même temps que le rideau : tout est dans la
        // même timeline, donc tout est piloté par le même temps.
        .fromTo('#nav', { yPercent: -100 }, { yPercent: 0, duration: 0.9, ease: 'power3.out' }, 0.1)
        .to(targets[0], { autoAlpha: 1, y: 0, duration: 0.8 }, 0.18)
        .to(title, { autoAlpha: 1, y: 0, duration: 1.05 }, 0.26)
        .to('.hero-sub', { autoAlpha: 1, y: 0, duration: 0.9 }, 0.52)
        .to('.hero-actions > *', { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.09 }, 0.66)
        .to(fig, { autoAlpha: 1, scale: 1, y: 0, duration: 1.25 }, 0.34)
        .to('#heroStats .hero-fig', { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.8)
        .to(cue, { autoAlpha: 1, y: 0, duration: 0.8 }, 1.05)
      // Les boutons tirent légèrement vers le pointeur.
      VM.magnetic('.hero-actions .btn', { pull: 0.22 })
      VM.refresh()
    })

    // Si la timeline n'a pas pu jouer, on ne laisse rien d'invisible.
    setTimeout(function () { A.set(targets, { clearProps: 'opacity,visibility,transform' }) }, 6500)
  })()

  /* ══════════════════════════════════════════════════════════════════════
     2. Navigation : menu mobile qui se déploie, lien actif qui respire
     ══════════════════════════════════════════════════════════════════════ */
  ;(function navMotion() {
    var links = $('#navLinks')
    if (!links) return
    var burger = $('#burger')
    if (!burger || !A) return

    burger.addEventListener('click', function () {
      var open = links.classList.contains('open')
      if (VM.reduced) return
      if (open) {
        A.to($$('a', links), { x: -18, opacity: 0, duration: 0.28, stagger: 0.035, ease: 'power2.in' })
      } else {
        A.fromTo(
          $$('a', links),
          { x: -22, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.05, delay: 0.12, ease: VM.ease },
        )
      }
    })
  })()

  /* ══════════════════════════════════════════════════════════════════════
     3. La carte du monde
     ──────────────────────────────────────────────────────────────────────
     Le jeu place ses 375 cartes sur une grille (c, r) : c vers l'est, r vers
     le sud. On dessine cette grille telle quelle — c'est la vraie géographie
     de Vélune, pas une carte décorative.
     ══════════════════════════════════════════════════════════════════════ */
  ;(function worldMap() {
    var stage = $('#wmStage')
    var canvas = $('#wmCanvas')
    var land = $('#wmLand')
    var pins = $('#wmPins')
    var panel = $('#wmPanel')
    var panelInner = $('#wmPanelInner')
    if (!stage || !canvas || !land || !pins || !V.world) return

    var CELL = 24
    var maps = V.atlas.flatMap(function (r) { return r.maps })
    var bounds = V.world
    var minC = bounds.min[0], maxC = bounds.max[0]
    var minR = bounds.min[1], maxR = bounds.max[1]
    var COLS = maxC - minC + 1
    var ROWS = maxR - minR + 1

    // Une couleur stable par région, tirée de la bible graphique du jeu.
    var REALM_TONES = ['#2F6070', '#4E8A3E', '#8C8A86', '#7A5536', '#5E7FA3', '#8A6326', '#3B3360', '#6FA544', '#A77B4F', '#435D7E', '#6B4028', '#4FB6CC']
    var toneOf = {}
    V.world.realms.forEach(function (r, i) { toneOf[r.name] = REALM_TONES[i % REALM_TONES.length] })

    var realmOf = {}
    maps.forEach(function (m) { realmOf[m.id] = m.regionName })

    // ── La grille du monde, en tuiles. Une tuile = une carte du jeu.
    var html = ''
    maps.forEach(function (m) {
      if (!m.coords) return
      var x = (m.coords[0] - minC) * CELL
      var y = (m.coords[1] - minR) * CELL
      var under = m.layer === 'under'
      var tone = toneOf[m.regionName] || '#435D7E'
      html +=
        '<i class="wm-tile' + (under ? ' under' : '') + '" data-id="' + esc(m.id) + '" ' +
        'style="--x:' + x + 'px;--y:' + y + 'px;--tone:' + tone + '" title="' + esc(m.label) + '"></i>'
    })
    land.innerHTML = html
    // La caméra a la taille du monde : c'est elle qui est centrée et zoomée.
    canvas.style.width = COLS * CELL + 'px'
    canvas.style.height = ROWS * CELL + 'px'
    canvas.style.marginLeft = -(COLS * CELL) / 2 + 'px'
    canvas.style.marginTop = -(ROWS * CELL) / 2 + 'px'
    land.style.width = COLS * CELL + 'px'
    land.style.height = ROWS * CELL + 'px'

    var tiles = $$('.wm-tile', land)

    // ── Marqueurs : un domaine par région, plus les lieux à la une.
    var pinsHTML = ''
    V.world.realms
      .filter(function (r) { return r.maps >= 4 })
      .forEach(function (r) {
        var x = (r.center[0] - minC) * CELL + CELL / 2
        var y = (r.center[1] - minR) * CELL + CELL / 2
        var open = V.atlas.filter(function (a) { return a.name === r.name })[0]
        var img = open && open.maps[0] ? open.maps[0].img : ''
        // Un marqueur près du bord droit ouvre son étiquette vers la gauche,
        // sinon elle sortirait de la fenêtre sur mobile.
        var edge = x > COLS * CELL * 0.7 || x < COLS * CELL * 0.12
        pinsHTML +=
          '<button class="wm-pin' + (r.layer === 'under' ? ' under' : '') + (edge ? ' wm-pin--flip' : '') + '" data-realm="' + esc(r.name) + '" ' +
          'style="--x:' + x + 'px;--y:' + y + 'px" ' +
          'aria-label="Domaine ' + esc(r.name) + ', ' + r.maps + ' cartes">' +
          '<span class="wm-pin-dot"></span>' +
          '<span class="wm-pin-ring"></span>' +
          '<span class="wm-pin-label">' + esc(r.name) + '<small>' + r.maps + ' cartes</small></span>' +
          (img ? '<img src="' + img + '" alt="" loading="lazy">' : '') +
          '</button>'
      })
    pins.innerHTML = pinsHTML

    /* ── Caméra : échelle et translation, animées par GSAP ─────────────── */
    var view = { z: 1, x: 0, y: 0 }
    var limits = { w: 0, h: 0 }

    function fitScale() {
      var box = stage.getBoundingClientRect()
      if (!box.width) return 1
      var sx = box.width / (COLS * CELL)
      var sy = box.height / (ROWS * CELL)
      return Math.min(sx, sy)
    }
    function apply() {
      canvas.style.transform =
        'translate3d(' + view.x.toFixed(2) + 'px,' + view.y.toFixed(2) + 'px,0) scale(' + view.z.toFixed(4) + ')'
    }
    function clampView() {
      var box = stage.getBoundingClientRect()
      var contentW = COLS * CELL * view.z
      var contentH = ROWS * CELL * view.z
      // On ne laisse jamais voir plus que le bord de la carte si elle déborde.
      limits.w = Math.max(0, (contentW - box.width) / 2)
      limits.h = Math.max(0, (contentH - box.height) / 2)
      view.x = clamp(view.x, -limits.w, limits.w)
      view.y = clamp(view.y, -limits.h, limits.h)
    }
    function setZoom(z, fx, fy) {
      z = clamp(z, 0.45, 3.4)
      var box = stage.getBoundingClientRect()
      // Le zoom se fait vers le point visé : la carte reste sous le curseur.
      var ox = fx != null ? fx - box.width / 2 : 0
      var oy = fy != null ? fy - box.height / 2 : 0
      var k = z / view.z
      view.x = ox - (ox - view.x) * k
      view.y = oy - (oy - view.y) * k
      view.z = z
      clampView()
      apply()
      var label = $('#wmZoomLabel')
      if (label) label.textContent = Math.round(z / fitScale() * 100) + ' %'
    }
    function zoomTo(z, node) {
      var target = node ? (node.offsetLeft - (COLS * CELL) / 2) : 0
      var targetY = node ? (node.offsetTop - (ROWS * CELL) / 2) : 0
      if (!A) {
        setZoom(z); return
      }
      A.to(view, {
        z: z,
        x: A.utils.clamp(target * z, -limits.w || 1e6, limits.w || 1e6),
        y: A.utils.clamp(targetY * z, -limits.h || 1e6, limits.h || 1e6),
        duration: 0.9,
        ease: VM.easeSoft,
        onUpdate: function () { clampView(); apply() },
        onComplete: function () { updateLabel() },
      })
    }
    function updateLabel() {
      var label = $('#wmZoomLabel')
      if (label) label.textContent = Math.round((view.z / fitScale()) * 100) + ' %'
    }

    // Position initiale : le monde entier, à l'échelle.
    function reset(instant) {
      var s = fitScale()
      var to = { z: s, x: 0, y: 0 }
      clampView()
      if (instant || !A) {
        view.z = s; view.x = 0; view.y = 0
        clampView(); apply(); updateLabel()
        return
      }
      A.to(view, { z: s, x: 0, y: 0, duration: 0.9, ease: VM.easeSoft, onUpdate: apply, onComplete: updateLabel })
    }
    view.z = fitScale()

    /* ── Glisser-déposer : on déplace la carte, pas la page ───────────── */
    var drag = null
    canvas.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.wm-pin')) return
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }
      canvas.setPointerCapture(e.pointerId)
      stage.classList.add('is-dragging')
    })
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return
      var dx = e.clientX - drag.x
      var dy = e.clientY - drag.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
      view.x = drag.vx + dx
      view.y = drag.vy + dy
      clampView()
      apply()
    })
    function endDrag(e) {
      if (!drag) return
      var moved = drag.moved
      drag = null
      stage.classList.remove('is-dragging')
      if (canvas.hasPointerCapture && e && e.pointerId != null) {
        try { canvas.releasePointerCapture(e.pointerId) } catch (err) { /* déjà relâché */ }
      }
      if (!moved) return
      // Un glissement qui dépasse un seuil recentre la carte : sinon on
      // peut se retrouver perdu dans une région auzoom maximal.
      if (view.z > fitScale() * 1.35 && (Math.abs(view.x) > limits.w || Math.abs(view.y) > limits.h)) reset()
    }
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)
    canvas.addEventListener('lostpointercapture', endDrag)

    /* ── Zoom aux boutons et au clavier (jamais à la molette : le défilement
          de la page doit rester naturel) ───────────────────────────────── */
    $$('[data-zoom]').forEach(function (b) {
      b.addEventListener('click', function () {
        setZoom(view.z * (b.dataset.zoom === 'in' ? 1.5 : 1 / 1.5))
        if (A) A.fromTo(b, { scale: 0.86 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' })
      })
    })
    var resetBtn = $('#wmReset')
    if (resetBtn) resetBtn.addEventListener('click', function () { reset(); showWelcome() })
    canvas.addEventListener('keydown', function (e) {
      var step = 60
      var keys = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
      if (keys[e.key]) {
        e.preventDefault()
        view.x += keys[e.key][0]
        view.y += keys[e.key][1]
        clampView(); apply()
      } else if (e.key === '+' || e.key === '=') setZoom(view.z * 1.4)
      else if (e.key === '-') setZoom(view.z / 1.4)
      else if (e.key === '0') reset()
    })

    var layerToggle = $('#wmLayer')
    if (layerToggle) {
      layerToggle.addEventListener('change', function () {
        var under = !this.checked
        land.classList.toggle('no-under', under)
        pins.classList.toggle('no-under', under)
        updateLabel()
      })
    }

    /* ── Panneau d'un domaine ──────────────────────────────────────────── */
    function showWelcome() {
      panelInner.innerHTML =
        '<div class="wm-panel-welcome">' +
        '<span class="kicker">Comment lire cette carte</span>' +
        '<p>Chaque tuile est une carte jouable du jeu, posée à sa vraie place : ' +
        num(maps.length) + ' tuiles, ' + num(V.world.realms.length) + ' domaines, du nord des Cimes de Givre au sud de l’île.</p>' +
        '<p class="wm-panel-hint">Cliquez un marqueur pour ouvrir le domaine&nbsp;; glissez pour naviguer.</p>' +
        '</div>'
      if (panel) panel.classList.remove('is-open')
    }

    function openRealm(name) {
      var region = V.atlas.filter(function (a) { return a.name === name })[0]
      if (!region) return
      var sample = region.maps.slice(0, 4)
      var totalCells = region.maps.reduce(function (s, m) { return s + m.cols * m.rows }, 0)
      panelInner.innerHTML =
        '<div class="wm-panel-head">' +
        '<span class="kicker">Domaine</span>' +
        '<h4>' + esc(name) + '</h4>' +
        '<button class="wm-close" aria-label="Fermer le domaine">✕</button>' +
        '</div>' +
        '<div class="wm-panel-figs">' +
        '<div><b>' + num(region.maps.length) + '</b><small>cartes</small></div>' +
        '<div><b>' + num(totalCells) + '</b><small>cases jouables</small></div>' +
        '<div><b>' + (region.layer === 'under' ? 'Souterrain' : 'Surface') + '</b><small>couche</small></div>' +
        '</div>' +
        '<div class="wm-panel-maps">' +
        sample.map(function (m) {
          return (
            '<button class="wm-thumb" data-id="' + esc(m.id) + '">' +
            '<img src="' + m.img + '" alt="' + esc(m.label) + '" loading="lazy">' +
            '<span>' + esc(m.label) + '</span></button>'
          )
        }).join('') +
        '</div>' +
        (region.maps.length > sample.length
          ? '<p class="wm-panel-foot">+' + num(region.maps.length - sample.length) + ' autres cartes dans l’atlas, sous la carte du monde.</p>'
          : '')
      $$('.wm-thumb', panelInner).forEach(function (b) {
        b.addEventListener('click', function () { window.__veluneAtlas && window.__veluneAtlas.open(b.dataset.id) })
      })
      var close = $('.wm-close', panelInner)
      if (close) close.addEventListener('click', showWelcome)

      if (panel) {
        panel.classList.add('is-open')
        if (A && !VM.reduced) {
          A.fromTo(
            panel,
            { opacity: 0, x: 26 },
            { opacity: 1, x: 0, duration: 0.62, ease: VM.ease, onComplete: function () { VM.refresh() } },
          )
          A.fromTo(
            $$('.wm-panel-maps .wm-thumb', panelInner),
            { opacity: 0, y: 18, scale: 0.94 },
            { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.06, ease: VM.ease, delay: 0.12 },
          )
        }
      }
    }

    $$('.wm-pin', pins).forEach(function (pin) {
      var name = pin.dataset.realm
      var node = tiles.filter(function (t) { return realmOf[t.dataset.id] === name })[0]
      pin.addEventListener('click', function (e) {
        e.stopPropagation()
        $$('.wm-pin', pins).forEach(function (p) { p.classList.toggle('is-active', p === pin) })
        openRealm(name)
        if (node) zoomTo(fitScale() * 2.6, node)
        if (A) {
          A.fromTo(pin.querySelector('.wm-pin-ring'), { scale: 0.6, opacity: 1 }, { scale: 2.4, opacity: 0, duration: 0.85, ease: 'power2.out' })
        }
      })
      pin.addEventListener('pointerenter', function () {
        if (A) A.to(pin, { '--pin': 1, duration: 0.4, ease: VM.ease })
      })
      pin.addEventListener('pointerleave', function () {
        if (A) A.to(pin, { '--pin': 0, duration: 0.5, ease: VM.ease })
      })
    })

    // Survol d'une tuile : on montre la carte, sans quitter le domaine.
    land.addEventListener('pointerover', function (e) {
      var tile = e.target.closest('.wm-tile')
      if (!tile) return
      tile.classList.add('is-hot')
    })
    land.addEventListener('pointerout', function (e) {
      var tile = e.target.closest('.wm-tile')
      if (tile) tile.classList.remove('is-hot')
    })
    land.addEventListener('click', function (e) {
      var tile = e.target.closest('.wm-tile')
      if (tile && window.__veluneAtlas) window.__veluneAtlas.open(tile.dataset.id)
    })

    boot(function () {
      reset(true)
      showWelcome()
      // Les domaines émergent l'un après l'autre, du plus grand au plus petit.
      if (A && !VM.reduced) {
        A.fromTo(
          tiles,
          { autoAlpha: 0, scale: 0.2, transformOrigin: '50% 50%' },
          {
            autoAlpha: 1, scale: 1, duration: 0.75,
            stagger: { each: 0.0035, from: 'random' },
            ease: 'back.out(1.6)',
            onComplete: function () { VM.refresh() },
          },
        )
        A.fromTo(
          $$('.wm-pin', pins),
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.045, delay: 0.5, ease: VM.ease },
        )
      }
      VM.refresh()
    })

    var resizeTimer
    win.addEventListener('resize', function () {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(function () {
        var s = fitScale()
        view.z = s
        view.x = 0
        view.y = 0
        clampView()
        apply()
        updateLabel()
      }, 180)
    }, { passive: true })
  })()

/* ══════════════════════════════════════════════════════════════════════
     4. L'économie
     ──────────────────────────────────────────────────────────────────────
     Écrit à plat : une fonction par ouvrage, aucune imbrication profonde.
     ══════════════════════════════════════════════════════════════════════ */
  ;(function economy() {
    var E = V.economy
    if (!E) return

    var ledger = $('#econLedger')
    var plot = $('#econPlot')
    var sources = $('#econSources')
    var tiers = $('#econTiers')

    /* ── Le registre : six chiffres du jeu, pas six chiffres décoratifs ── */
    var LEDGER = [
      { label: 'Pièces en vente', value: E.pricedItems, note: 'objets qui ont un prix', color: 'var(--lume)', suffix: '' },
      { label: 'Prix médian', value: E.medianPrice, note: 'la moitié des pièces coûte moins cher', color: 'var(--lume)', suffix: ' ⬡' },
      { label: 'La plus chère', value: E.dearest, note: 'la moins chère : ' + num(E.cheapest) + ' ⬡', color: 'var(--gold-hi)', suffix: ' ⬡' },
      { label: 'Butin de chasse', value: E.totalLoot, note: 'les ' + num(V.counts.monsters) + ' créatures, en moyenne', color: 'var(--amber)', suffix: ' ⬡' },
      { label: 'Journal des quêtes', value: E.totalQuests, note: 'primes cumulées, tous paliers', color: 'var(--violet)', suffix: ' ⬡' },
      { label: 'Valeur du domaine', value: E.estateValue, note: 'les ' + num(V.counts.houses) + ' maisons en liste', color: 'var(--grass)', suffix: ' ⬡' },
    ]

    function buildLedger() {
      if (!ledger) return
      ledger.innerHTML = LEDGER.map(function (l) {
        return '<div class="econ-cell" style="--c:' + l.color + '">' +
          '<span class="econ-cell-label">' + esc(l.label) + '</span>' +
          '<b class="econ-cell-value" data-to="' + l.value + '" data-suffix="' + esc(l.suffix) + '">' + l.suffix + '0' + l.suffix + '</b>' +
          '<small>' + esc(l.note) + '</small>' +
          '</div>'
      }).join('')
    }

    /* ── La courbe de richesse, tracée puis révélée ─────────────────────── */
    var bands = E.curve
    var maxWealth = Math.max.apply(null, bands.map(function (b) { return b.total })) || 1

    function sayBand(i) {
      var out = $('#econReadout', plot)
      var b = bands[i]
      if (!out || !b) return
      out.innerHTML = '<b>' + num(b.money) + ' ⬡</b><span>palier ' + esc(b.label) + ' · ' +
        num(b.quests) + ' quêtes · ' + num(b.xp) + ' XP cumulés</span>'
    }

    function drawPlot() {
      if (!plot) return
      var W = 100, H = 42
      var pts = bands.map(function (b, i) {
        var x = bands.length > 1 ? (i / (bands.length - 1)) * W : W / 2
        var y = H - (b.total / maxWealth) * (H - 6) - 3
        return { x: x, y: y }
      })
      var line = pts.map(function (p, i) {
        return (i ? 'L' : 'M') + p.x.toFixed(2) + ',' + p.y.toFixed(2)
      }).join(' ')
      var area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z'

      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs><linearGradient id="econFill" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#7FF3FF" stop-opacity=".34"/>' +
        '<stop offset="100%" stop-color="#7FF3FF" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        '<path class="econ-area" d="' + area + '"/>' +
        '<path class="econ-line" d="' + line + '"/>'
      pts.forEach(function (p, i) {
        svg += '<circle class="econ-dot" data-i="' + i + '" cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="0.9"/>'
      })
      svg += '</svg>'

      var bars = '<div class="econ-bars">'
      bands.forEach(function (b, i) {
        var h = ((b.money / maxWealth) * 100).toFixed(1)
        bars += '<div class="econ-bar" data-i="' + i + '" tabindex="0">' +
          '<i style="--h:' + h + '%"></i>' +
          '<span>' + esc(b.label) + '</span>' +
          '<small>' + (b.quests ? b.quests + ' quêtes' : '—') + '</small>' +
          '</div>'
      })
      bars += '</div><div class="econ-readout" id="econReadout"></div>'

      plot.innerHTML = svg + bars
      sayBand(bands.length - 1)

      $$('.econ-bar', plot).forEach(function (bar) {
        bar.addEventListener('pointerenter', function () { sayBand(+bar.dataset.i) })
        bar.addEventListener('focus', function () { sayBand(+bar.dataset.i) })
      })

      if (!A || VM.reduced) return
      var path = $('.econ-line', plot)
      var len = path.getTotalLength ? path.getTotalLength() : 1000
      A.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.9, ease: VM.easeSoft })
      A.fromTo($('.econ-area', plot), { opacity: 0 }, { opacity: 1, duration: 1.4, delay: 0.5 })
      A.fromTo($$('.econ-bar i', plot), { scaleY: 0 },
        { scaleY: 1, duration: 0.9, stagger: 0.08, delay: 0.25, ease: VM.ease, transformOrigin: '50% 100%' })
      A.fromTo($$('.econ-dot', plot), { scale: 0 },
        { scale: 1, duration: 0.5, stagger: 0.09, delay: 0.9, ease: 'back.out(2.4)' })
    }

    /* ── D'où vient la monnaie ──────────────────────────────────────────── */
    function buildSources() {
      if (!sources) return
      var max = Math.max.apply(null, E.sources.map(function (s) { return s.value })) || 1
      sources.innerHTML = E.sources.map(function (s, i) {
        var w = ((s.value / max) * 100).toFixed(1)
        return '<button class="econ-source" data-i="' + i + '" style="--c:' + s.color + '">' +
          '<span class="econ-source-head"><b>' + esc(s.name) + '</b><em data-to="' + s.value + '">' + num(s.value) + ' ⬡</em></span>' +
          '<i class="econ-source-bar"><u style="--w:' + w + '%"></u></i>' +
          '<small>' + esc(s.blurb) + '</small>' +
          '</button>'
      }).join('')
    }

    function wireSources() {
      if (!sources) return
      $$('.econ-source', sources).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var s = E.sources[+btn.dataset.i]
          if (s) transaction(btn, s.value, s.name)
        })
      })
    }

    /* ── Le marché, du Commun au Légendaire ────────────────────────────── */
    function buildTiers() {
      if (!tiers) return
      var max = Math.max.apply(null, E.tiers.map(function (t) { return t.median })) || 1
      tiers.innerHTML = E.tiers.map(function (t) {
        var c = VS.rarityOf(t.rarity).color
        var h = ((t.median / max) * 100).toFixed(1)
        return '<button class="econ-tier" data-rarity="' + t.rarity + '" style="--c:' + c + ';--h:' + h + '%">' +
          '<span class="econ-tier-label">' + esc(VS.rarityOf(t.rarity).label) + '</span>' +
          '<b data-to="' + t.median + '">' + num(t.median) + '</b><em>⬡ médian</em>' +
          '<i class="econ-tier-bar"><u></u></i>' +
          '<small>' + num(t.count) + ' objets · jusqu’à ' + num(t.top) + ' ⬡</small>' +
          '</button>'
      }).join('')

      $$('.econ-tier', tiers).forEach(function (b) {
        b.addEventListener('click', function () { quoteRarity(b.dataset.rarity) })
      })
    }

    function quoteRarity(rarity) {
      var items = V.items.filter(function (x) { return x.rarity === rarity })
      if (!items.length) return
      var prices = items.map(function (x) { return x.price }).filter(Boolean)
      var dearest = items.reduce(function (a, c) { return (c.price || 0) > (a.price || 0) ? c : a }, items[0])
      var lo = prices.length ? Math.min.apply(null, prices) : 0
      VS.toast(VS.rarityOf(rarity).label + ' — ' + items.length + ' objets, de ' + num(lo) +
        ' à ' + num(dearest.price) + ' ⬡ pour « ' + dearest.name + ' ».')
      VM.pulse($('.econ-tier[data-rarity="' + rarity + '"]', tiers), { scale: 1.06 })
    }

    /* ── Une transaction : on voit l'argent changer de place ────────────── */
    function transaction(node, amount, label) {
      if (!A || VM.reduced) {
        VS.toast(label + ' — ' + num(amount) + ' ⬡.')
        return
      }
      var host = $('#economie')
      var counter = $('.econ-cell-value', ledger)
      if (!host || !counter) return
      var hostBox = host.getBoundingClientRect()
      var from = node.getBoundingClientRect()
      var to = counter.getBoundingClientRect()
      var x = from.left + from.width / 2 - hostBox.left
      var y = from.top + from.height / 2 - hostBox.top
      var dx = to.left + to.width / 2 - hostBox.left - x
      var dy = to.top + to.height / 2 - hostBox.top - y

      var spark = el('div', 'econ-spark')
      spark.style.left = x + 'px'
      spark.style.top = y + 'px'
      host.appendChild(spark)

      var coin = el('i', 'econ-coin', '⬡')
      coin.style.left = x + 'px'
      coin.style.top = y + 'px'
      host.appendChild(coin)

      A.timeline({ onComplete: function () { spark.remove(); coin.remove() } })
        .fromTo(spark, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power2.out' })
        .to(coin, { x: dx, y: dy, scale: 0.4, opacity: 0, duration: 0.75, ease: 'power2.inOut' }, 0.12)
        .to(spark, { opacity: 0, duration: 0.35 }, 0.3)
        .add(function () { VM.pulse(counter, { scale: 1.05 }) }, 0.82)

      VS.toast(label + ' — ' + num(amount) + ' ⬡ versés à votre porte-monnaie.')
    }

    /* ── Branchement ───────────────────────────────────────────────────── */
    buildLedger()
    buildSources()
    buildTiers()
    wireSources()

    var legend = $('#econLegend')
    if (legend) {
      legend.innerHTML =
        '<span><i style="--c:#7FF3FF"></i>Lunes gagnées au journal, cumulées</span>' +
        '<span><i style="--c:#C9A7FF"></i>Au-delà du niveau 99, le jeu n’écrit encore aucune quête</span>'
    }
    var edge = $('#econEdge')
    if (edge) {
      edge.innerHTML = 'Le Tripot garde <b>' + esc(E.casinoEdge) + '</b> de chaque mise. Partout ailleurs, ' +
        'la monnaie circule : elle se gagne, se dépense et se revend.'
    }

    boot(function () {
      drawPlot()

      VM.reveal('.econ-ledger > .econ-cell', { y: 26, stagger: 0.05 })
      $$('.econ-cell-value', ledger).forEach(function (node) {
        VM.count(node, +node.dataset.to, { suffix: node.dataset.suffix || '' })
      })
      $$('.econ-source em', sources).forEach(function (node) {
        VM.count(node, +node.dataset.to, { suffix: ' ⬡', duration: 1.2 })
      })
      $$('.econ-tier b', tiers).forEach(function (node) {
        VM.count(node, +node.dataset.to, { duration: 1.3 })
      })
      VM.reveal('.econ-source', { y: 22, stagger: 0.06 })
      VM.reveal('.econ-tier', { y: 26, stagger: 0.07 })

      if (A && !VM.reduced) {
        A.fromTo($$('.econ-source-bar u', sources), { scaleX: 0 },
          { scaleX: 1, duration: 1.1, stagger: 0.09, delay: 0.15, ease: VM.easeSoft, transformOrigin: '0% 50%' })
        A.fromTo($$('.econ-tier-bar u', tiers), { scaleY: 0 },
          {
            scaleY: 1, duration: 1, stagger: 0.08, ease: VM.ease, transformOrigin: '50% 100%',
            scrollTrigger: { trigger: tiers, start: 'top 92%', once: true },
          })
      }
      VM.refresh()
    })
  })()

  /* ══════════════════════════════════════════════════════════════════════
     5. Le domaine : les maisons, en cartes de profondeur
     ══════════════════════════════════════════════════════════════════════ */
  ;(function estate() {
    var grid = $('#housesGrid')
    var ledger = $('#estateLedger')
    if (!grid) return
    var cards = $$('.house-card', grid)
    if (!cards.length) return

    var houses = V.houses
    var prices = houses.map(function (h) { return h.price || 0 }).filter(Boolean)
    var minP = Math.min.apply(null, prices)
    var maxP = Math.max.apply(null, prices)
    var avgP = Math.round(prices.reduce(function (a, b) { return a + b }, 0) / prices.length)
    var owned = {}

    // Le compteur de la lede vient des données, pas d'une phrase en dur.
    var countNode = $('#estateCount')
    if (countNode) countNode.textContent = num(houses.length)

    if (ledger) {
      ledger.innerHTML =
        '<div class="estate-cell"><span>En liste</span><b data-to="' + houses.length + '">0</b><small>maisons, une par compte</small></div>' +
        '<div class="estate-cell"><span>Leastchère</span><b data-to="' + minP + '">0</b><small>' + num(minP) + ' ⬡ — la chaumière</small></div>' +
        '<div class="estate-cell"><span>Prix moyen</span><b data-to="' + avgP + '">0</b><small>toutes confondues</small></div>' +
        '<div class="estate-cell"><span>La plus belle</span><b data-to="' + maxP + '">0</b><small>' + num(maxP) + ' ⬡ — le château</small></div>'
    }

    // Chaque carte gagne sa profondeur, sa région et son bouton d'acquisition.
    cards.forEach(function (card, i) {
      var id = card.querySelector('img') && card.querySelector('img').alt
      var house = houses[i]
      if (!house) return
      card.classList.add('estate-card')
      card.style.setProperty('--delay', Math.min(i * 60, 420) + 'ms')
      var img = card.querySelector('img')
      if (img) {
        img.setAttribute('loading', 'lazy')
        img.setAttribute('decoding', 'async')
      }
      var body = card.querySelector('.house-body')
      if (!body) return
      var price = house.price || 0
      var region = (V.atlas.filter(function (a) { return a.maps.some(function (m) { return m.id === house.map }) })[0] || {}).name || 'Vélune'
      var starter = (house.starter || []).length
      body.insertAdjacentHTML(
        'afterbegin',
        '<span class="estate-where">' + esc(region) + '</span>',
      )
      body.insertAdjacentHTML(
        'beforeend',
        '<div class="estate-foot">' +
        '<span class="estate-meta">' + house.cols + '×' + house.rows + ' cases · ' + starter + ' meuble' + (starter > 1 ? 's' : '') + ' au départ</span>' +
        '<button class="estate-buy" data-id="' + esc(house.id) + '">Acquérir</button>' +
        '</div>',
      )
    })

    if (A) {
      VM.tilt('.estate-card', { max: 7, perspective: 1100 })
      A.set('.estate-card', { transformPerspective: 1100 })
    }

    // L'acquisition : on paie, la maison change d'état, le registre s'actualise.
    var spent = 0
    function buy(btn, card, house) {
      if (owned[house.id]) {
        VS.toast('Ce domaine est déjà le vôtre.')
        return
      }
      owned[house.id] = true
      spent += house.price || 0
      card.classList.add('is-owned')
      card.setAttribute('data-owned', '1')
      btn.textContent = 'Possédé'
      btn.disabled = true
      var priceNode = card.querySelector('.house-price')
      if (priceNode) priceNode.classList.add('is-paid')
      // Le sceau tombe, la carte se retourne brièvement.
      var seal = el('div', 'estate-seal', '<span>Acquis</span>')
      card.appendChild(seal)
      if (A && !VM.reduced) {
        A.timeline()
          .fromTo(seal, { scale: 1.7, opacity: 0, rotate: -18 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.5, ease: 'back.out(2.2)' })
          .fromTo(
            card.querySelector('img'),
            { filter: 'saturate(.2) brightness(.7)' },
            { filter: 'saturate(1.05) brightness(1.04)', duration: 1.1, ease: 'power2.out' },
            0.1,
          )
          .fromTo(
            $$('.estate-cell b', ledger),
            { '--flash': 1 },
            { '--flash': 0, duration: 0.8 },
            0.15,
          )
        A.fromTo(
          $$('.estate-coin', card),
          { y: 0, opacity: 1 },
          { y: -40, opacity: 0, duration: 0.9, stagger: 0.05, ease: 'power2.out' },
        )
      }
      seal.remove()
      VS.toast(house.name + ' est à vous. Le coffre vous attend.')
      VM.refresh()
    }

    $$('.estate-buy', grid).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation()
        var id = btn.dataset.id
        var house = houses.filter(function (h) { return h.id === id })[0]
        var card = btn.closest('.estate-card')
        if (!house || !card) return
        // Un peu de monnaie qui s'envole : la transaction se voit.
        if (A && !VM.reduced) {
          for (var i = 0; i < 6; i++) {
            var coin = el('i', 'estate-coin', '⬡')
            card.appendChild(coin)
            coin.style.left = 20 + Math.random() * 60 + '%'
          }
        }
        buy(btn, card, house)
      })
    })

    boot(function () {
      $$('.estate-cell b', ledger).forEach(function (node) { VM.count(node, +node.dataset.to, { duration: 1.4 }) })
      VM.reveal('.estate-ledger .estate-cell', { y: 24, stagger: 0.06 })
      VM.reveal('.estate-card', { y: 40, stagger: 0.07 })
      VM.refresh()
    })
  })()

  /* ══════════════════════════════════════════════════════════════════════
     6. La fiche du héros
     ══════════════════════════════════════════════════════════════════════ */
  ;(function profile() {
    var P = V.profile
    if (!P) return
    var crest = $('#profileCrest')
    var ring = $('#profileRing')
    var stats = $('#profileStats')
    var res = $('#profileRes')
    var gear = $('#profileGear')
    var bonuses = $('#profileBonuses')
    var spells = $('#profileSpells')
    var badges = $('#profileBadges')
    var rank = $('#profileRank')

    var accent = (VS.ACCENTS && VS.ACCENTS[P.klass.id]) || 'var(--lume)'

    if (crest) {
      crest.style.setProperty('--accent', accent)
      crest.innerHTML =
        '<div class="crest-rings" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '<img src="' + P.klass.emblem + '" alt="Blason de la classe ' + esc(P.klass.name) + '" loading="lazy">' +
        '<span class="crest-level" id="crestLevel">' + num(P.level) + '</span>'
    }
    var nameNode = $('#profileName')
    if (nameNode) nameNode.textContent = P.klass.name
    var roleNode = $('#profileRole')
    if (roleNode) roleNode.textContent = P.klass.role
    var equipNode = $('#profileEquip')
    if (equipNode) {
      equipNode.innerHTML =
        '<span class="sheet-equip-set">' + esc(P.equipment.set) + '</span>' +
        '<span class="sheet-equip-count">' + P.equipment.pieces + ' pièces</span>'
    }
    var lvlNode = $('#profileLevel')
    if (lvlNode) lvlNode.textContent = '0'
    var titleLvl = $('#heroProfileLevel')
    if (titleLvl) titleLvl.textContent = num(P.level)

    // L'anneau de niveau : une circonférence réelle, animée au chargement.
    if (ring) {
      var circle = ring.querySelector('.ring-fg')
      var C = 2 * Math.PI * 54
      if (circle) {
        circle.style.strokeDasharray = C.toFixed(1)
        circle.style.strokeDashoffset = C.toFixed(1)
        ring.style.setProperty('--ring-c', C.toFixed(1))
      }
    }

    var STAT_COLORS = { hp: 'var(--hp)', ap: 'var(--ap)', pm: 'var(--pm)', init: 'var(--gold-hi)', spells: 'var(--lume)' }
    if (stats) {
      stats.innerHTML = P.stats
        .map(function (s) {
          return (
            '<div class="pstat" style="--sc:' + (STAT_COLORS[s.kind] || 'var(--lume)') + '">' +
            '<span>' + esc(s.label) + '</span>' +
            '<b data-to="' + s.value + '">0</b>' +
            '<i><u style="--v:' + ((s.value / s.max) * 100).toFixed(1) + '%"></u></i>' +
            '<small>sur ' + num(s.max) + '</small>' +
            '</div>'
          )
        })
        .join('')
    }

    if (res) {
      var order = ['feu', 'eau', 'terre', 'air', 'neutre']
      res.innerHTML =
        '<span class="sheet-res-label">Résistances</span>' +
        order
          .filter(function (k) { return P.resistances[k] != null })
          .map(function (k) {
            var v = P.resistances[k]
            return (
              '<span class="res-chip" style="--ec:' + VS.elColor(k) + '">' +
              esc(VS.elName(k)) + ' <b>' + (v > 0 ? '+' : '') + v + ' %</b>' +
              '<i><u style="--v:' + clamp(50 + v * 1.6, 4, 100).toFixed(0) + '%"></u></i>' +
              '</span>'
            )
          })
          .join('')
    }

    if (gear) {
      gear.innerHTML = P.equipment.slots
        .map(function (item) {
          var r = VS.rarityOf(item.rarity)
          return (
            '<button class="gear-slot" data-id="' + esc(item.id) + '" style="--rc:' + r.color + '" title="' + esc(item.name) + '">' +
            '<img src="assets/art/icons/items/' + item.icon + '.svg" alt="" loading="lazy">' +
            '<span>' + esc(item.slot || '—') + '</span></button>'
          )
        })
        .join('')
      $$('.gear-slot', gear).forEach(function (b) {
        b.addEventListener('click', function () { VS.openItem(b.dataset.id) })
      })
    }
    if (bonuses) {
      bonuses.innerHTML = P.equipment.bonuses
        .map(function (b) { return '<li><span>' + b.n + ' pièces</span>' + esc(b.stats) + '</li>' })
        .join('')
    }

    if (spells) {
      spells.innerHTML = P.spells
        .map(function (s) {
          var ec = VS.elColor((s.effects[0] && s.effects[0].el) || 'neutre')
          return (
            '<button class="spell-chip" data-id="' + esc(s.id) + '" style="--ec:' + ec + '" title="' + esc(s.name) + ' — niv. ' + s.unlock + '">' +
            '<img src="assets/art/icons/spells/' + s.icon + '.svg" alt="" loading="lazy">' +
            '<span class="lv">' + s.unlock + '</span></button>'
          )
        })
        .join('')
      $$('.spell-chip', spells).forEach(function (b) {
        b.addEventListener('click', function () { VS.openSpell(b.dataset.id) })
      })
    }
    var spellFoot = $('#profileSpellFoot')
    if (spellFoot) {
      spellFoot.innerHTML =
        'Les ' + esc(P.spells.length) + ' derniers sorts de la classe, dans l’ordre du grimoire. ' +
        'Cliquez pour la fiche complète.'
    }

    if (badges) {
      badges.innerHTML = P.badges
        .map(function (b, i) {
          return (
            '<div class="badge" data-tone="' + b.tone + '" style="--i:' + i + '">' +
            '<span class="badge-icon">' + b.icon + '</span>' +
            '<b>' + esc(b.label) + '</b>' +
            '<small>' + esc(b.note) + '</small>' +
            '</div>'
          )
        })
        .join('')
    }

    if (rank) {
      rank.innerHTML =
        '<span class="kicker">Classement</span>' +
        P.ranking
          .map(function (r, i) {
            return (
              '<div class="rank-row">' +
              '<span class="rank-pos">' + String(i + 1).padStart(2, '0') + '</span>' +
              '<span class="rank-label">' + esc(r.label) + '</span>' +
              '<i class="rank-bar"><u style="--v:' + ((r.value / r.of) * 100).toFixed(1) + '%"></u></i>' +
              '<b>' + num(r.value) + '<small> / ' + num(r.of) + '</small></b>' +
              '</div>'
            )
          })
          .join('')
    }

    boot(function () {
      if (lvlNode) VM.count(lvlNode, P.level, { duration: 1.8 })
      $$('.pstat b', stats).forEach(function (node) { VM.count(node, +node.dataset.to, { duration: 1.6 }) })

      if (A && !VM.reduced) {
        // Anneau de niveau : la circonférence se remplit.
        if (circle) {
          A.to(circle, {
            strokeDashoffset: C * (1 - P.level / P.maxLevel),
            duration: 2.1,
            ease: VM.easeSoft,
            delay: 0.15,
          })
        }
        // Les trois anneaux du blason tournent à des vitesses différentes.
        A.to('.crest-rings i:nth-child(1)', { rotate: 360, duration: 34, repeat: -1, ease: 'none', transformOrigin: '50% 50%' })
        A.to('.crest-rings i:nth-child(2)', { rotate: -360, duration: 52, repeat: -1, ease: 'none', transformOrigin: '50% 50%' })
        A.to('.crest-rings i:nth-child(3)', { rotate: 360, duration: 21, repeat: -1, ease: 'none', transformOrigin: '50% 50%' })

        A.set('.pstat u', { scaleX: 0, transformOrigin: '0% 50%' })
        A.to('.pstat u', { scaleX: 1, duration: 1.2, stagger: 0.09, delay: 0.3, ease: VM.easeSoft, scrollTrigger: { trigger: stats, start: 'top 90%', once: true } })
        A.set('.res-chip u', { scaleX: 0, transformOrigin: '0% 50%' })
        A.to('.res-chip u', { scaleX: 1, duration: 1, stagger: 0.07, delay: 0.35, ease: VM.easeSoft, scrollTrigger: { trigger: res, start: 'top 92%', once: true } })
        A.set('.rank-bar u', { scaleX: 0, transformOrigin: '0% 50%' })
        A.to('.rank-bar u', { scaleX: 1, duration: 1.3, stagger: 0.1, ease: VM.easeSoft, scrollTrigger: { trigger: rank, start: 'top 92%', once: true } })
      }
      VM.reveal('.badge', { y: 26, scale: 0.94, stagger: 0.08 })
      VM.reveal('.sheet-panel', { y: 34, stagger: 0.1 })
      VM.tilt('.gear-slot', { max: 12 })
      VM.refresh()
    })
  })()

  /* ══════════════════════════════════════════════════════════════════════
     7. Parallaxe de fond sur les sections longues
     ══════════════════════════════════════════════════════════════════════ */
  ;(function depth() {
    if (!A) return
    // On ne touche pas aux `.aurora` : elles ont déjà leur propre dérive CSS,
    // et les décaler au scroll ferait déborder la page de plusieurs milliers
    // de pixels (le flou de 70 px déborde déjà de lui-même).
    // Les titres de section se posent en revanche un peu plus tard que leur contenu.
    VM.reveal('.section-head > *', { y: 26, stagger: 0.08, start: 'top 92%' })
  })()

  /* ══════════════════════════════════════════════════════════════════════
     8. Les modales et la palette : une entrée faite pour du mouvement
     ══════════════════════════════════════════════════════════════════════ */
  ;(function overlays() {
    var modal = $('#modal')
    if (!modal || !A) return
    var opened = false
    new MutationObserver(function () {
      var on = modal.classList.contains('on')
      if (on && !opened) {
        opened = true
        A.fromTo('.modal-box', { y: 26, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.55, ease: VM.ease })
        A.fromTo('.modal-bg', { opacity: 0 }, { opacity: 1, duration: 0.4 })
      } else if (!on && opened) {
        opened = false
      }
    }).observe(modal, { attributes: true, attributeFilter: ['class'] })

    var palette = $('#palette')
    if (!palette) return
    var palOpen = false
    new MutationObserver(function () {
      var on = palette.classList.contains('on')
      if (on && !palOpen) {
        palOpen = true
        A.fromTo('.palette-box', { y: -22, scale: 0.98, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: VM.ease })
      } else if (!on && palOpen) palOpen = false
    }).observe(palette, { attributes: true, attributeFilter: ['class'] })
  })()

  /* ══════════════════════════════════════════════════════════════════════
     10. Le jeu déployé : une seule adresse,partout
     ──────────────────────────────────────────────────────────────────────
     L'adresse du jeu est écrite une fois dans tools/build.mjs (PLAY.url).
     Le HTML en garde une copie littérale pour rester cliquable même si le
     script ne tourne pas ; ici on la remet à jour depuis les données, pour
     qu'il n'y ait jamais deux adresses en circulation.
     ══════════════════════════════════════════════════════════════════════ */
  ;(function playLinks() {
    var PLAY = V.play
    if (!PLAY || !PLAY.url) return
    var nodes = $$('[data-play]')
    if (!nodes.length) return
    nodes.forEach(function (n) {
      n.href = PLAY.url
      n.target = '_blank'
      n.rel = 'noopener noreferrer'
    })
    // Les boutons « Jouer » sont magnétiques eux aussi : c’est le premier
    // clic du visiteur, il doit sentir la page vivante.
    VM.magnetic('.btn-play', { pull: 0.2 })
  })()

  /* ══════════════════════════════════════════════════════════════════════
     11. Les effets du tripot suivent le mouvement
     ══════════════════════════════════════════════════════════════════════ */
  ;(function casino() {
    var reels = $('#reels')
    if (!reels || !A) return
    $$('.reel', reels).forEach(function (r) {
      r.addEventListener('animationend', function () { A && A.fromTo(r, { scale: 1 }, { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1 }) })
    })
  })()
})()