// Copie les bibliothèques d'animation depuis node_modules vers assets/vendor/,
// en versions UMD autonomes : le site reste du HTML/CSS/JS pur, sans build ni bundler.
//
//   node tools/vendor.mjs
//
// Les fichiers sont versionnés dans le dépôt pour que le site fonctionne même
// sans `npm install`. Relancer après un `npm install` ou une mise à jour.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dest = path.join(root, 'assets', 'vendor')
fs.mkdirSync(dest, { recursive: true })

const FILES = [
  ['gsap/dist/gsap.min.js', 'gsap.min.js'],
  ['gsap/dist/ScrollTrigger.min.js', 'ScrollTrigger.min.js'],
  ['gsap/dist/CustomEase.min.js', 'CustomEase.min.js'],
  ['gsap/dist/SplitText.min.js', 'SplitText.min.js'],
  ['lenis/dist/lenis.min.js', 'lenis.min.js'],
]

let copied = 0
let missing = 0
for (const [from, to] of FILES) {
  const src = path.join(root, 'node_modules', ...from.split('/'))
  if (!fs.existsSync(src)) {
    console.log(`  ✗ ${to} — absent de node_modules (lancez npm install)`)
    missing++
    continue
  }
  const body = fs.readFileSync(src)
  fs.writeFileSync(path.join(dest, to), body)
  copied++
  console.log(`  ✓ ${to.padEnd(22)} ${(body.length / 1024).toFixed(1)} ko`)
}

console.log(`\n${missing ? '✗' : '✓'} ${copied} bibliothèque(s) copiée(s) dans assets/vendor/, ${missing} manquante(s).`)
process.exit(missing ? 1 : 0)