// Insère (ou remplace) la section « Nouveautés » dans index.html, et le lien de navigation.
import fs from 'node:fs';

const rules = [
  ['Éboulis', 'Des pierres se détachent : fuyez les cases marquées.'],
  ['Nuages de spores', 'Des nuages toxiques grossissent et dérivent.'],
  ['Marée', 'L’eau monte et redescend : patauger vous ralentit.'],
  ['Blizzard', 'Un vent glacial souffle tous les trois tours.'],
  ['Lave montante', 'La lave gagne depuis les bords : le terrain rétrécit.'],
  ['Verre noir', 'Un dixième des coups portés se retourne contre vous.'],
  ['Sables mouvants', 'Qui commence son tour dans le sable ne bouge plus.'],
  ['Rayons du Roi-Soleil', 'Deux rayons brûleront des lignes entières.'],
  ['Bénédiction de jade', 'Des cases bénies soignent : disputez-les.'],
  ['Gravité astrale', 'Tous sont attirés au centre ; les étoiles donnent un PA.'],
  ['Racines', 'Des racines saisissent deux héros par tour.'],
];

const card = (icon, title, text, extra = '') => `
        <article class="card nv-card reveal">
          <div class="nv-ico">${icon}</div>
          <h3 class="card-title">${title}</h3>
          <p class="card-text">${text}</p>${extra}
        </article>`;

const html = `  <section class="section" id="nouveautes">
    <div class="shell">
      <div class="section-head">
        <span class="kicker reveal">Les dernières nouveautés</span>
        <h2 class="title-lg reveal" style="--d:80ms">Un monde qui <span class="grad-lume">grandit</span> à chaque mise à jour</h2>
        <p class="lede reveal" style="--d:160ms">
          Guildes et temples, montures qui évoluent, donjons qui ne se ressemblent plus, billard en duel,
          relief sous les pas&nbsp;: voici ce qui vient d’arriver dans Vélune. Tout se joue maintenant,
          dans votre navigateur, sans rien installer.
        </p>
      </div>

      <div class="nv-feature">
        <div class="nv-feature-art reveal reveal-left">
          <img src="assets/art/pets/m_scarabee.svg" alt="Scarabée de selle, première forme" loading="lazy" style="--s:.62">
          <img src="assets/art/pets/m_scarabee_2.svg" alt="Scarabée de selle éveillé" loading="lazy" style="--s:.82">
          <img src="assets/art/pets/m_scarabee_3.svg" alt="Scarabée de selle ancestral" loading="lazy" style="--s:1">
          <div class="nv-steps"><span>Niv. 1</span><span>Niv. 34</span><span>Niv. 67 → 100</span></div>
        </div>
        <div class="nv-feature-copy reveal reveal-right" style="--d:100ms">
          <span class="kicker">Montures</span>
          <h3 class="title-md">Une compagne de route, du niveau 1 au niveau 100</h3>
          <p class="lede">
            Treize espèces, du scarabée de selle à l’astrelet royal. Votre monture monte de niveau avec
            l’expérience que vous choisissez de lui donner, de 0 à 100&nbsp;% de vos gains, change de
            forme au niveau 34 puis 67, et gagne en force. Au sommet, un seul point d’Action
            <em>ou</em> de Mouvement&nbsp;: jamais les deux.
          </p>
        </div>
      </div>

      <div class="grid grid-3 nv-grid">${[
        card('🏛️', 'Guildes et temple', 'Fondez votre guilde au Temple des guildes avec un sceau d’alliance, très rare. Posez des percepteurs sur vos terres : ils prélèvent 10&nbsp;% des Lunes des autres héros… et peuvent être attaqués.'),
        card('👑', 'Archimonstres', 'Des géants rarissimes, trois fois plus résistants et six fois plus généreux. Chaque archimonstre vaincu rejoint votre collection.'),
        card('🎱', 'Billard et poker au Tripot', 'Un grand salon avec ses tables de billard : un contre un, sept rouges contre sept jaunes, puis la noire, avec mise. Au poker, les mises prennent la forme de jetons empilés.'),
        card('⛰️', 'Un terrain qui a du relief', 'Plateaux, falaises, fossés, bâtiments posés sur leurs socles, eau en dégradé avec vagues et reflets, îles aux côtes arrondies sur la carte du monde.'),
        card('🔨', 'Forgemagie, bientôt', 'Un métier à part entière, annoncé : réécrire les caractéristiques d’un objet à coups de runes. Les ateliers ouvriront plus tard.'),
        card('🌱', 'Cultures d’intérieur', 'Achetez du matériel de culture pour votre maison ou votre château : faites pousser vos récoltes à l’abri, sans sortir de chez vous.'),
        card('🏃', 'Tacle et fuite', 'Votre agilité décide : un adversaire plus vif vous retient, un héros leste s’échappe. L’indicateur de tacle s’affiche pendant le combat.'),
        card('⌨️', 'Pensé pour jouer vite', 'Sorts sur les touches 1 à 9, suivre un ami du groupe d’un clic, poser un point partagé sur la carte du monde avec Maj + clic.'),
      ].join('')}
      </div>

      <div class="section-head" style="margin-top:4.5rem">
        <span class="kicker reveal">Les donjons</span>
        <h3 class="title-lg reveal" style="--d:80ms">Onze donjons, onze règles de combat</h3>
        <p class="lede reveal" style="--d:160ms">
          Chaque donjon a son sol, son atmosphère et sa règle propre qui change la façon de se battre,
          sans parler de l’épreuve quotidienne qui bouscule les habitudes.
        </p>
      </div>
      <ul class="nv-rules">${rules.map(([n, t]) => `
        <li class="reveal"><b>${n}</b><span>${t}</span></li>`).join('')}
      </ul>
    </div>
  </section>

`;

let s = fs.readFileSync('index.html', 'utf8');
s = s.replace(/  <section class="section" id="nouveautes">[\s\S]*?<\/section>\n\n/, '');
const at = s.indexOf('  <section class="section" id="univers">');
if (at < 0) throw new Error('section univers introuvable');
s = s.slice(0, at) + html + s.slice(at);
if (!s.includes('href="#nouveautes"')) s = s.replace('<a href="#univers">Univers</a>', '<a href="#nouveautes">Nouveautés</a>\n      <a href="#univers">Univers</a>');
fs.writeFileSync('index.html', s);
console.log('section nouveautés écrite');
