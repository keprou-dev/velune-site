// Fabrique une galerie HTML des sections du site, à ouvrir dans un navigateur.
//   node tools/gallery.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const shots = path.join(root, '.shots')
const gallery = path.join(root, 'galerie')
const PORT = 8129

const CAPTIONS = {
  '00-hero': ['L’accueil', 'Apparition cinématique : logo, titre, brume lente et profondeur au pointeur'],
  '01-hero': ['L’accueil', 'Le Gardelame assemblé à partir des pièces du jeu, la lune et les chiffres du monde'],
  '02-univers': ['L’univers', 'La palette de la bible graphique, cliquable pour copier un code couleur'],
  '03-classes': ['Les quatre classes', 'Chaque classe a ses stats, ses résistances, ses éléments et ses sorts'],
  '04-combat': ['Le combat', 'Grille isométrique 2:1 : portée du sort, zone en croix, chemin A*, obstacles'],
  '05-monde': ['La carte du monde', 'Les 367 cartes du jeu sur leur vraie grille, avec zoom et domaines cliquables'],
  '06-grimoire': ['Le grimoire', '246 sorts, filtrables par classe et par élément'],
  '07-bestiaire': ['Le bestiaire', '58 créatures dont 11 boss, avec leurs familles et leurs niveaux'],
  '08-almanach': ['L’almanach', '302 objets par rareté, et les bonus des 26 panoplies'],
  '09-quetes': ['Quêtes & donjons', '67 quêtes, du premier Bolétin au Cœur-de-Lave'],
  '10-metiers': ['Métiers & artisanat', 'Les 7 métiers et la chaîne de fabrication, pièce par pièce'],
  '11-proprietes': ['Le domaine', 'Les huit maisons à vendre, cartes de profondeur et bouton d’acquisition'],
  '12-social': ['Le village & les autres', '54 villageois, les fonctions sociales, et la discussion qui tourne'],
  '13-economie': ['L’économie', 'Registre de six chiffres, courbe de richesse et marché par rareté'],
  '14-heros': ['La fiche du héros', 'Blason animé, niveau, statistiques, équipement et titres gagnés'],
  '15-tripot': ['Le Tripot', 'Les machines se jouent vraiment, avec les multiplicateurs du jeu'],
  '16-roadmap': ['La feuille de route', 'Les 43 jalons, de V0.1 à V0.44'],
  '17-rejoindre': ['Rejoindre', 'Les trois serveurs de jeu et le bandeau final'],
  '90-classe-sylvetireur': ['Changement de classe', 'Le héros se réhabille avec les vraies pièces du jeu'],
  '90b-classe-lieur': ['Lieur d’Échos', 'Invocateur, contrôle et soutien'],
  '91-modal-sort': ['Fiche de sort', 'Coût en PA, portée, zone, effets — et les créatures qui l’utilisent'],
  '92-palette': ['Recherche globale', 'Ctrl + K : sorts, créatures, objets et cartes'],
  '93-tripot': ['Une partie', 'Les rouleaux tournent avec la mécanique réelle du jeu'],
  '94-atlas-filtre': ['L’atlas filtré', 'Recherche dans les 367 cartes du jeu'],
  '97-carte-domaine': ['Un domaine ouvert', 'Le panneau d’un domaine : nombre de cartes, cases jouables, vignettes'],
  '98-economie': ['L’économie en action', 'La courbe de richesse tracée palier par palier'],
  '99-economie-transaction': ['Une transaction', 'Le Lunebours au travail : la monnaie change de place'],
  '9a-proprietes': ['Une maison acquise', 'Le sceau « Acquis » tombe et la carte passe en possédée'],
  '9b-heros': ['L’équipement', 'Les pièces de la panoplie les plus chère du jeu, avec leurs bonus'],
  '9c-reduced-motion': ['Mouvement réduit', 'Ce que voit un joueur qui a demandé moins d’animation'],
  '95-mobile-hero': ['Sur mobile', 'L’accueil en 390 px'],
  '96-mobile-classes': ['Sur mobile', 'La fiche de classe'],
  '96b-mobile-proprietes': ['Sur mobile', 'Le domaine'],
  '96c-mobile-economie': ['Sur mobile', 'L’économie'],
  '96d-mobile-heros': ['Sur mobile', 'La fiche du héros'],
  '96e-mobile-monde': ['Sur mobile', 'La carte du monde'],
  'fig-comparaison': ['Contrôle du rig', 'En haut la planche du jeu (tools/art/figure.mjs), en bas l’assemblage du site'],
}

fs.mkdirSync(gallery, { recursive: true })

const cards = []
for (const [file, [title, sub]] of Object.entries(CAPTIONS)) {
  const src = path.join(shots, file + '.png')
  if (!fs.existsSync(src)) continue
  const out = file + '.jpg'
  await sharp(src).resize(1100).jpeg({ quality: 72, mozjpeg: true }).toFile(path.join(gallery, out))
  cards.push({ out, title, sub })
}

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vélune — galerie du site</title>
<style>
  body{margin:0;background:#05091a;color:#e8eefb;font:16px/1.6 Nunito,system-ui,sans-serif;padding:2rem}
  h1{font-family:Cinzel,Georgia,serif;font-weight:400;font-size:2.4rem;margin:0 0 .4rem}
  p.lead{color:#a8b6d4;max-width:60ch}
  .grid{display:grid;gap:1.6rem;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));margin-top:2rem}
  figure{margin:0;border:1px solid #7ff3ff22;border-radius:16px;overflow:hidden;background:#0a1328}
  figure img{width:100%;display:block}
  figcaption{padding:.9rem 1.1rem 1.1rem}
  figcaption b{display:block;font-family:Cinzel,Georgia,serif;font-weight:400;font-size:1.1rem;color:#fff1d0}
  figcaption span{color:#8b98b8;font-size:.86rem}
</style></head><body>
<h1>Vélune — le site</h1>
<p class="lead">${cards.length} captures prises dans Chrome sur le site réel. Le site tourne sur <code>http://localhost:8123</code>.</p>
<div class="grid">
${cards.map((c) => `  <figure><img src="${c.out}" alt="${c.title}" loading="lazy"><figcaption><b>${c.title}</b><span>${c.sub}</span></figcaption></figure>`).join('\n')}
</div></body></html>`

fs.writeFileSync(path.join(gallery, 'index.html'), html)

const server = spawn(process.execPath, [path.join(root, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' })
server.unref()
await new Promise((r) => setTimeout(r, 600))
console.log('Galerie :', cards.length, 'captures dans velune-site/galerie/')
console.log('Ouvre    : http://localhost:' + PORT + '/galerie/')
console.log('ou       : velune-site/galerie/index.html')