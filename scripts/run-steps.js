#!/usr/bin/env node
/* Прогоняет steps() лабораторной страницы в Node без браузера.
   Использование: node scripts/run-steps.js <path/to/lab.html> [...] */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

global.window = { LAB: { noInit: true } };
require(path.join(root, 'assets', 'lab.js'));
global.Lab = window.Lab;

let bad = 0;
for (const file of process.argv.slice(2)) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) { console.error('✗ ' + file + ': нет конфига'); bad++; continue; }
  let cfg;
  try {
    cfg = new Function('window', 'Lab', m[1] + '\n;return window.LAB;')(window, window.Lab);
  } catch (e) {
    console.error('✗ ' + file + ': конфиг — ' + e.message); bad++; continue;
  }
  const dir = path.dirname(path.resolve(file));
  // внешние gens-файлы
  for (const sm of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const p = path.resolve(dir, sm[1]);
    if (p === path.join(root, 'assets', 'lab.js')) continue;
    if (fs.existsSync(p)) new Function('window', 'Lab', fs.readFileSync(p, 'utf8'))(window, window.Lab);
    else { console.error('✗ ' + file + ': нет ' + sm[1]); bad++; }
  }
  if (typeof cfg.steps !== 'function') { console.error('✗ ' + file + ': нет steps()'); bad++; continue; }

  // контекст: parse или значения по умолчанию из inputs
  let ctx;
  try {
    if (cfg.parse) {
      const vals = {};
      (cfg.inputs || []).forEach(f => { vals[f.id] = f.example != null ? f.example : (f.value || ''); });
      ctx = cfg.parse(vals);
    } else {
      const f = (cfg.inputs || [])[0];
      ctx = window.Lab.parseDefault(f ? (f.example || f.value || '') : '');
    }
  } catch (e) {
    console.error('✗ ' + file + ': разбор входа — ' + e.message); bad++; continue;
  }

  let steps;
  try {
    steps = cfg.steps(ctx);
  } catch (e) {
    console.error('✗ ' + file + ': steps() — ' + e.message); bad++; continue;
  }
  if (!Array.isArray(steps) || steps.length < 2) {
    console.error('✗ ' + file + ': шагов ' + (steps ? steps.length : 0)); bad++; continue;
  }
  const issues = [];
  steps.forEach((s, i) => {
    if (!s || typeof s !== 'object') { issues.push('шаг ' + (i + 1) + ' не объект'); return; }
    if (!s.title) issues.push('шаг ' + (i + 1) + ': нет title');
    if (!s.text) issues.push('шаг ' + (i + 1) + ': нет text');
    if (!s.stage && s.stage !== '') issues.push('шаг ' + (i + 1) + ': нет stage');
    if (s.stage !== undefined && typeof s.stage !== 'string' && typeof s.stage !== 'function')
      issues.push('шаг ' + (i + 1) + ': stage не строка');
    if (s.tags && !Array.isArray(s.tags)) issues.push('шаг ' + (i + 1) + ': tags не массив');
    if (s.C != null && typeof s.C !== 'number') issues.push('шаг ' + (i + 1) + ': C не число');
  });
  // теги шагов должны существовать в pseudo/file
  const defined = new Set();
  (cfg.pseudo || []).forEach(l => String(l[1] || '').split(/\s+/).filter(Boolean).forEach(t => defined.add(t)));
  ((cfg.file && cfg.file.lines) || []).forEach(l => String(l[1] || '').split(/\s+/).filter(Boolean).forEach(t => defined.add(t)));
  const used = new Set();
  steps.forEach(s => (s.tags || []).forEach(t => used.add(t)));
  const unknown = [...used].filter(t => !defined.has(t));
  if (unknown.length) issues.push('теги без строк в pseudo/file: ' + unknown.join(', '));
  const unused = [...defined].filter(t => !used.has(t));
  if (unused.length) issues.push('строки с тегами, которых нет ни в одном шаге: ' + unused.join(', '));

  if (issues.length) { console.error('✗ ' + file); issues.forEach(i => console.error('    ' + i)); bad++; }
  else console.log('✓ ' + file + ' — ' + steps.length + ' шагов');
}
process.exit(bad ? 1 : 0);
