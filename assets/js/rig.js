/* ══════════════════════════════════════════════════════════════════════════
   VÉLUNE — rig : assemble un personnage à partir des vraies pièces du jeu
   (mêmes fichiers SVG, même arbre de poses que le client du jeu).
   La logique est celle de tools/art/figure.mjs + client/src/engine/catalog.ts,
   transposée au navigateur.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict'

  var META = {}
  var RIG = { views: { front: [], back: [] }, scale: 0.94 }
  var SVGNS = 'http://www.w3.org/2000/svg'
  var loaded = false

  /** jointure du squelette → pièce d'art (vue de face, vue de dos). */
  var PARTS = [
    ['head', 'head', 'head_back'],
    ['torso', 'torso', 'torso_back'],
    ['armNear', 'arm_near', 'arm_near'],
    ['armFar', 'arm_far', 'arm_far'],
    ['legNear', 'leg_near', 'leg_near'],
    ['legFar', 'leg_far', 'leg_far'],
  ]

  /* Cadre commun aux quatre classes, mesuré sur la figure entière (corps + arme +
     ombre) : boîte commune aux 4, pour que changer de classe ne déplace rien.
     Recalculer avec `node tools/bbox.mjs` si les pièces changent. */
  var FRAME = '-50 -140 138 176'
  /** L'arme que tient la classe sans équipement : une lame, ou son sort. */
  function weaponOf(look) {
    return look === 'gardelame' ? 'hero/gardelame/sword' : 'hero/' + look + '/weapon'
  }

  /** Toutes les pièces d'un héros : corps, arme, cape. */
  function piecesOf(look, back) {
    var L = 'hero/' + look
    var out = {}
    PARTS.forEach(function (p) {
      out[p[0]] = L + '/' + (back ? p[2] : p[1])
    })
    if (!back) {
      out.sword = weaponOf(look)
      out.cape = L + '/cape'
    }
    return out
  }

  /* Taille naturelle de chaque pièce, lue dans son viewBox.
     Indispensable : un <use> qui vise un <symbol> sans width/height explicite
     occupe 100 % du viewport, ce qui déforme complètement la pièce. */
  var DIMS = {}
  /* Les identifiants d’art contiennent des « / » (hero/gardelame/head), qui sont
    ihatables dans un fragment `#…`. On travaille donc avec un id assaini. */
  var SYM = {}
  var symId = function (id) {
    return 'a' + id.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  /** Enveloppe une pièce dans un <g> calé sur son pivot. */
  function art(id) {
    var m = META[id]
    var d = DIMS[id]
    if (!m || !d) return ''
    var pv = m.pivot || m.anchor || [m.w / 2, m.h / 2]
    return (
      '<g transform="translate(' +
      -pv[0] +
      ',' +
      -pv[1] +
      ')"><use href="#' +
      SYM[id] +
      '" width="' +
      d[0] +
      '" height="' +
      d[1] +
      '"/></g>'
    )
  }

  /** Construit l'arbre de la figure pour une vue du squelette. */
  function figure(view, parts, hide) {
    var defs = (RIG.views && RIG.views[view]) || []
    var kids = new Map()
    defs.forEach(function (p) {
      var k = p.parent || '_root'
      kids.set(k, (kids.get(k) || []).concat([p]))
    })

    function draw(p) {
      var tex = parts[p.name]
      var own = tex && hide.indexOf(p.name) === -1 ? { z: p.z || 0, svg: art(tex) } : null
      var children = (kids.get(p.name) || []).map(function (c) {
        return { z: c.z || 0, svg: draw(c) }
      })
      var all = children.concat(own ? [own] : []).sort(function (a, b) {
        return a.z - b.z
      })
      var pos = p.pos || [0, 0]
      var tf =
        'translate(' + pos[0] + ',' + pos[1] + ')' + (p.rot ? ' rotate(' + p.rot + ')' : '')
      return (
        '<g data-joint="' +
        p.name +
        '" data-base="' +
        tf +
        '" transform="' +
        tf +
        '">' +
        all.map(function (x) { return x.svg }).join('') +
        '</g>'
      )
    }

    return (kids.get('_root') || [])
      .sort(function (a, b) { return (a.z || 0) - (b.z || 0) })
      .map(draw)
      .join('')
  }

  /**
   * Cadre par défaut : le corps du personnage (tête, buste, jambes).
   * L’arme et la cape débordent volontairement — le SVG est en `overflow: visible`,
   * comme dans le jeu où rien n’est rogné.
   */
  function mount(host, opts) {
    opts = opts || {}
    var look = opts.look || 'gardelame'
    var back = !!opts.back
    var parts = piecesOf(look, back)
    var hide = []
    if (opts.hideCape !== false && !back) hide.push('cape')
    if (opts.hideWeapons) hide.push('sword')
    var scale = opts.scale || 1
    var shadow = RIG.shadow || { rx: 26, ry: 10 }
    var box = opts.viewBox || FRAME

    host.innerHTML =
      '<svg viewBox="' +
      box +
      '" xmlns="' +
      SVGNS +
      '" role="img" aria-label="' +
      (opts.label || look) +
      '">' +
      '<ellipse cx="0" cy="6" rx="' +
      shadow.rx +
      '" ry="' +
      shadow.ry +
      '" fill="#2E3F5C" opacity=".32"/>' +
      '<g transform="scale(' +
      scale +
      ')">' +
      figure(back ? 'back' : 'front', parts, hide) +
      '</g></svg>'

    if (opts.animate !== false) animate(host)
    return host
  }

  /* Respiration et balancement : on ne touche qu'aux jointures, en rAF. */
  function animate(host) {
    if (host.dataset.animated === '1') return
    host.dataset.animated = '1'
    var svg = host.querySelector('svg')
    if (!svg) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    var joints = {}
    svg.querySelectorAll('[data-joint]').forEach(function (g) {
      joints[g.getAttribute('data-joint')] = g
    })
    var t0 = performance.now()

    function frame(now) {
      if (!host.isConnected) return cancelAnimationFrame(frame)
      var t = (now - t0) / 1000
      var s = Math.sin(t * 1.6)
      var s2 = Math.sin(t * 0.85)
      if (joints.torso) joints.torso.setAttribute('transform', joints.torso.dataset.base + ' rotate(' + (s * 1.2).toFixed(3) + ')')
      if (joints.head) joints.head.setAttribute('transform', joints.head.dataset.base + ' rotate(' + (s2 * 2.4).toFixed(3) + ')')
      if (joints.armNear) joints.armNear.setAttribute('transform', joints.armNear.dataset.base + ' rotate(' + (s * 3.6).toFixed(3) + ')')
      if (joints.armFar) joints.armFar.setAttribute('transform', joints.armFar.dataset.base + ' rotate(' + (s2 * 2.6).toFixed(3) + ')')
      if (joints.legNear) joints.legNear.setAttribute('transform', joints.legNear.dataset.base + ' rotate(' + (s2 * 1).toFixed(3) + ')')
      if (joints.legFar) joints.legFar.setAttribute('transform', joints.legFar.dataset.base + ' rotate(' + (s * 1).toFixed(3) + ')')
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }

  /** Enregistre chaque pièce comme un <symbol> réutilisable (ids internes préfixés). */
  function register(id) {
    var sid = symId(id)
    if (document.getElementById(sid)) {
      SYM[id] = sid
      return Promise.resolve()
    }
    return fetch('assets/art/' + id + '.svg')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + id)
        return r.text()
      })
      .then(function (txt) {
        var box = document.createElement('div')
        box.innerHTML = txt
        var src = box.querySelector('svg')
        if (!src) throw new Error('svg illisible: ' + id)
        var vb = src.getAttribute('viewBox') || '0 0 ' + src.getAttribute('width') + ' ' + src.getAttribute('height')
        var parts = vb.split(/[\s,]+/).map(Number)
        var w = parts.length === 4 ? parts[2] : parseFloat(src.getAttribute('width')) || (META[id] && META[id].w)
        var h = parts.length === 4 ? parts[3] : parseFloat(src.getAttribute('height')) || (META[id] && META[id].h)
        if (!w || !h) throw new Error('taille inconnue : ' + id)
        DIMS[id] = [w, h]
        var inner = src.innerHTML
        // Les dégradés portent des ids internes : on les préfixe pour éviter toute collision.
        inner = inner.replace(/id="([^"]+)"/g, 'id="' + sid + '__$1"')
        inner = inner.replace(/url\(#([^)]+)\)/g, 'url(#' + sid + '__$1)')
        var sym = document.createElementNS(SVGNS, 'symbol')
        sym.setAttribute('id', sid)
        sym.setAttribute('viewBox', vb)
        sym.innerHTML = inner
        defs().appendChild(sym)
        SYM[id] = sid
      })
      .catch(function (e) {
        console.warn('Pièce absente :', id)
      })
  }

  function defs() {
    var svg = document.getElementById('rigDefs')
    if (!svg) {
      svg = document.createElementNS(SVGNS, 'svg')
      svg.id = 'rigDefs'
      svg.setAttribute('width', '0')
      svg.setAttribute('height', '0')
      svg.setAttribute('aria-hidden', 'true')
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
      document.body.appendChild(svg)
    }
    return svg
  }

  /** Charge le squelette + les métadonnées, puis enregistre les pièces d'un héros. */
  function prepare(looks) {
    return Promise.all([
      fetch('assets/rig/rig.json').then(function (r) { return r.json() }),
      fetch('assets/rig/art-meta.json').then(function (r) { return r.json() }),
    ])
      .then(function (res) {
        RIG = res[0]
        META = res[1]
        var ids = []
        looks.forEach(function (look) {
          PARTS.forEach(function (p) { ids.push('hero/' + look + '/' + p[1], 'hero/' + look + '/' + p[2]) })
          ids.push(weaponOf(look), 'hero/' + look + '/cape')
        })
        return Promise.all(ids.map(register))
      })
      .then(function () {
        loaded = true
        window.dispatchEvent(new CustomEvent('rig:ready'))
      })
      .catch(function (err) {
        console.warn('Rig indisponible, on continue sans personnages articulés :', err)
        window.dispatchEvent(new CustomEvent('rig:ready'))
      })
  }

  window.VeluneRig = {
    mount: mount,
    figure: figure,
    prepare: prepare,
    ready: function () { return loaded },
    piecesOf: piecesOf,
  }
})()