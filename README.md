# Vélune — site vitrine

Site interactif pour **Vélune**, le MMORPG tactique au tour par tour.
Une seule page, sans dépendance à l'exécution : du HTML, du CSS et du JavaScript
sans build. Tous les chiffres, noms, descriptions et illustrations viennent des
fichiers du jeu.

## Le contenu vient du jeu, pas d'une invention

`tools/build.mjs` lit `C:/Users/kepro/Desktop/velune` et produit
`assets/js/data.js` + `assets/rig/` + une copie des assets :

| Source du jeu | Ce que le site en fait |
|---|---|
| `data/classes.json` | les 4 fiches de classe, leurs stats, résistances et sorts |
| `data/spells.json` | le grimoire : 246 sorts, coût en PA, portée, zone, effets, niveau |
| `data/monsters.json` | le bestiaire : 58 créatures, dont 11 boss, avec butin et PV |
| `data/items.json`, `data/sets.json` | l'almanach : 302 objets, 26 panoplies et leurs bonus |
| `data/quests.json`, `data/npcs.json` | 67 quêtes, 54 villageois et leurs répliques |
| `data/jobs.json`, `data/recipes.json` | 7 métiers, leurs ateliers et le nombre de recettes |
| `data/maps/*.json` (367) | l'atlas, la carte du monde (grille `coords`), la vignette `worldmap/<id>.webp` de chaque carte |
| `data/servers.json`, `portals.json`, `ports.json`, `houses.json` | serveurs, portails, ports, maisons |
| `README.md` | les 43 jalons de la feuille de route, de V0.1 à V0.44 |
| `docs/bible-graphique.md` | la palette affichée dans la section Univers |
| `client/src/assets/art-meta.json` + `data/rigs/gardelame.json` | les personnages articulés |
| `client/public/assets/art/**` | toutes les illustrations (11 Mo) |
| `client/public/assets/worldmap/**` | les 367 vignettes de carte (6 Mo) |
| `client/public/audio/music/menu.mp3` | la musique du menu (bouton 🎵) |

Les classes affichées ne sont pas des images : `assets/js/rig.js` assemble les
personnalages dans le navigateur à partir des mêmes pièces SVG et du même arbre
de poses que le client du jeu (`data/rigs/gardelame.json`), puis anime les
jointures — torse, tête, bras, jambes — en boucle `requestAnimationFrame`.
Le Tripot, lui, rejoue la mécanique réelle des machines de `shared/casino/games.ts`
(tableau `REEL`, `slotMult`, `MOON_PAY`).

## Commandes

```bash
npm install       # jsdom, puppeteer-core, sharp, acorn + gsap et lenis
npm run build     # régénère les données et recopie les assets depuis le jeu
npm run vendor    # recopie GSAP/Lenis depuis node_modules vers assets/vendor
npm run check     # exécute le site dans jsdom : syntaxe, erreurs, sections, ressources
npm run shots     # ouvre le site dans Chrome, joue les interactions, capture chaque section
npm run audit     # audit visuel mesurable : débordements, tailles, contraste, troncatures
npm run gallery   # fabrique une planche-contact des captures dans galerie/
npm run serve     # http://localhost:8123 pour regarder à la main
npm run compare   # compare les personnages du site avec la planche du jeu
npm run verify    # build + check + shots + audit
```

`npm run check` échoue si un script a une faute de syntaxe, si une section reste
vide, si un chiffre affiché ne correspond pas au fichier du jeu, s'il manque une
ressource, ou si le moindre `console.error` remonte.

`npm run shots` échoue si une requête échoue, si une image est cassée, si une
interaction casse, si un élément reste coincé dans son état « avant animation »,
si une animation couvre un bouton, ou si la page déborde horizontalement sur mobile.

`npm run audit` échoue si un bloc clé est aplati ou absent, si un texte passe
sous le seuil de contraste AA, ou si un titre est tronqué. Les débordements
internes à une section rognée sont signalés en remarque, pas en échec.

## Le mouvement

Le site est du HTML/CSS/JS pur, sans build ni bundler. Le mouvement repose sur
cinq fichiers UMD recopiés dans `assets/vendor/` (147 ko au total) :

| Bibliothèque | Rôle |
|---|---|
| GSAP 3.15 | le temps : timelines, tweens, caméra de la carte du monde |
| ScrollTrigger | le scroll : révélations au passage, barres liées au défilement |
| Lenis 1.3 | l'inertie du défilement, branchée sur le ticker GSAP |
| CustomEase | la courbe d'accélération maison du site |
| SplitText | les titres découpés ligne par ligne |

