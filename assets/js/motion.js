/* ══════════════════════════════════════════════════════════════════════════
   VÉLUNE — moteur d'animation.

   Un seul point d'entrée pour tout le mouvement du site : GSAP + ScrollTrigger
   pour le temps et le scroll, Lenis pour l'inertie, et des primitives
   réutilisables par les modules.

   Règles tenues dans tout le fichier :
   · rien n'est obligatoire — si GSAP n'est pas là, le site reste tel quel ;
   · prefers-reduced-motion coupe tout, sans laisser d'élément caché ;
   · rien ne bloque le clic : les animations ne sont jamais au-dessus d'un
     pointer-events, et aucun conteneur animé ne masque son contenu ;
   · les transforms passent par GSAP (donc par le GPU), jamais par une
     boucle requestAnimationFrame maison.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict'

  var win = window
  var doc = document

  var $ = function (s, r) { return (r || doc).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)) }

  var mqReduce = win.matchMedia('(prefers-reduced-motion: reduce)')
  var mqFine = win.matchMedia('(pointer: fine)')

  var gsap = win.gsap
  var ST = win.ScrollTrigger
  var SplitText = win.SplitText
  var CustomEase = win.CustomEase
  var Lenis = win.Lenis

  var VM = (win.VM = {
    gsap: gsap,
    ScrollTrigger: ST,
    reduced: mqReduce.matches,
    fine: mqFine.matches,
    lenis: null,
    ready: false,
    /** true quand la machine ou l'utilisateur demande moins de mouvement. */
    calm: function () { return VM.reduced || win.innerWidth < 760 },
  })

  // ── Garde-fou : sans GSAP, le site garde exactement son comportement actuel.
  if (!gsap || !ST) return

  gsap.registerPlugin(ST)
  if (SplitText) gsap.registerPlugin(SplitText)
  if (CustomEase) gsap.registerPlugin(CustomEase)

  // ── Une seule courbe d'accélération pour tout le site : longue, sèche, noble.
  var EASE = CustomEase
    ? CustomEase.create('velune', 'M0,0 C0.16,1 0.3,1 1,1')
    : 'power3.out'
  var EASE_SOFT = CustomEase ? CustomEase.create('velune-soft', 'M0,0 C0.4,0 0.2,1 1,1') : 'power2.out'
  VM.ease = EASE
  VM.easeSoft = EASE_SOFT

  // Sur mobile, le redimensionnement de la barre d'adresse fait bouger la page :
  // sans ça, ScrollTrigger recalcule en boucle et les animations sautent.
  ST.config({ ignoreMobileResize: true })

  /* ── Lenis : le scroll est la partition de tout le mouvement du site ───── */
  if (Lenis && !VM.reduced) {
    var lenis = new Lenis({
      duration: 1.05,
      // Même courbe que les apparitions : le défilement et l'animation
      // paraissent provenir du même moteur.
      easing: function (t) { return 1 - Math.pow(1 - t, 3.2) },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.7,
      syncTouch: false,
      autoRaf: false,
    })
    // Un seul ticker pilote tout : Lenis, puis ScrollTrigger qui suit le scroll.
    lenis.on('scroll', ST.update)
    gsap.ticker.add(function (time) { lenis.raf(time * 1000) })
    gsap.ticker.lagSmoothing(0)
    VM.lenis = lenis
  }

  /** Défilement vers un élément ou un décalage, lissé si Lenis est actif. */
  VM.scrollTo = function (target, opts) {
    opts = opts || {}
    var node = typeof target === 'string' ? $(target) : target
    if (!node) return
    if (VM.lenis) {
      VM.lenis.scrollTo(node, { offset: opts.offset != null ? opts.offset : -(parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--nav-h')) || 74) - 16, duration: opts.duration || 1.15, immediate: opts.immediate })
    } else {
      node.scrollIntoView({ behavior: VM.reduced ? 'auto' : 'smooth', block: 'start' })
    }
  }

  // Les liens d'ancre passent tous par ici : jamais de saut brutal.
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]')
    if (!a) return
    var id = a.getAttribute('href')
    if (!id || id === '#') return
    var node = doc.querySelector(id)
    if (!node) return
    e.preventDefault()
    VM.scrollTo(node)
    if (history.replaceState) history.replaceState(null, '', id)
  })

  /* ══════════════════════════════════════════════════════════════════════
     Primitives
     ══════════════════════════════════════════════════════════════════════ */

  function toNodes(target) {
    if (!target) return []
    if (typeof target === 'string') return $$(target)
    if (target.nodeType) return [target]
    return Array.prototype.slice.call(target).filter(Boolean)
  }

  /**
   * Révélation au scroll, en lot. C'est le seul point d'entrée des apparitions.
   * @param {string|Element|Element[]} target
   * @param {object} [opts] y, x, scale, duration, stagger, start, delay, ease
   */
  VM.reveal = function (target, opts) {
    opts = opts || {}
    var nodes = toNodes(target).filter(function (n) { return n && !n.dataset.vmSeen })
    if (!nodes.length) return

    nodes.forEach(function (n) { n.dataset.vmSeen = '1' })

    // Sans mouvement autorisé, on montre tout immédiatement : rien ne reste caché.
    if (VM.reduced) {
      nodes.forEach(function (n) { n.classList.add('in'); gsap.set(n, { clearProps: 'all' }) })
      return
    }

    var vars = {
      y: 0,
      x: 0,
      scale: 1,
      autoAlpha: 1,
      duration: opts.duration != null ? opts.duration : 0.95,
      ease: opts.ease || EASE,
      stagger: opts.stagger != null ? opts.stagger : 0.055,
      delay: opts.delay || 0,
      overwrite: 'auto',
      onStart: function () { nodes.forEach(function (n) { n.classList.add('in') }) },
    }

    // L’état de départ est posé maintenant, l’arrivée est animée plus tard.
    gsap.set(nodes, {
      y: opts.y != null ? opts.y : 34,
      x: opts.x != null ? opts.x : 0,
      scale: opts.scale != null ? opts.scale : 1,
      autoAlpha: 0,
    })

    ST.batch(nodes, {
      start: opts.start || 'top 88%',
      once: true,
      batchMax: opts.batchMax || 8,
      onEnter: function (batch) { gsap.to(batch, vars) },
    })
  }

  /** Même chose, mais l'élément est déjà dans le flux : on l'anime sans attendre. */
  VM.enter = function (target, opts) {
    opts = opts || {}
    var nodes = toNodes(target)
    if (!nodes.length) return
    if (VM.reduced) return gsap.set(nodes, { clearProps: 'all', autoAlpha: 1 })
    return gsap.fromTo(
      nodes,
      {
        y: opts.y != null ? opts.y : 30,
        x: opts.x != null ? opts.x : 0,
        scale: opts.scale != null ? opts.scale : 1,
        autoAlpha: 0,
      },
      {
        y: 0, x: 0, scale: 1, autoAlpha: 1,
        duration: opts.duration != null ? opts.duration : 1.1,
        ease: opts.ease || EASE,
        stagger: opts.stagger != null ? opts.stagger : 0.07,
        delay: opts.delay || 0,
        overwrite: 'auto',
      },
    )
  }

  /**
   * Compteur animé. Un seul ticker GSAP, pas de boucle requestAnimationFrame.
   * @param {Element} node
   * @param {number} to
   * @param {object} [opts] duration, decimals, prefix, suffix, ease, scrollTrigger
   */
  VM.count = function (node, to, opts) {
    if (!node || typeof to !== 'number') return
    opts = opts || {}
    var fmt = opts.format || function (v) {
      return Math.round(v).toLocaleString('fr-FR', { minimumFractionDigits: opts.decimals || 0, maximumFractionDigits: opts.decimals || 0 })
    }
    var write = function (v) {
      node.textContent = (opts.prefix || '') + fmt(v) + (opts.suffix || '')
    }
    if (VM.reduced) return write(to)
    var box = { v: 0 }
    var tween = {
      v: to,
      duration: opts.duration != null ? opts.duration : 1.5,
      ease: opts.ease || 'power2.out',
      delay: opts.delay || 0,
      onUpdate: function () { write(box.v) },
      onComplete: function () { write(to) },
    }
    if (opts.scrollTrigger !== false) {
      tween.scrollTrigger = { trigger: node, start: opts.start || 'top 92%', once: true }
    }
    return gsap.to(box, tween)
  }

  /** Découpe un titre en lignes/caractères pour une apparition progressive. */
  VM.split = function (target, opts) {
    opts = opts || {}
    var node = typeof target === 'string' ? $(target) : target
    if (!node || !SplitText) return null
    var s = new SplitText(node, {
      type: opts.type || 'lines,words',
      linesClass: opts.linesClass || 'vm-line',
      wordsClass: opts.wordsClass || 'vm-word',
      charsClass: opts.charsClass || 'vm-char',
      mask: opts.mask || 'lines',
      autoSplit: !!opts.autoSplit,
    })
    return s
  }

  /** Titre en apparition ligne par ligne. Retourne la timeline. */
  VM.titleIn = function (node, opts) {
    opts = opts || {}
    if (!node) return null
    if (VM.reduced || !SplitText) return gsap.set(node, { autoAlpha: 1 })
    var split = VM.split(node, { type: 'lines,words,chars', mask: 'lines' })
    if (!split) return null
    var chars = split.chars || split.words || split.lines
    return gsap
      .timeline({ delay: opts.delay || 0, defaults: { ease: EASE } })
      .from(node, { autoAlpha: 0, duration: 0.5, y: opts.y != null ? opts.y : 12 })
      .from(
        chars,
        {
          yPercent: 118,
          rotateX: opts.rotate != null ? opts.rotate : -48,
          autoAlpha: 0,
          duration: opts.duration != null ? opts.duration : 0.95,
          stagger: opts.stagger != null ? opts.stagger : 0.028,
          force3D: true,
        },
        0.14,
      )
      .from(
        split.lines ? split.lines : [],
        { backgroundPosition: '100% 0%', duration: 0.001 },
        0,
      )
  }

  /**
   * Profondeur au pointeur : chaque couche bouge à une vitesse différente.
   * Un seul écouteur, des quickTo — pas de boucle maison.
   */
  VM.depth = function (container, opts) {
    opts = opts || {}
    var box = typeof container === 'string' ? $(container) : container
    if (!box || VM.reduced || !VM.fine) return
    var layers = toNodes(opts.layers || $$('[data-depth]', box)).map(function (n) {
      var depth = parseFloat(n.dataset.depth) || 0.1
      var quick = { x: gsap.quickTo(n, 'x', { duration: 0.9, ease: 'power3' }), y: gsap.quickTo(n, 'y', { duration: 0.9, ease: 'power3' }) }
      return { node: n, depth: depth, quick: quick }
    })
    if (!layers.length) return
    var strength = opts.strength != null ? opts.strength : 46
    var rect = null
    function refresh() { rect = box.getBoundingClientRect() }
    refresh()
    win.addEventListener('resize', refresh, { passive: true })
    function move(e) {
      if (!rect) refresh()
      var cx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width || 1)
      var cy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height || 1)
      for (var i = 0; i < layers.length; i++) {
        var l = layers[i]
        l.quick.x(-cx * l.depth * strength)
        l.quick.y(-cy * l.depth * strength * 0.7)
      }
    }
    function leave() {
      for (var i = 0; i < layers.length; i++) {
        layers[i].quick.x(0)
        layers[i].quick.y(0)
      }
    }
    box.addEventListener('pointermove', move)
    box.addEventListener('pointerleave', leave)
  }

  /** Micro-tilt 3D au survol. Transform composé : ne pas écraser un scale existant. */
  VM.tilt = function (target, opts) {
    opts = opts || {}
    var nodes = toNodes(target)
    if (!nodes.length || VM.reduced || !VM.fine) return
    nodes.forEach(function (node) {
      var max = opts.max != null ? opts.max : 9
      var rx = gsap.quickTo(node, 'rotationX', { duration: 0.6, ease: 'power3' })
      var ry = gsap.quickTo(node, 'rotationY', { duration: 0.6, ease: 'power3' })
      var shine = gsap.quickTo(node, '--shine', { duration: 0.6, ease: 'power3' })
      var rect = null
      node.addEventListener('pointerenter', function (e) {
        rect = node.getBoundingClientRect()
        gsap.set(node, { transformPerspective: opts.perspective || 900 })
        node.classList.add('is-tilting')
      })
      node.addEventListener('pointermove', function (e) {
        if (!rect) rect = node.getBoundingClientRect()
        var px = (e.clientX - rect.left) / rect.width
        var py = (e.clientY - rect.top) / rect.height
        ry((px - 0.5) * max * 2)
        rx(-(py - 0.5) * max * 2)
        if (shine) shine(px * 100 + '% ' + py * 100 + '%')
      })
      node.addEventListener('pointerleave', function () {
        rx(0); ry(0); if (shine) shine('50% 50%')
        node.classList.remove('is-tilting')
      })
    })
  }

  /** Bouton qui suit le pointeur, avec un retour net au départ. */
  VM.magnetic = function (target, opts) {
    opts = opts || {}
    var nodes = toNodes(target)
    if (!nodes.length || VM.reduced || !VM.fine) return
    nodes.forEach(function (node) {
      var pull = opts.pull != null ? opts.pull : 0.28
      var x = gsap.quickTo(node, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' })
      var y = gsap.quickTo(node, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' })
      node.addEventListener('pointermove', function (e) {
        var r = node.getBoundingClientRect()
        x((e.clientX - (r.left + r.width / 2)) * pull)
        y((e.clientY - (r.top + r.height / 2)) * pull * 0.8)
      })
      node.addEventListener('pointerleave', function () { x(0); y(0) })
    })
  }

  /**
   * Parallaxe liée au scroll. `speed` est en pixels de course sur la durée
   * du passage de l'élément dans la fenêtre.
   */
  VM.parallax = function (target, opts) {
    opts = opts || {}
    var nodes = toNodes(target)
    if (!nodes.length || VM.reduced) return
    nodes.forEach(function (node) {
      var speed = parseFloat(node.dataset.depth || opts.speed || 0.18)
      gsap.fromTo(
        node,
        { yPercent: -speed * 100 },
        {
          yPercent: speed * 100,
          ease: 'none',
          force3D: true,
          scrollTrigger: {
            trigger: node.closest('section') || node,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      )
    })
  }

  /** Révèle une barre, un anneau, un tracé : une valeur 0→1 prête à styler. */
  VM.meter = function (node, value, opts) {
    if (!node) return
    opts = opts || {}
    var box = { v: 0 }
    var tween = {
      v: Math.max(0, Math.min(1, value)),
      duration: opts.duration != null ? opts.duration : 1.3,
      ease: EASE,
      onUpdate: function () {
        node.style.setProperty('--v', box.v.toFixed(4))
        if (opts.onUpdate) opts.onUpdate(box.v)
      },
    }
    if (opts.immediate) {
      tween.onUpdate()
      return
    }
    if (VM.reduced) {
      tween.onUpdate()
      return
    }
    tween.scrollTrigger = { trigger: node, start: opts.start || 'top 92%', once: true }
    return gsap.to(box, tween)
  }

  /** Halo d'or quand une valeur change : la notification discrète de l'économie. */
  VM.pulse = function (node, opts) {
    if (!node || VM.reduced) return
    opts = opts || {}
    var color = opts.color || 'var(--lume)'
    return gsap
      .timeline()
      .fromTo(node, { '--glow': 0 }, { '--glow': 1, duration: 0.32, ease: 'power2.out' })
      .to(node, { '--glow': 0, duration: 0.9, ease: 'power2.inOut' })
      .fromTo(
        node,
        { scale: 1 },
        { scale: opts.scale || 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' },
        0,
      )
      .set(node, { '--glow-color': color })
  }

  /* ══════════════════════════════════════════════════════════════════════
     Recalculs
     ══════════════════════════════════════════════════════════════════════ */

  var refreshQueue = []
  /** Les modules ajoutent du DOM : on redimensionne les déclencheurs une fois. */
  VM.onRefresh = function (fn) { refreshQueue.push(fn) }
  VM.refresh = function () {
    refreshQueue.forEach(function (fn) { try { fn() } catch (e) { /* un module ne doit pas casser le scroll */ } })
    ST.refresh()
  }

  var refreshTimer = null
  var queueRefresh = function () {
    if (refreshTimer) return
    refreshTimer = setTimeout(function () { refreshTimer = null; VM.refresh() }, 220)
  }

  // Les images qui arrivent en retard changent la hauteur de la page :
  // sans ça, les animations de scroll se calent sur une page trop courte.
  win.addEventListener(
    'load',
    function () {
      var imgs = $$('img')
      var pending = imgs.filter(function (i) { return !i.complete })
      if (!pending.length) return queueRefresh()
      var left = pending.length
      var done = function () { if (--left <= 0) queueRefresh() }
      pending.forEach(function (i) {
        i.addEventListener('load', done, { once: true })
        i.addEventListener('error', done, { once: true })
      })
    },
    { once: true },
  )

  // Le menu mobile et les modales changent la hauteur disponible.
  var mo = win.MutationObserver
  if (mo) {
    new mo(queueRefresh).observe(doc.body, { childList: true, subtree: false })
  }

  VM.ready = true
  doc.documentElement.classList.add('vm-ready')

  // Un changement de réglage du système se répercute immédiatement.
  var onMQ = function () {
    VM.reduced = mqReduce.matches
    VM.fine = mqFine.matches
    VM.refresh()
  }
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onMQ)
})()