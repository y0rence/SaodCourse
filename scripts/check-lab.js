#!/usr/bin/env node
/* Проверка lab.html: конфиг компилируется, base корректный, пути существуют.
   Использование: node scripts/check-lab.js <path/to/lab.html> */
'use strict';
const fs = require('fs');
const path = require('path');

let bad = 0;
for (const file of process.argv.slice(2)) {
  const dir = path.dirname(file);
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) { console.error('✗ ' + file + ': нет inline-скрипта с window.LAB'); bad++; continue; }
  try {
    new Function(m[1]);
  } catch (e) {
    console.error('✗ ' + file + ': синтаксис конфига — ' + e.message); bad++; continue;
  }
  const base = (m[1].match(/base:\s*'([^']*)'/) || [])[1];
  if (!base) { console.error('✗ ' + file + ': не задан base'); bad++; continue; }
  const root = path.resolve(dir, base);
  for (const rel of ['assets/lab.js', 'assets/lab.css']) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error('✗ ' + file + ': не найден ' + rel + ' (base=' + base + ')'); bad++;
    }
  }
  // внешние скрипты (gens) существуют
  for (const sm of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const p = path.resolve(dir, sm[1]);
    if (!fs.existsSync(p)) { console.error('✗ ' + file + ': нет скрипта ' + sm[1]); bad++; }
  }
  // ссылки из конфига (только локальные без http)
  const links = [...m[1].matchAll(/href:\s*'([^']+)'/g)].map(x => x[1]);
  for (const l of links) {
    if (/^https?:/.test(l)) continue;
    const p = path.resolve(dir, l);
    if (!fs.existsSync(p)) { console.error('✗ ' + file + ': битая ссылка ' + l); bad++; }
  }
  // steps задан
  if (!/steps:\s*function/.test(m[1])) { console.error('✗ ' + file + ': нет steps()'); bad++; continue; }
  console.log('✓ ' + file);
}
process.exit(bad ? 1 : 0);