`assets/js/motion.js` est le seul point d'entrée : il expose `VM.reveal`,
`VM.enter`, `VM.count`, `VM.depth`, `VM.tilt`, `VM.magnetic`, `VM.parallax`,
`VM.meter`, `VM.pulse`, `VM.scrollTo` et `VM.refresh`. Tout y respecte
`prefers-reduced-motion`, et rien n'y est obligatoire : sans GSAP, le site
affiche le même contenu, immobile.

## Structure

```
index.html            la page, dix-sept sections
assets/css/base.css      palette, typographie, navigation, hero
assets/css/sections.css  cartes, classes, combat, métiers, tripot, roadmap
assets/css/modules.css   atlas, grimoire, bestiaire, almanach, modales, recherche
assets/css/motion.css    couche de mouvement + monde, domaine, économie, héros
assets/js/data.js        ← généré, ne pas éditer
assets/js/rig.js         assemblage et animation des personnages
assets/js/site.js        socle : révélations, hero, classes, combat, atlas, modales
assets/js/modules.js     grimoire, bestiaire, almanach, quêtes, tripot, recherche
assets/js/motion.js      moteur d'animation : Lenis + ScrollTrigger + primitives
assets/js/kingdom.js     accueil cinématique, carte du monde, économie,
                         domaine, fiche du héros
assets/vendor/           GSAP, ScrollTrigger, CustomEase, SplitText, Lenis (UMD)
assets/art, assets/worldmap, assets/audio, assets/rig   ← copiés du jeu
tools/                   build, vendor, check, shots, audit, gallery, serve, …
```

## Ce qu'on peut faire sur la page

- Changer de classe : le héros se réhabille avec les vraies pièces du jeu.
- Parcourir les 367 cartes, filtrer par région ou par couche (surface / souterrain).
- Chercher un sort, une créature, un objet, une carte : 246 + 58 + 302 entrées
  indexées, via la barre de recherche ou **Ctrl + K**.
- Filtrer le grimoire par classe et par élément, le bestiaire par niveau et par
  famille, l'almanach par type et par rareté.
- Ouvrir le détail d'un sort, d'une créature (statistiques, sorts, butin), d'un
  objet (bonus, panoplie) ou d'une carte.
- Jouer aux machines du Tripot, avec le vrai calcul des multiplicateurs.
- Explorer la carte du monde : les 367 cartes du jeu sur leur vraie grille,
  avec zoom, déplacement, domaines cliquables et panneau d'information.
- Parcourir l'économie : compteurs, courbe de richesse, marché par rareté, et une
  transaction animée quand on clique une source de revenu.
- Lire la fiche du héros : niveau, PV selon la vraie courbe de la classe,
  résistances, équipement, titres et classement.
- Acquérir une maison : la carte bascule en « Possédé », avec sceau et notification.
- Les raccourcis façon jeu : **L** pour l'almanach, **M** pour la carte du monde,
  **Échap** pour fermer.

## L'adresse du jeu

Le monde est déployé en ligne. L'adresse est écrite **une seule fois**, en haut de
`tools/build.mjs` :

```js
const PLAY = {
  url: 'https://velune-h6og.onrender.com/',
  health: 'https://velune-h6og.onrender.com/api/health',
  label: 'Jouer en ligne',
  since: 'V0.44',
}
```

Après `npm run build`, elle est reprise par le site : les cinq boutons « Jouer »
— barre de navigation, pastille du hero, bouton du hero, bandeau final et carte
du serveur ouvert — pointent tous dessus, en nouvel onglet. Le HTML en garde une
copie littérale pour rester cliquable même si le JavaScript ne tourne pas.

`PLAY.health` n'est pas utilisé par le site : il sert de sonde si tu veux un jour
afficher un état du serveur. Rien n'interroge le réseau pour l'instant, donc la
page ne réveille pas l'instance Render.

## Limites connues

- Le site est statique : il ne se connecte pas au serveur du jeu. Les boutons
  « Jouer » ouvrent le jeu déployé dans un nouvel onglet, mais le site lui-même
  n'affiche aucune donnée vivante du serveur.
- Les vignettes de carte et les portraits viennent directement du jeu ; rien
  n'est redessiné pour le site.
- Google Fonts (Cinzel Decorative, Cinzel, Nunito) est chargé en ligne ; hors
  ligne, la page retombe sur Georgia et la police système.
- La courbe de richesse de l'économie s'arrête au niveau 99 : le jeu n'écrit
  encore aucune quête au-delà. La section le dit explicitement plutôt que
  d'inventer la suite.
- Quatre sections préexistantes (`#classes`, `#combat`, `#tripot`, `#social`)
  laissent dépasser de 7 à 33 px du contenu sur mobile ; ces sections rognent
  elles-mêmes (`overflow-x: clip`), donc rien n'est perdu et la page ne déborde
  pas. Signalé par `npm run audit` en remarque, pas en échec.