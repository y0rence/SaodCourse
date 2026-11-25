#!/usr/bin/env node
/* Дополняет таблицы работ в README 1 и 2 семестров ссылкой на lab.html.
   Идемпотентен: повторный запуск ничего не меняет. */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let changed = 0;

for (const sem of ['1семестр', '2семестр']) {
  const readme = path.join(root, sem, 'README.md');
  let md = fs.readFileSync(readme, 'utf8');
  const out = md.replace(/\[README\]\(([^)]+)\/README\.md\)( · \[страница\]\([^)]+\/lab\.html\))?/g, (m, folder) => {
    if (!fs.existsSync(path.join(root, sem, folder, 'lab.html'))) return m;
    if (m.includes('lab.html')) return m;
    changed++;
    return `[README](${folder}/README.md) · [страница](${folder}/lab.html)`;
  });
  if (out !== md) fs.writeFileSync(readme, out);
}
console.log('Ссылок добавлено: ' + changed);
