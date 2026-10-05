// Met le site à jour en ligne : régénère depuis le jeu, puis envoie sur GitHub (Render republie tout seul en ~1 minute).
import { spawnSync } from 'node:child_process';
const npm = (args) => spawnSync('npm', args, { stdio: 'inherit', shell: process.platform === 'win32' });
const git = (args, stdio = 'inherit') => spawnSync('git', args, { stdio, encoding: 'utf8' });

if (npm(['run', 'build']).status !== 0) { console.error('\n  Échec de la construction : rien n’est envoyé.'); process.exit(1); }
git(['add', '-A']);
if (!git(['status', '--porcelain'], 'pipe').stdout.trim()) { console.log('\n  Le site est déjà à jour : rien à envoyer.'); process.exit(0); }
const msg = `Mise à jour du site ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
if (git(['-c', 'user.name=Velune', '-c', 'user.email=velune@example.com', 'commit', '-q', '-m', msg]).status !== 0) { console.error('\n  Échec de l’enregistrement.'); process.exit(1); }
if (git(['push', 'origin', 'main']).status !== 0) { console.error('\n  Échec de l’envoi.'); process.exit(1); }
console.log('\n  Envoyé : le site se met à jour en ligne dans une minute (https://velune-site.onrender.com).');
