/* Движок интерактивных страниц лабораторных работ.
   Страница задаёт объект window.LAB (см. docs/lab-pages.md), движок строит DOM,
   проигрывает шаги и подсвечивает текущую строку кода в «листочке». */
(function () {
  'use strict';

  var cfg = window.LAB || {};
  var base = cfg.base || '';

  /* ─────────────────── утилиты ─────────────────── */

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function range(a, b) {
    var r = [];
    for (var k = a; k <= b; k++) r.push(k);
    return r;
  }

  function has(arr, k) { return !!arr && arr.indexOf(k) >= 0; }

  /* подсветка синтаксиса C/C++ */
  var RE_CODE = /(\/\/[^\n]*)|\/\*[\s\S]*?\*\/|\b(void|int|if|else|for|while|do|return|struct|const|char|short|long|unsigned|float|double|break|continue|switch|case|default|sizeof|static|inline|typedef|union|enum)\b|\b(NULL|malloc|free|printf|scanf|rand|srand|time|iconv|iconv_open|iconv_close|strlen|strcmp|memcpy)\b|(-?\b\d+(?:\.\d+)?\b)|("(?:[^"\\]|\\.)*")/g;

  function paint(src) {
    var out = '', last = 0, m;
    RE_CODE.lastIndex = 0;
    while ((m = RE_CODE.exec(src))) {
      out += esc(src.slice(last, m.index));
      var cls = m[1] || m[2] ? 'c' : m[3] ? 'k' : m[4] ? 't' : m[5] ? 'n' : 's';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  /* подсветка псевдокода: только ключевые слова DO/OD/IF/THEN */
  var RE_PSEUDO = /\b(DO|OD|IF|THEN|ELSE|WHILE|EXIT|RETURN)\b/g;

  function paintPseudo(src) {
    var out = '', last = 0, m;
    RE_PSEUDO.lastIndex = 0;
    while ((m = RE_PSEUDO.exec(src))) {
      out += esc(src.slice(last, m.index));
      out += '<span class="k">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last)) + '\n';
  }

  /* ─────────────────── рендереры сцены ─────────────────── */

  function cellHTML(v, k, o) {
    var cls = ['cell'];
    if (has(o.hl, k)) cls.push('hl');
    if (has(o.box, k)) cls.push('box');
    if (has(o.done, k)) cls.push('done');
    if (has(o.dim, k)) cls.push('dim');
    var inner = '';
    if (o.ptrs && o.ptrs[k]) inner += '<span class="ptr">' + esc(o.ptrs[k]) + '</span>';
    if (o.idx) inner += '<span class="idx">' + k + '</span>';
    inner += esc(String(v));
    if (has(o.under, k)) inner += '<span class="under"></span>';
    return '<div class="' + cls.join(' ') + '">' + inner + '</div>';
  }

  /* одна строка ячеек: Lab.cells(vals, {hl, box, done, dim, under, ptrs, idx}) */
  function cells(vals, o) {
    o = o || {};
    return '<div class="rowline"><div class="row-cells">' +
      vals.map(function (v, k) { return cellHTML(v, k, o); }).join('') +
      '</div></div>';
  }

  /* несколько строк: Lab.rows([{label, vals, ...}, {note:'текст'}], o) */
  function rows(list, o) {
    o = o || {};
    return '<div class="rows">' + list.map(function (r) {
      if (r.note) return '<div class="arrow-note">' + esc(r.note) + '</div>';
      var ro = {};
      for (var k in o) ro[k] = o[k];
      for (var j in r) ro[j] = r[j];
      return '<div class="rowline">' +
        (r.label ? '<div class="row-label">' + esc(r.label) + '</div>' : '') +
        '<div class="row-cells">' +
        (r.vals || []).map(function (v, i) { return cellHTML(v, i, ro); }).join('') +
        '</div></div>';
    }).join('') + '</div>';
  }

  /* подпись-заметка между строками */
  function note(text) { return '<div class="arrow-note">' + esc(text) + '</div>'; }

  /* связный список: Lab.list(vals, {ptrs, hl, done, nil, label}) */
  function list(vals, o) {
    o = o || {};
    var parts = [];
    vals.forEach(function (v, k) { parts.push(cellHTML(v, k, o)); });
    if (o.nil) parts.push('<div class="cell dim">NIL</div>');
    var arrows = parts.join('<span class="link">→</span>');
    return '<div class="rowline">' +
      (o.label ? '<div class="row-label">' + esc(o.label) + '</div>' : '') +
      '<div class="row-cells">' + arrows + '</div></div>';
  }

  /* дерево: Lab.tree(root, {hl, lab}) — root = {v, l, r, hl, edge, lab}
     hl: 'root' | 'ok' | 'dim' — стиль вершины; edge: 'hl' — выделить ребро к ней */
  function tree(root, o) {
    o = o || {};
    if (!root) return '<div class="tree-note">Дерево пусто</div>';
    var leaf = 0, maxDepth = 0;
    var nodes = [], edges = [];

    function walk(n, depth, parent) {
      if (!n) return null;
      maxDepth = Math.max(maxDepth, depth);
      var pos = { n: n, depth: depth, parent: parent };
      nodes.push(pos);
      var L = walk(n.l, depth + 1, pos);
      var R = walk(n.r, depth + 1, pos);
      if (!L && !R) pos.x = leaf++;
      else {
        var xs = [];
        if (L) xs.push(L.x);
        if (R) xs.push(R.x);
        pos.x = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
      }
      if (parent) edges.push({ from: parent, to: pos });
      return pos;
    }
    walk(root, 0, null);

    var CW = 54, RH = 66, R = 19, PADX = 34, TOP = 30;
    var W = PADX * 2 + Math.max(1, leaf) * CW;
    var H = TOP + (maxDepth + 1) * RH;
    var X = function (p) { return PADX + p.x * CW + CW / 2; };
    var Y = function (p) { return TOP + p.depth * RH; };

    var g = '';
    edges.forEach(function (e) {
      var cls = e.to.n.edge === 'hl' ? ' stroke="var(--hl-bar)" stroke-width="3"' :
        e.to.n.edge === 'ok' ? ' stroke="var(--ok)" stroke-width="3"' :
          ' stroke="var(--bd)" stroke-width="2"';
      var dash = e.to.n.edge === 'hl' ? ' stroke-dasharray="6 4"' : '';
      g += '<line x1="' + X(e.from) + '" y1="' + (Y(e.from) + R) + '" x2="' + X(e.to) +
        '" y2="' + (Y(e.to) - R) + '"' + cls + dash + '/>';
    });
    nodes.forEach(function (p) {
      var fill = 'var(--paper)', stroke = 'var(--bd)', sw = 2, color = 'var(--ink)';
      if (p.n.hl === 'root') { stroke = 'var(--accent)'; sw = 3; fill = 'var(--accent-soft)'; }
      else if (p.n.hl === 'ok') { stroke = 'var(--bd-strong)'; sw = 2; fill = 'var(--accent-soft)'; color = 'var(--ink)'; }
      else if (p.n.hl === 'warn') { stroke = 'var(--hl-bar)'; sw = 3; fill = 'var(--hl)'; }
      else if (p.n.hl === 'dim') { color = 'var(--mut)'; }
      var op = p.n.hl === 'dim' ? ' opacity=".45"' : '';
      g += '<circle cx="' + X(p) + '" cy="' + Y(p) + '" r="' + R + '" fill="' + fill +
        '" stroke="' + stroke + '" stroke-width="' + sw + '"' + op + '/>';
      g += '<text x="' + X(p) + '" y="' + (Y(p) + 5) + '" text-anchor="middle" font-size="14" ' +
        'font-weight="700" font-family="var(--mono)" fill="' + color + '"' + op + '>' + esc(String(p.n.v)) + '</text>';
      if (p.n.lab != null)
        g += '<text x="' + X(p) + '" y="' + (Y(p) + R + 15) + '" text-anchor="middle" font-size="11" ' +
          'font-weight="700" font-family="var(--mono)" fill="var(--mut)"' + op + '>' + esc(String(p.n.lab)) + '</text>';
    });
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
      '" role="img" aria-label="Дерево">' + g + '</svg>';
  }

  /* два дерева рядом: Lab.pair(a, b, capA, capB) */
  function pair(a, b, capA, capB) {
    return '<div class="rows" style="flex-direction:row;gap:34px;align-items:flex-start">' +
      '<div style="display:flex;flex-direction:column;gap:8px;align-items:center">' + a +
      '<div class="tree-note">' + esc(capA || '') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;align-items:center">' + b +
      '<div class="tree-note">' + esc(capB || '') + '</div></div></div>';
  }

  /* хеш-таблица: Lab.htable(slots, {mode:'chain'|'open', hl:[i], ok:[i]})
     slots — массив ячеек; ячейка = массив элементов {v, s} (s: 'hl'|'ok'); пусто = [] */
  function htable(slots, o) {
    o = o || {};
    var mode = o.mode || 'chain';
    var html = '<div class="htable">';
    slots.forEach(function (slot, i) {
      var cls = has(o.hl, i) ? ' hl' : has(o.ok, i) ? ' ok' : '';
      var cellsHTML;
      if (mode === 'open') {
        var item = slot[0];
        cellsHTML = item
          ? '<div class="hcell filled' + (item.s === 'hl' ? ' hl' : item.s === 'ok' ? ' ok' : '') + '">' + esc(String(item.v)) + '</div>'
          : '<div class="hcell' + cls + '">·</div>';
      } else {
        cellsHTML = slot.length
          ? '<div class="chain">' + slot.map(function (item) {
            return '<div class="hcell filled' + (item.s === 'hl' ? ' hl' : item.s === 'ok' ? ' ok' : '') + '">' + esc(String(item.v)) + '</div>';
          }).join('') + '</div>'
          : '<div class="hcell' + cls + '">·</div>';
      }
      html += '<div class="hrow"><span class="hidx">' + i + '</span>' + cellsHTML + '</div>';
    });
    return html + '</div>';
  }

  /* ─────────────────── генераторы шагов ─────────────────── */
  /* базовые генераторы здесь; лабораторные добавляют свои в window.LabGen
     (файл assets/gens/*.js подключается ДО lab.js) */
  var gen = window.LabGen || {};
  window.LabGen = gen;

  /* базовый проигрыватель счётчиков */
  function mkCount() { return { C: 0, M: 0 }; }

  function cnt(state, dC, dM) {
    state.C += dC || 0; state.M += dM || 0;
    return { C: state.C, M: state.M };
  }

  function swap(a, i, j) { var t = a[i]; a[i] = a[j]; a[j] = t; }

  function sortDone(tailFrom, n) { return range(0, tailFrom - 1); }

  /* финальный шаг для любой сортировки */
  function finish(a, st, st2, name) {
    return {
      title: 'Готово: массив отсортирован',
      text: 'Итог: <b>' + a.map(esc).join(' ') + '</b>. Всего сравнений <b>C = ' + st.C +
        '</b>, пересылок <b>M = ' + st.M + '</b>.' +
        (st2 ? ' Улучшенная версия: C = ' + st2.C + ', M = ' + st2.M + '.' : '') +
        '<span class="note-under">Каждый следующий элемент не меньше предыдущего, контрольная сумма не изменилась.</span>',
      tags: ['done'],
      stage: cells(a, { done: range(0, a.length - 1) }),
      cap: (name || 'Сортировка') + ' завершена',
      C: st.C, M: st.M
    };
  }

  /* ── 01 SelectSort ── */
  gen.select = function (a, opts) {
    opts = opts || {};
    var n = a.length, st = mkCount(), steps = [], done = [];
    steps.push({
      title: 'Исходный массив',
      text: 'Сортируем <b>' + a.map(esc).join(' ') + '</b> методом прямого выбора. ' +
        'Граница готовой части — слева от <code>i</code>, минимум неотсортированной части — <code>k</code>.',
      tags: ['sig'], stage: cells(a, {}), cap: 'n = ' + n, C: 0, M: 0
    });
    for (var i = 0; i < n - 1; i++) {
      var k = i;
      steps.push({
        title: 'Проход ' + (i + 1) + ': ищем минимум',
        text: 'Позиции <b>' + i + '…' + (n - 1) + '</b> ещё не отсортированы. Пока <code>k = i</code> = ' + i +
          ', минимум — «<b>' + esc(a[i]) + '</b>».',
        tags: ['loop', 'init'],
        stage: cells(a, { done: done, box: [k], ptrs: (function () { var p = {}; p[i] = 'i'; p[k] = p[k] ? p[k] + ', k' : 'k'; return p; })() }),
        cap: 'неотсортированная часть ' + i + '…' + (n - 1), C: st.C, M: st.M
      });
      for (var j = i + 1; j < n; j++) {
        cnt(st, 1, 0);
        var lt = a[j] < a[k], oldK = k;
        if (lt) k = j;
        var ptrs = {}; ptrs[i] = 'i'; ptrs[j] = 'j'; ptrs[k] = 'k';
        steps.push({
          title: 'Сравнение «' + a[j] + '» и «' + a[oldK] + '»',
          text: 'Сравниваем <code>a[' + j + '] = «<b>' + esc(a[j]) + '</b>»</code> с <code>a[k] = «<b>' +
            esc(a[oldK]) + '</b>»</code>: ' +
            (lt ? 'меньше — <code>k := ' + j + '</code>.' : 'не меньше — <code>k</code> не меняется.') +
            '<span class="note-under">Одно сравнение: C := C + 1.</span>',
          tags: lt ? ['scan', 'cmp', 'newk'] : ['scan', 'cmp'],
          stage: cells(a, { done: done, hl: [j], box: [k], ptrs: ptrs }),
          cap: 'сравниваем позиции ' + j + ' и ' + k, C: st.C, M: st.M
        });
      }
      var x = a[i], y = a[k];
      var swapSteps = ['swap'];
      if (k === i) swapSteps.push('chk');
      if (opts.improved && k === i) {
        steps.push({
          title: 'Обмен не нужен',
          text: '<code>k = i</code>: «<b>' + esc(x) + '</b>» и так минимальна — улучшенная версия пропускает обмен (0 пересылок).',
          tags: ['chk'], stage: cells(a, { done: done, box: [k] }), cap: 'k = i', C: st.C, M: st.M
        });
      } else {
        cnt(st, 0, 3);
        swap(a, i, k); done = range(0, i);
        steps.push({
          title: k === i ? 'Обмен «' + x + '» с самим собой' : 'Обмен a[' + i + '] ↔ a[' + k + ']',
          text: k === i
            ? '«<b>' + esc(x) + '</b>» уже минимальна, но обычная версия всё равно делает обмен: 3 пересылки.'
            : 'Меняем «<b>' + esc(x) + '</b>» (поз. ' + i + ') и «<b>' + esc(y) + '</b>» (поз. ' + k + ') — 3 пересылки. Позиция ' + i + ' закреплена.',
          tags: swapSteps,
          stage: cells(a, { done: done, ptrs: (function () { var p = {}; p[i + 1 <= n - 1 ? i + 1 : i] = 'i'; return p; })() }),
          cap: 'минимум встал в позицию ' + i, C: st.C, M: st.M
        });
      }
    }
    var doneAll = range(0, n - 1);
    steps.push({
      title: 'Последний элемент тоже на месте',
      text: 'Осталась одна позиция — она уже содержит максимум. Массив: <b>' + a.map(esc).join(' ') + '</b>.',
      tags: ['done'], stage: cells(a, { done: doneAll }), cap: 'все позиции готовы', C: st.C, M: st.M
    });
    return steps;
  };

  /* ── 02 BubbleSort ── */
  gen.bubble = function (a) {
    var n = a.length, st = mkCount(), steps = [], done = [];
    steps.push({
      title: 'Исходный массив',
      text: 'Идём справа налево: за проход минимум «всплывает» в позицию <code>i</code>.',
      tags: ['sig'], stage: cells(a, {}), cap: 'n = ' + n, C: 0, M: 0
    });
    for (var i = 0; i < n - 1; i++) {
      steps.push({
        title: 'Проход ' + (i + 1) + ': i = ' + i,
        text: 'Сравниваем соседей <code>a[j−1]</code> и <code>a[j]</code> для j от ' + n + ' до ' + (i + 1) +
          '. В конце прохода минимум окажется в позиции <b>' + i + '</b>.',
        tags: ['loop'], stage: cells(a, { done: done, ptrs: (function () { var p = {}; p[i] = 'i'; return p; })() }),
        cap: 'готовая часть слева', C: st.C, M: st.M
      });
      for (var j = n - 1; j > i; j--) {
        cnt(st, 1, 0);
        var sw = a[j] < a[j - 1], ptrs = {}; ptrs[j - 1] = 'j−1'; ptrs[j] = 'j';
        if (sw) { cnt(st, 0, 3); swap(a, j - 1, j); }
        steps.push({
          title: 'Сравнение «' + a[j - 1] + '» и «' + a[j] + '»',
          text: sw
            ? '<code>a[j] = «<b>' + esc(a[j]) + '</b>»</code> меньше <code>a[j−1] = «<b>' + esc(a[j - 1]) + '</b>»</code> — обмен (3 пересылки). Меньший уходит влево.'
            : '<code>a[j] = «<b>' + esc(a[j]) + '</b>»</code> не меньше <code>a[j−1] = «<b>' + esc(a[j - 1]) + '</b>»</code> — обмена нет.',
          tags: sw ? ['scan', 'cmp', 'swap'] : ['scan', 'cmp'],
          stage: cells(a, { done: done, hl: [j - 1, j], ptrs: ptrs }),
          cap: 'пара ' + (j - 1) + ', ' + j, C: st.C, M: st.M
        });
      }
      done = range(0, i);
      steps.push({
        title: 'Минимум прохода — в позиции ' + i,
        text: 'Элемент «<b>' + esc(a[i]) + '</b>» занял окончательное место.',
        tags: ['loop'], stage: cells(a, { done: done }), cap: 'закреплено: ' + (i + 1), C: st.C, M: st.M
      });
    }
    steps.push(finish(a, st, null, 'BubbleSort'));
    return steps;
  };

  /* ── 03 ShakerSort ── */
  gen.shaker = function (a) {
    var n = a.length, st = mkCount(), steps = [];
    var l = 0, r = n - 1, k = n;
    function doneSet() { var d = []; for (var x = 0; x < n; x++) if (x < l || x > r) d.push(x); return d; }
    steps.push({
      title: 'Начальные границы',
      text: '<code>l = 0</code>, <code>r = ' + (n - 1) + '</code>, <code>k = n</code>. Проходы чередуются: справа налево, затем слева направо.',
      tags: ['sig'], stage: cells(a, { done: doneSet() }), cap: 'рабочая часть 0…' + (n - 1), C: 0, M: 0
    });
    while (l < r) {
      steps.push({
        title: 'Проход влево: j от ' + r + ' до ' + (l + 1),
        text: 'Справа налево опускаем минимум к левой границе <code>l = ' + l + '</code>.',
        tags: ['loop'], stage: cells(a, { done: doneSet(), ptrs: (function () { var p = {}; p[l] = 'l'; p[r] = 'r'; return p; })() }),
        cap: 'границы l и r', C: st.C, M: st.M
      });
      for (var j = r; j > l; j--) {
        cnt(st, 1, 0);
        var sw = a[j] < a[j - 1], ptrs = {}; ptrs[j - 1] = 'j−1'; ptrs[j] = 'j';
        if (sw) { cnt(st, 0, 3); swap(a, j - 1, j); k = j; }
        steps.push({
          title: 'Сравнение «' + a[j - 1] + '» и «' + a[j] + '»',
          text: sw ? 'Обмен: минимум движется влево, <code>k := ' + j + '</code>.' : 'Обмена нет.',
          tags: sw ? ['scan', 'cmp', 'swap'] : ['scan', 'cmp'],
          stage: cells(a, { done: doneSet(), hl: [j - 1, j], ptrs: ptrs }),
          cap: 'пара ' + (j - 1) + ', ' + j, C: st.C, M: st.M
        });
      }
      l = k;
      steps.push({
        title: 'l = k = ' + l,
        text: 'Левая граница перешла в позицию последнего обмена: всё левее уже на местах.',
        tags: ['bound'], stage: cells(a, { done: doneSet() }), cap: 'l = ' + l, C: st.C, M: st.M
      });
      if (l >= r) break;
      steps.push({
        title: 'Проход вправо: j от ' + l + ' до ' + (r - 1),
        text: 'Слева направо поднимаем максимум к правой границе <code>r = ' + r + '</code>.',
        tags: ['loop'], stage: cells(a, { done: doneSet() }), cap: 'обратный проход', C: st.C, M: st.M
      });
      for (var j2 = l; j2 < r; j2++) {
        cnt(st, 1, 0);
        var sw2 = a[j2] > a[j2 + 1], p2 = {}; p2[j2] = 'j'; p2[j2 + 1] = 'j+1';
        if (sw2) { cnt(st, 0, 3); swap(a, j2, j2 + 1); k = j2; }
        steps.push({
          title: 'Сравнение «' + a[j2] + '» и «' + a[j2 + 1] + '»',
          text: sw2 ? 'Обмен: максимум уходит вправо, <code>k := ' + j2 + '</code>.' : 'Обмена нет.',
          tags: sw2 ? ['scan', 'cmp', 'swap'] : ['scan', 'cmp'],
          stage: cells(a, { done: doneSet(), hl: [j2, j2 + 1], ptrs: p2 }),
          cap: 'пара ' + j2 + ', ' + (j2 + 1), C: st.C, M: st.M
        });
      }
      r = k;
      steps.push({
        title: 'r = k = ' + r,
        text: 'Правая граница перешла в позицию последнего обмена: всё правее уже на местах.',
        tags: ['bound'], stage: cells(a, { done: doneSet() }), cap: 'r = ' + r, C: st.C, M: st.M
      });
    }
    steps.push(finish(a, st, null, 'ShakerSort'));
    return steps;
  };

  /* ── 04 InsertSort ── */
  gen.insert = function (a) {
    var n = a.length, st = mkCount(), steps = [];
    steps.push({
      title: 'Исходный массив',
      text: 'Отсортированная часть слева растёт: берём <code>a[i]</code> и вставляем её на место среди предыдущих.',
      tags: ['sig'], stage: cells(a, {}), cap: 'n = ' + n, C: 0, M: 0
    });
    for (var i = 1; i < n; i++) {
      var key = a[i];
      steps.push({
        title: 'Берём «' + key + '»',
        text: 'Элемент «<b>' + esc(key) + '</b>» (позиция ' + i + ') вставляем в упорядоченную часть <b>0…' + (i - 1) + '</b>.',
        tags: ['loop', 'take'],
        stage: cells(a, { box: [i], ptrs: (function () { var p = {}; p[i] = 'i'; return p; })() }),
        cap: 'ключ t = ' + key, C: st.C, M: st.M
      });
      var j = i - 1;
      while (j >= 0) {
        cnt(st, 1, 0);
        if (!(key < a[j])) {
          steps.push({
            title: 'Сравнение с «' + a[j] + '»',
            text: 'Ключ не меньше «<b>' + esc(a[j]) + '</b>» — место найдено.',
            tags: ['scan', 'cmp'], stage: cells(a, { hl: [j], box: [i] }),
            cap: 'вставка после позиции ' + j, C: st.C, M: st.M
          });
          break;
        }
        cnt(st, 0, 1);
        a[j + 1] = a[j];
        steps.push({
          title: 'Сравнение с «' + a[j] + '», сдвиг',
          text: 'Ключ меньше «<b>' + esc(a[j]) + '</b>» — сдвигаем его вправо на позицию ' + (j + 1) + '.',
          tags: ['scan', 'cmp', 'shift'],
          stage: cells(a, { hl: [j], box: [i] }),
          cap: 'a[' + (j + 1) + '] ← a[' + j + ']', C: st.C, M: st.M
        });
        j--;
      }
      a[j + 1] = key;
      if (j + 1 !== i) cnt(st, 0, 1);
      steps.push({
        title: '«' + key + '» в позиции ' + (j + 1),
        text: 'Отсортированная часть теперь <b>0…' + i + '</b>: ' + a.slice(0, i + 1).map(esc).join(' ') + '.',
        tags: ['put'], stage: cells(a, { done: range(0, i) }),
        cap: 'вставлено', C: st.C, M: st.M
      });
    }
    steps.push(finish(a, st, null, 'InsertSort'));
    return steps;
  };

  /* ── 05 ShellSort ── */
  gen.shell = function (a) {
    var n = a.length, st = mkCount(), steps = [];
    var s = 1;
    while (s < Math.floor(n / 2)) s = s * 2 + 1;
    steps.push({
      title: 'Начальный шаг s = ' + s,
      text: 'Шаги Кнута 1, 3, 7, 15…: начинаем с <b>s = ' + s + '</b>, затем <code>s = (s−1)/2</code> до 1.',
      tags: ['gap'], stage: cells(a, {}), cap: 's = ' + s, C: 0, M: 0
    });
    for (; s > 0; s = Math.floor((s - 1) / 2)) {
      steps.push({
        title: 'Шаг s = ' + s,
        text: 'Сортируем вставками подпоследовательности через ' + s + ' позиций: <code>a[i], a[i−s], a[i−2s], …</code>',
        tags: ['gap'], stage: cells(a, {}), cap: 'шаг ' + s, C: st.C, M: st.M
      });
      for (var i = s; i < n; i++) {
        var t = a[i];
        cnt(st, 0, 1);
        steps.push({
          title: 't = «' + t + '» (i = ' + i + ')',
          text: 'Запоминаем <code>t = «<b>' + esc(t) + '</b>»</code> и ищем место среди элементов с шагом ' + s + '.',
          tags: ['loop', 'take'], stage: cells(a, { box: [i], ptrs: (function () { var p = {}; p[i] = 'i'; return p; })() }),
          cap: 'с шагом ' + s, C: st.C, M: st.M
        });
        var j = i - s;
        while (j >= 0) {
          cnt(st, 1, 0);
          if (t < a[j]) {
            cnt(st, 0, 1);
            a[j + s] = a[j];
            steps.push({
              title: 'Сравнение «' + a[j] + '» и «' + t + '», сдвиг',
              text: '<code>a[j] = «<b>' + esc(a[j]) + '</b>»</code> больше t — сдвиг на ' + s + ' вправо.',
              tags: ['scan', 'cmp', 'shift'], stage: cells(a, { hl: [j], box: [i] }),
              cap: 'сдвиг на ' + s, C: st.C, M: st.M
            });
            j -= s;
          } else {
            steps.push({
              title: 'Сравнение «' + a[j] + '» и «' + t + '»',
              text: 'Не больше t — место найдено.',
              tags: ['scan', 'cmp'], stage: cells(a, { hl: [j], box: [i] }),
              cap: 'место найдено', C: st.C, M: st.M
            });
            break;
          }
        }
        a[j + s] = t;
        cnt(st, 0, 1);
        steps.push({
          title: 't = «' + t + '» на месте',
          text: 'Записываем <code>t</code> в позицию ' + (j + s) + '.',
          tags: ['put'], stage: cells(a, { box: [j + s] }),
          cap: 'позиция ' + (j + s), C: st.C, M: st.M
        });
      }
    }
    steps.push(finish(a, st, null, 'ShellSort'));
    return steps;
  };

  /* ── 06 HeapSort (min-heap → по убыванию, как в пособии) ── */
  gen.heap = function (a) {
    var n = a.length, st = mkCount(), steps = [];
    function heapTree(R) {
      function build(i) {
        if (i > R) return null;
        return { v: a[i - 1], l: build(2 * i), r: build(2 * i + 1) };
      }
      return build(1);
    }
    steps.push({
      title: 'Исходный массив',
      text: 'Пирамида (min-heap): <code>a[j] ≤ min(a[2j], a[2j+1])</code>. Сначала строим пирамиду из всех элементов.',
      tags: ['sig'], stage: cells(a, {}), cap: 'n = ' + n, C: 0, M: 0
    });
    function sift(L, R, tagTitle) {
      var x = a[L - 1], i = L;
      steps.push({
        title: tagTitle || ('Просеивание из позиции ' + L),
        text: 'Новый элемент <code>x = «<b>' + esc(x) + '</b>»</code> опускается вниз, пока не найдёт своё место.',
        tags: ['x'], stage: tree(heapTree(R)), cap: 'пирамида 1…' + R, C: st.C, M: st.M
      });
      while (true) {
        var j = 2 * i;
        if (j > R) break;
        cnt(st, 1, 0);
        if (j < R) cnt(st, 1, 0);
        if (j < R && a[j] <= a[j - 1]) j++;
        cnt(st, 1, 0);
        if (x <= a[j - 1]) break;
        cnt(st, 0, 1);
        a[i - 1] = a[j - 1]; i = j;
        steps.push({
          title: 'Сравнение и спуск',
          text: 'Ребёнок «<b>' + esc(a[i - 1]) + '</b>» меньше x — поднимаем его на уровень выше.',
          tags: ['kid', 'move'], stage: tree(heapTree(R)),
          cap: 'позиция ' + i, C: st.C, M: st.M
        });
      }
      cnt(st, 0, 1);
      a[i - 1] = x;
      steps.push({
        title: 'x = «' + x + '» на месте',
        text: 'Элемент встал на позицию ' + i + '.',
        tags: ['place'], stage: tree(heapTree(R)), cap: 'просеивание завершено', C: st.C, M: st.M
      });
    }
    for (var L = Math.floor(n / 2); L >= 1; L--) sift(L, n, 'Построение пирамиды: L = ' + L);
    steps.push({
      title: 'Пирамида построена',
      text: 'Корень — минимум всего массива: «<b>' + esc(a[0]) + '</b>».',
      tags: ['stage1'], stage: tree(heapTree(n)), cap: 'min-heap', C: st.C, M: st.M
    });
    for (var R = n; R > 1; R--) {
      cnt(st, 0, 3);
      swap(a, 0, R - 1);
      steps.push({
        title: 'Обмен a[1] ↔ a[' + R + ']',
        text: 'Минимум уходит в конец — позиция ' + (R - 1) + ' закреплена (3 пересылки).',
        tags: ['stage2', 'swap'], stage: cells(a, { done: range(R - 1, n - 1) }),
        cap: 'закреплено: ' + (n - R + 1), C: st.C, M: st.M
      });
      if (R - 1 > 1) sift(1, R - 1, 'Восстановление пирамиды (1…' + (R - 1) + ')');
    }
    steps.push(finish(a, st, null, 'HeapSort (по убыванию)'));
    return steps;
  };

  /* ── 07 QuickSort ── */
  gen.quick = function (a) {
    var st = mkCount(), steps = [];
    steps.push({
      title: 'Исходный массив',
      text: 'Опорный элемент <code>x = a[L]</code>. Указатели <code>i</code> и <code>j</code> идут навстречу друг другу.',
      tags: ['sig'], stage: cells(a, {}), cap: 'n = ' + a.length, C: 0, M: 0
    });
    function qs(L, R) {
      if (L >= R) return;
      var x = a[L], i = L, j = R;
      steps.push({
        title: 'Разделение [' + L + ', ' + R + ']',
        text: 'Опорный элемент <code>x = «<b>' + esc(x) + '</b>»</code> (позиция ' + L + ').',
        tags: ['part'],
        stage: cells(a, {
          box: [L],
          dim: range(0, L - 1).concat(range(R + 1, a.length - 1)),
          ptrs: (function () { var p = {}; p[i] = 'i'; p[j] = p[j] === 'i' ? 'i, j' : 'j'; return p; })()
        }),
        cap: 'окно [' + L + ', ' + R + ']', C: st.C, M: st.M
      });
      while (i <= j) {
        while (i <= R && a[i] < x) {
          i++;
          steps.push({
            title: 'i → вправо',
            text: '<code>a[i] = «<b>' + esc(a[i - 1]) + '</b>» &lt; x</code> — <code>i++</code>.',
            tags: ['scan', 'scani'],
            stage: cells(a, { box: [L], dim: range(0, L - 1).concat(range(R + 1, a.length - 1)), hl: [i - 1], ptrs: (function () { var p = {}; p[i] = 'i'; p[j] = 'j'; return p; })() }),
            cap: 'i = ' + i, C: st.C, M: st.M
          });
        }
        while (j >= L && a[j] > x) {
          j--;
          steps.push({
            title: 'j → влево',
            text: '<code>a[j] = «<b>' + esc(a[j + 1]) + '</b>» &gt; x</code> — <code>j--</code>.',
            tags: ['scan', 'scanj'],
            stage: cells(a, { box: [L], dim: range(0, L - 1).concat(range(R + 1, a.length - 1)), hl: [j + 1], ptrs: (function () { var p = {}; p[i] = 'i'; p[j] = 'j'; return p; })() }),
            cap: 'j = ' + j, C: st.C, M: st.M
          });
        }
        if (i <= j) {
          cnt(st, 0, 3);
          var vi = a[i], vj = a[j];
          swap(a, i, j);
          steps.push({
            title: 'Обмен a[' + i + '] ↔ a[' + j + ']',
            text: '«<b>' + esc(vj) + '</b>» уходит влево, «<b>' + esc(vi) + '</b>» — вправо (3 пересылки).',
            tags: ['swap'],
            stage: cells(a, { box: [L], dim: range(0, L - 1).concat(range(R + 1, a.length - 1)), hl: [i, j], ptrs: (function () { var p = {}; p[i] = 'i'; p[j] = 'j'; return p; })() }),
            cap: 'i = ' + i + ', j = ' + j, C: st.C, M: st.M
          });
          i++; j--;
        }
      }
      steps.push({
        title: 'Граница разделения: j = ' + j,
        text: 'Слева — не больше x, справа — не меньше. Рекурсивно сортируем обе части.',
        tags: ['recL', 'recR'],
        stage: cells(a, { box: j >= 0 && j < a.length ? [j] : [], dim: range(0, L - 1).concat(range(R + 1, a.length - 1)) }),
        cap: 'части [' + L + ', ' + j + '] и [' + i + ', ' + R + ']', C: st.C, M: st.M
      });
      qs(L, j);
      qs(i, R);
    }
    qs(0, a.length - 1);
    steps.push(finish(a, st, null, 'QuickSort'));
    return steps;
  };

  /* ── 09 Индексные массивы: пузырёк по индексному массиву B ── */
  gen.indexArrays = function (a) {
    var n = a.length, st = mkCount(), steps = [];
    var B = range(1, n);
    function Bvals() { return B.map(function (x) { return x - 1; }); }
    steps.push({
      title: 'Индексный массив B',
      text: 'A не двигаем вообще: строим <code>B = (1, 2, …, n)</code> и сортируем только его, сравнивая <code>A[B[j]]</code>.',
      tags: ['sig'],
      stage: rows([{ label: 'A', vals: a, dim: range(0, n - 1) }, { label: 'B', vals: Bvals(), idx: true }]),
      cap: 'сортируем только B', C: 0, M: 0
    });
    for (var i = 0; i < n - 1; i++) {
      for (var j = n - 1; j > i; j--) {
        cnt(st, 1, 0);
        var va = a[B[j] - 1], vb = a[B[j - 1] - 1], sw = va < vb;
        var ptrs = {}; ptrs[j - 1] = 'j−1'; ptrs[j] = 'j';
        if (sw) { cnt(st, 0, 3); var t = B[j]; B[j] = B[j - 1]; B[j - 1] = t; }
        steps.push({
          title: 'Сравнение A[' + B[j] + '] и A[' + B[j - 1] + ']',
          text: 'Сравниваем записи <code><b>' + esc(vb) + '</b></code> и <code><b>' + esc(va) + '</b></code> через индексы B: ' +
            (sw ? 'меньший индекс встаёт влево (3 пересылки).' : 'порядок уже верный.'),
          tags: sw ? ['scan', 'cmp', 'swap'] : ['scan', 'cmp'],
          stage: rows([
            { label: 'A', vals: a, dim: range(0, n - 1), hl: [B[j] - 1, B[j - 1] - 1] },
            { label: 'B', vals: Bvals(), idx: true, hl: [j - 1, j], ptrs: ptrs }
          ]),
          cap: 'сравниваем через B', C: st.C, M: st.M
        });
      }
    }
    steps.push({
      title: 'B отсортирован',
      text: 'Читая <code>A[B[1]], A[B[2]], …</code>, получаем упорядоченную последовательность, хотя A не двигался: <b>' +
        B.map(function (x) { return a[x - 1]; }).map(esc).join(' ') + '</b>.',
      tags: ['done'],
      stage: rows([{ label: 'A', vals: a, dim: range(0, n - 1) }, { label: 'B', vals: Bvals(), idx: true, done: range(0, n - 1) }]),
      cap: 'готово', C: st.C, M: st.M
    });
    return steps;
  };

  /* ── 10 Двоичный поиск ── */
  gen.binarySearch = function (ctx) {
    var a = ctx.arr.slice(), x = ctx.x, n = a.length, st = mkCount(), steps = [];
    steps.push({
      title: 'Отсортированный массив',
      text: 'Ищем <code>X = <b>' + esc(x) + '</b></code>. Работаем только с упорядоченным массивом.',
      tags: ['sig'], stage: cells(a, { done: range(0, n - 1) }), cap: 'n = ' + n, C: 0, M: 0
    });
    var L = 0, R = n - 1, found = -1;
    while (L <= R) {
      var m = Math.floor((L + R) / 2);
      cnt(st, 2, 0);
      var ptrs = {}; ptrs[L] = 'L'; ptrs[R] = R === L ? 'L, R' : 'R'; ptrs[m] = (m === L || m === R) ? null : 'm';
      steps.push({
        title: 'Ищем в [' + L + ', ' + R + ']',
        text: 'Середина <code>m = ⌊(L+R)/2⌋ = ' + m + '</code>, элемент <code>a[m] = <b>' + esc(a[m]) + '</b></code>.',
        tags: ['loop', 'mid'],
        stage: cells(a, { done: range(0, n - 1), dim: range(0, L - 1).concat(range(R + 1, n - 1)), hl: [m], ptrs: ptrs }),
        cap: 'окно L…R', C: st.C, M: st.M
      });
      if (a[m] === x) {
        found = m;
        steps.push({
          title: 'Найден!',
          text: '<code>a[m] = X</code> — поиск окончен, позиция <b>' + m + '</b>.',
          tags: ['found'],
          stage: cells(a, { done: range(0, n - 1), box: [m], ptrs: ptrs }),
          cap: 'позиция ' + m, C: st.C, M: st.M
        });
        break;
      }
      if (a[m] < x) {
        L = m + 1;
        steps.push({
          title: 'a[m] < X → ищем справа',
          text: 'Элемент меньше искомого — <code>L := m+1 = ' + L + '</code>.',
          tags: ['goRight'],
          stage: cells(a, { done: range(0, n - 1), dim: range(0, L - 1).concat(range(R + 1, n - 1)), ptrs: ptrs }),
          cap: 'L = ' + L, C: st.C, M: st.M
        });
      } else {
        R = m - 1;
        steps.push({
          title: 'a[m] > X → ищем слева',
          text: 'Элемент больше искомого — <code>R := m−1 = ' + R + '</code>.',
          tags: ['goLeft'],
          stage: cells(a, { done: range(0, n - 1), dim: range(0, L - 1).concat(range(R + 1, n - 1)), ptrs: ptrs }),
          cap: 'R = ' + R, C: st.C, M: st.M
        });
      }
    }
    if (found < 0) steps.push({
      title: 'Не найден',
      text: 'Окно опустело (<code>L > R</code>): элемента <b>' + esc(x) + '</b> в массиве нет. Всего сравнений <b>C = ' + st.C + '</b>.',
      tags: ['done'], stage: cells(a, { done: range(0, n - 1) }), cap: 'L > R', C: st.C, M: st.M
    });
    return steps;
  };

  /* ── 14 Хеширование: прямое связывание ── */
  gen.hashChaining = function (ctx) {
    var keys = ctx.keys, m = ctx.m, st = mkCount(), steps = [];
    var slots = [];
    for (var z = 0; z < m; z++) slots.push([]);
    function H(k) { return ((k % m) + m) % m; }
    steps.push({
      title: 'Пустая таблица, m = ' + m,
      text: 'Метод деления: <code>H(k) = k mod m</code>, <code>m</code> простое. Для каждого индекса — свой список.',
      tags: ['sig'], stage: htable(slots, { mode: 'chain' }), cap: 'коллизий пока нет', C: 0, M: 0
    });
    keys.forEach(function (k, idx) {
      var h = H(k);
      cnt(st, 1, 0);
      steps.push({
        title: 'Вставка ' + k + ': H(' + k + ') = ' + h,
        text: 'Вычисляем хеш <code>' + k + ' mod ' + m + ' = <b>' + h + '</b></code>.',
        tags: ['hash'],
        stage: htable(slots.map(function (s, i) {
          return s.map(function (v) { return { v: v }; }).concat(i === h && idx === -1 ? [{ v: k, s: 'hl' }] : []);
        }), { mode: 'chain', hl: [h] }),
        cap: 'корзина ' + h, C: st.C, M: st.M
      });
      var collided = slots[h].length > 0;
      steps.push({
        title: collided ? 'Коллизия!' : 'Корзина свободна',
        text: collided
          ? 'В корзине ' + h + ' уже есть ' + slots[h].join(', ') + ' — добавляем ' + k + ' в конец списка (прямое связывание).'
          : 'Список пуст — ключ ' + k + ' становится единственным элементом.',
        tags: ['insert'],
        stage: (function () {
          var copy = slots.map(function (s) { return s.slice(); });
          copy[h] = copy[h].concat([{ v: k, s: 'hl' }]);
          return htable(copy, { mode: 'chain', hl: [h] });
        })(),
        cap: 'вставка в ' + h, C: st.C, M: st.M
      });
      slots[h].push(k);
      steps.push({
        title: 'Таблица после ' + (idx + 1) + ' ключа',
        text: 'Длина списка корзины ' + h + ' = ' + slots[h].length + '.',
        tags: ['done'],
        stage: htable(slots.map(function (s) { return s.map(function (v) { return { v: v }; }); }), { mode: 'chain', ok: [h] }),
        cap: 'n = ' + (idx + 1), C: st.C, M: st.M
      });
    });
    var lens = slots.map(function (s) { return s.length; });
    steps.push({
      title: 'Готово',
      text: 'Максимальная длина списка — <b>' + Math.max.apply(null, lens) + '</b>, средняя n/m = <b>' +
        (keys.length / m).toFixed(2) + '</b>. Сравнений при поиске в среднем C = n/2m = <b>' +
        (keys.length / (2 * m)).toFixed(2) + '</b>.',
      tags: ['stats'],
      stage: htable(slots.map(function (s) { return s.map(function (v) { return { v: v, s: 'ok' }; }); }), { mode: 'chain' }),
      cap: 'таблица заполнена', C: st.C, M: st.M
    });
    return steps;
  };

  /* ── 15 Хеширование: открытая адресация (линейные пробы) ── */
  gen.hashOpen = function (ctx) {
    var keys = ctx.keys, m = ctx.m, st = mkCount(), steps = [];
    var slots = [];
    for (var z = 0; z < m; z++) slots.push([]);
    function H(k) { return ((k % m) + m) % m; }
    steps.push({
      title: 'Пустая таблица, m = ' + m,
      text: 'Списков нет: при коллизии ключ уходит в другую ячейку по правилу <code>h(i) = (h(x) + i) mod m</code>.',
      tags: ['sig'], stage: htable(slots, { mode: 'open' }), cap: 'все ячейки пусты', C: 0, M: 0
    });
    var stopped = false;
    for (var ki = 0; ki < keys.length && !stopped; ki++) {
      var k = keys[ki], idx = ki;
      var h0 = H(k), h = h0, probe = 0;
      steps.push({
        title: 'Ключ ' + k + ': h₀ = ' + h0,
        text: 'Начинаем с ячейки <code>' + h0 + '</code>.',
        tags: ['hash'], stage: htable(slots, { mode: 'open', hl: [h0] }),
        cap: 'h = ' + h0, C: st.C, M: st.M
      });
      while (true) {
        cnt(st, 1, 0);
        if (slots[h].length === 0) break;
        if (probe >= m - 1) {
          steps.push({
            title: 'Таблица переполнена',
            text: 'После ' + probe + ' проб свободной ячейки не нашлось: ключ <b>' + k +
              '</b> не помещается в таблицу (нужно m > n, а m простое). Дальше вставка невозможна.',
            tags: ['probe', 'stats'],
            stage: htable(slots, { mode: 'open', hl: [h] }),
            cap: 'нет свободной ячейки', C: st.C, M: st.M
          });
          stopped = true;
          break;
        }
        steps.push({
          title: 'Ячейка ' + h + ' занята',
          text: 'Здесь уже лежит ' + slots[h][0] + ' — проба №' + probe + ', переходим к <code>(' + h0 + ' + ' + (probe + 1) + ') mod ' + m + ' = ' + ((h0 + probe + 1) % m) + '</code>.',
          tags: ['probe'],
          stage: htable(slots, { mode: 'open', hl: [h], ok: [h0] }),
          cap: 'проба ' + (probe + 1), C: st.C, M: st.M
        });
        probe++; h = (h0 + probe) % m;
      }
      if (stopped) break;
      steps.push({
        title: 'Свободная ячейка: ' + h,
        text: 'Ключ <b>' + k + '</b> встаёт в ячейку ' + h + ' после ' + probe + ' проб(ы).',
        tags: ['insert'],
        stage: (function () {
          var copy = slots.map(function (s) { return s.slice(); });
          copy[h] = [{ v: k, s: 'hl' }];
          return htable(copy, { mode: 'open', hl: [h] });
        })(),
        cap: 'запись', C: st.C, M: st.M
      });
      slots[h] = [{ v: k }];
      steps.push({
        title: 'Таблица после ' + (idx + 1) + ' ключа',
        text: 'Записано ' + (idx + 1) + ' из ' + keys.length + '.',
        tags: ['done'],
        stage: htable(slots, { mode: 'open', ok: [h] }), cap: 'n = ' + (idx + 1), C: st.C, M: st.M
      });
    }
    var filled = slots.filter(function (s) { return s.length; }).length;
    steps.push({
      title: stopped ? 'Остановка: места нет' : 'Готово',
      text: stopped
        ? 'Занято <b>' + filled + ' из ' + m + '</b> ячеек — таблица заполнена целиком, свободных мест не осталось.'
        : 'Все ' + keys.length + ' ключей расставлены, занято ячеек <b>' + filled + ' из ' + m +
          '</b>. При поиске каждая занятая ячейка проверяется один раз — <code>C = O(1)</code> в среднем при n &lt; m.',
      tags: ['stats'], stage: htable(slots, { mode: 'open' }), cap: 'таблица заполнена', C: st.C, M: st.M
    });
    return steps;
  };

  /* ─────────────────── движок страницы ─────────────────── */

  var steps = [], idx = 0, timer = null, speed = 1, dockTab = 'pseudo';
  var $ = function (s) { return document.querySelector(s); };

  function parseDefault(raw) {
    raw = String(raw == null ? '' : raw).trim();
    if (!raw) return null;
    var isNums = /^-?\d+(\s*[,;\s]\s*-?\d+)*$/.test(raw) && (/\d/.test(raw)) && (/[,;\s]/.test(raw) || cfg.kind === 'numbers');
    if (cfg.kind === 'letters') isNums = false;
    if (isNums) {
      var nums = raw.split(/[\s,;]+/).map(Number).filter(function (x) { return !isNaN(x); });
      if (cfg.max && nums.length > cfg.max) nums = nums.slice(0, cfg.max);
      return nums;
    }
    var chars = raw.replace(/\s+/g, '').toUpperCase().split('');
    if (cfg.max && chars.length > cfg.max) chars = chars.slice(0, cfg.max);
    return chars;
  }

  function readInputs() {
    var vals = {};
    (cfg.inputs || [{ id: 'data', label: 'Данные', value: '' }]).forEach(function (f) {
      var el = document.getElementById('in-' + f.id);
      vals[f.id] = el ? el.value : '';
    });
    if (cfg.parse) return cfg.parse(vals);
    return parseDefault(vals[(cfg.inputs && cfg.inputs[0] ? cfg.inputs[0].id : 'data')]);
  }

  function hint(msg, bad) {
    var el = $('#hint');
    if (!el) return;
    el.textContent = msg;
    el.style.color = bad ? 'var(--hl-bar)' : '';
  }

  function build() {
    var ctx;
    try { ctx = readInputs(); } catch (e) { ctx = null; }
    if (ctx == null || (Array.isArray(ctx) && !ctx.length)) {
      hint('Введите данные — например: ' + ((cfg.inputs && cfg.inputs[0] && cfg.inputs[0].example) || 'KDBACFGE'), true);
      return;
    }
    var out;
    try { out = (cfg.steps || function () { return []; })(ctx); }
    catch (e) { hint('Ошибка в шагах: ' + e.message, true); return; }
    if (!out || !out.length) { hint('Нет шагов для этих данных.', true); return; }
    steps = out; idx = 0;
    hint(cfg.hint || '');
    stop();
    render();
  }

  function stepTags(s, kind) {
    if (kind === 'file' && s.ftags) return s.ftags;
    if (kind === 'pseudo' && s.ptags) return s.ptags;
    return s.tags || [];
  }

  function render() {
    var s = steps[idx];
    if (!s) return;
    var stage = $('#stage');
    stage.innerHTML = (typeof s.stage === 'function' ? s.stage() : s.stage) || '<div class="stage-caption">—</div>';
    $('#caption').textContent = s.cap || '';
    $('#stepTitle').textContent = s.title || ('Шаг ' + (idx + 1));
    $('#stepText').innerHTML = s.text || '';
    var pct = steps.length > 1 ? (idx / (steps.length - 1)) * 100 : 100;
    $('#bar').style.width = pct + '%';
    $('#mBar').style.width = pct + '%';
    $('#counter').innerHTML = '<b>' + (idx + 1) + '</b> / ' + steps.length;

    /* счётчики */
    var chips = $('#chips');
    var html = '';
    if (s.C != null) html += '<span class="chip">C = ' + s.C + '</span>';
    if (s.M != null) html += '<span class="chip m">M = ' + s.M + '</span>';
    (cfg.chips || []).forEach(function (c) {
      html += '<span class="chip ' + (c.cls || 'plain') + '">' + c.t + '</span>';
    });
    chips.innerHTML = html;

    paintDock(s);
  }

  function paintDock(s) {
    var pre = $('#code');
    if (!pre) return;
    var lines = dockTab === 'pseudo' ? (cfg.pseudo || []) : ((cfg.file && cfg.file.lines) || []);
    var tags = stepTags(s, dockTab === 'pseudo' ? 'pseudo' : 'file');
    pre.innerHTML = lines.map(function (l, i) {
      var lt = String(l[1] || '').split(/\s+/).filter(Boolean);
      var on = lt.some(function (t) { return tags.indexOf(t) >= 0; });
      var body = dockTab === 'pseudo' ? paintPseudo(l[0]) : paint(l[0]);
      return '<span class="ln' + (on ? ' on fresh' : '') + '" data-t=" ' + esc(l[1] || '') + ' ">' +
        '<span class="no">' + (i + 1) + '</span>' + body + '</span>';
    }).join('');

    var on = pre.querySelectorAll('.ln.on');
    var scroll = $('#dockScroll');
    if (on.length && scroll && $('#dock').classList.contains('open')) {
      var first = on[0];
      var target = first.offsetTop - scroll.clientHeight / 2 + 20;
      scroll.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
  }

  /* ── управление ── */

  function goto(i) {
    if (!steps.length) return;
    idx = Math.max(0, Math.min(steps.length - 1, i));
    render();
  }

  function play() {
    if (timer) return;
    if (idx >= steps.length - 1) idx = 0;
    $('#btnPlay').textContent = '⏸';
    timer = setInterval(function () {
      if (idx >= steps.length - 1) { stop(); return; }
      goto(idx + 1);
    }, 1500 / speed);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    var b = $('#btnPlay');
    if (b) b.textContent = '▶';
  }

  function setDock(open) {
    $('#dock').classList.toggle('open', open);
    document.body.classList.toggle('dock-open', open);
    $('#dockTab').textContent = open ? '» код' : '{ } код';
    try { localStorage.setItem('labDock', open ? '1' : '0'); } catch (e) {}
    if (open) paintDock(steps[idx] || {});
  }

  function setTab(tab) {
    dockTab = tab;
    $('#tabPseudo').classList.toggle('on', tab === 'pseudo');
    $('#tabFile').classList.toggle('on', tab === 'file');
    var sub = $('#dockSub');
    if (tab === 'pseudo') sub.innerHTML = 'Псевдокод из README работы';
    else sub.innerHTML = 'Файл <a href="' + esc(base + (cfg.file ? cfg.file.url : '')) + '" target="_blank" rel="noopener">' +
      esc(cfg.file ? cfg.file.name : 'исходник') + '</a> — открывается целиком';
    try { localStorage.setItem('labTab', tab); } catch (e) {}
    paintDock(steps[idx] || {});
  }

  /* ── сборка DOM ── */

  function buildDOM() {
    var inputs = (cfg.inputs || [{ id: 'data', label: 'Данные', value: 'KDBACFGE', placeholder: 'KDBACFGE' }]);
    var fields = inputs.map(function (f) {
      return '<div class="field"><label for="in-' + f.id + '">' + esc(f.label) + '</label>' +
        '<input id="in-' + f.id + '" value="' + esc(f.value || '') + '" placeholder="' + esc(f.placeholder || '') +
        '" autocomplete="off" spellcheck="false"></div>';
    }).join('');

    var details = (cfg.details || []).map(function (d) {
      return '<details><summary>' + esc(d.s) + '</summary>' + d.h + '</details>';
    }).join('');

    var links = (cfg.links || []).map(function (l) {
      return '<a class="pill" href="' + esc(l.href) + '">' + esc(l.label) + '</a>';
    }).join('');

    document.body.innerHTML =
      '<header class="topbar">' +
      '<a class="back" href="' + esc(base + 'index.html') + '">← Все работы</a>' +
      '<span class="crumb">' + esc(cfg.crumb || '') + '</span>' +
      '<span class="spacer"></span>' +
      '<button class="icon-btn" id="themeBtn" type="button" title="Сменить тему">☾</button>' +
      '<button class="icon-btn" id="dockBtn" type="button" title="Код">{ }</button>' +
      '</header>' +

      '<div class="wrap">' +
      '<div class="col">' +
      '<div class="card">' +
      '<span class="num-badge">№ ' + esc(cfg.num || '') + '</span>' +
      '<h1>' + esc(cfg.title || '') + '</h1>' +
      (cfg.algo ? '<span class="algo-chip">' + esc(cfg.algo) + '</span>' : '') +
      (cfg.lead ? '<p class="lead" style="margin-top:10px">' + cfg.lead + '</p>' : '') +
      (links ? '<div class="links" style="margin-top:14px">' + links + '</div>' : '') +
      '</div>' +

      '<div class="card step-card">' +
      '<div class="step-title" id="stepTitle">—</div>' +
      '<p class="step-text" id="stepText"></p>' +
      '<div class="step-progress"><i id="bar"></i></div>' +
      '</div>' +

      '<div class="card"><h2>Счётчики</h2><div class="chips" id="chips"></div></div>' +

      '<div class="card">' +
      '<div class="inputs">' + fields +
      '<button class="btn" id="btnGo" type="button">' + esc(cfg.primaryLabel || 'Построить') + '</button>' +
      (cfg.example ? '<button class="btn ghost" id="btnEx" type="button">Пример</button>' : '') +
      '</div>' +
      '<p class="hint" id="hint">' + esc(cfg.hint || '') + '</p>' +
      '</div>' +
      '</div>' +

      '<div class="col">' +
      (cfg.task && cfg.task.length ?
        '<div class="note"><h2>Задание</h2><ol>' +
        cfg.task.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
        '</ol></div>' : '') +
      '<div class="stage"><div id="stage"></div><div class="stage-caption" id="caption"></div></div>' +
      details +
      '</div>' +
      '</div>' +

      '<div class="player">' +
      '<button id="btnStart" type="button" title="В начало">⏮</button>' +
      '<button id="btnPrev" type="button" title="Назад">◀</button>' +
      '<button class="primary" id="btnPlay" type="button" title="Играть">▶</button>' +
      '<button id="btnNext" type="button" title="Вперёд">▶|</button>' +
      '<span class="counter" id="counter"><b>1</b> / 1</span>' +
      '<div class="mini-progress"><i id="mBar"></i></div>' +
      '<select id="speed" title="Скорость">' +
      '<option value="0.5">0.5×</option><option value="1" selected>1×</option>' +
      '<option value="1.5">1.5×</option><option value="2">2×</option></select>' +
      '</div>' +

      '<aside class="dock" id="dock" aria-label="Код">' +
      '<button class="dock-tab" id="dockTab" type="button">{ } код</button>' +
      '<div style="display:flex;flex-direction:column;min-height:0;height:100%">' +
      '<div class="dock-head"><div><h2>' + esc(cfg.dockTitle || cfg.algo || 'Код работы') + '</h2>' +
      '<p>' + esc(cfg.dockDesc || 'Подсвечена строка текущего шага') + '</p></div>' +
      '<button class="x" id="dockX" type="button" aria-label="Закрыть">✕</button></div>' +
      '<div class="switch">' +
      '<button id="tabPseudo" type="button">Псевдокод</button>' +
      '<button id="tabFile" type="button">Файл: ' + esc(cfg.file ? cfg.file.name : '—') + '</button>' +
      '</div>' +
      '<div class="dock-sub" id="dockSub"></div>' +
      '<div class="dock-scroll" id="dockScroll"><pre class="code" id="code"></pre></div>' +
      '<div class="dock-foot">' + (cfg.dockFoot ||
        '<span class="kbd">←</span> <span class="kbd">→</span> — шаг, <span class="kbd">Пробел</span> — пауза, <span class="kbd">Esc</span> — закрыть код.') +
      '</div></div></aside>' +

      '<footer>' + esc(cfg.footer || 'Структуры и алгоритмы обработки данных · лабораторная работа') + '</footer>';
  }

  /* ── события ── */

  function wire() {
    $('#btnGo').onclick = build;
    var ex = $('#btnEx');
    if (ex) ex.onclick = function () {
      (cfg.inputs || []).forEach(function (f) {
        if (f.example != null) document.getElementById('in-' + f.id).value = f.example;
      });
      build();
    };
    (cfg.inputs || []).forEach(function (f) {
      var el = document.getElementById('in-' + f.id);
      if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') build(); });
    });

    $('#btnStart').onclick = function () { stop(); goto(0); };
    $('#btnPrev').onclick = function () { stop(); goto(idx - 1); };
    $('#btnNext').onclick = function () { stop(); goto(idx + 1); };
    $('#btnPlay').onclick = function () { timer ? stop() : play(); };
    $('#speed').onchange = function () {
      speed = parseFloat(this.value);
      if (timer) { stop(); play(); }
    };

    $('#dockTab').onclick = function () { setDock(!$('#dock').classList.contains('open')); };
    $('#dockBtn').onclick = function () { setDock(!$('#dock').classList.contains('open')); };
    $('#dockX').onclick = function () { setDock(false); };
    $('#tabPseudo').onclick = function () { setTab('pseudo'); };
    $('#tabFile').onclick = function () { setTab('file'); };

    $('#themeBtn').onclick = function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
      if (next) document.documentElement.setAttribute('data-theme', next);
      else document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('labTheme', next); } catch (e) {}
      this.textContent = next === 'dark' ? '☀' : '☾';
    };

    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'ArrowRight') { stop(); goto(idx + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { stop(); goto(idx - 1); e.preventDefault(); }
      else if (e.key === ' ') { timer ? stop() : play(); e.preventDefault(); }
      else if (e.key === 'Escape') setDock(false);
    });
  }

  /* ── старт ── */

  function init() {
    try {
      var th = localStorage.getItem('labTheme');
      if (th) document.documentElement.setAttribute('data-theme', th);
    } catch (e) {}
    buildDOM();
    wire();
    $('#themeBtn').textContent = (function () {
      try { return localStorage.getItem('labTheme') === 'dark' ? '☀' : '☾'; } catch (e) { return '☾'; }
    })();

    var tab = 'pseudo';
    try { tab = localStorage.getItem('labTab') || 'pseudo'; } catch (e) {}
    setTab(tab === 'file' ? 'file' : 'pseudo');

    var open = false;
    try { open = localStorage.getItem('labDock') === '1'; } catch (e) {}
    setDock(open);

    build();
  }

  window.Lab = {
    esc: esc, range: range, cells: cells, rows: rows, list: list, note: note,
    tree: tree, pair: pair, htable: htable, paint: paint,
    gen: gen, mkCount: mkCount, cnt: cnt, swap: swap, finish: finish,
    parseDefault: parseDefault,
    init: init, rebuild: build, state: function () { return { steps: steps, idx: idx }; }
  };

  if (cfg.noInit) return; /* страница сама вызовет Lab.init() после своих скриптов */

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
