#!/usr/bin/env node
/* Добавляет в README каждой лабораторной работы строку со ссылкой на lab.html
   (если страница есть и ссылки ещё нет). Идемпотентен.
   Использование: node scripts/link-pages.js */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sems = ['1семестр', '2семестр'];
let added = 0, skipped = 0;

for (const sem of sems) {
  const semDir = path.join(root, sem);
  // в 1 семестре работы лежат на глубине часть/работа, во 2 — прямо в семестре
  const candidates = [];
  for (const entry of fs.readdirSync(semDir)) {
    const p = path.join(semDir, entry);
    if (!fs.statSync(p).isDirectory()) continue;
    const nested = fs.readdirSync(p).some(e => fs.statSync(path.join(p, e)).isDirectory());
    if (nested) {
      for (const e of fs.readdirSync(p)) {
        const q = path.join(p, e);
        if (fs.statSync(q).isDirectory()) candidates.push(q);
      }
    } else {
      candidates.push(p);
    }
  }
  for (const labDir of candidates) {
    const labHtml = path.join(labDir, 'lab.html');
    const readme = path.join(labDir, 'README.md');
    if (!fs.existsSync(labHtml) || !fs.existsSync(readme)) { skipped++; continue; }
    let md = fs.readFileSync(readme, 'utf8');
    if (md.includes('lab.html')) { skipped++; continue; }
    const lines = md.split('\n');
    // вставим после заголовка (первая строка, начинающаяся с #)
    let at = lines.findIndex(l => /^#\s/.test(l));
    if (at < 0) at = 0;
    const link = '\n> **Интерактивная страница:** [lab.html](lab.html) — пошаговый проигрыватель с подсветкой кода (псевдокод ↔ исходный файл).\n';
    lines.splice(at + 1, 0, link);
    fs.writeFileSync(readme, lines.join('\n'));
    added++;
    console.log('✓ ' + path.relative(root, readme));
  }
}
console.log(`Добавлено: ${added}, пропущено: ${skipped}`);
