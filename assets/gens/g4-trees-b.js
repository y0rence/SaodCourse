/* Генераторы шагов для лабораторных работ 2 семестра (деревья поиска).
   08 — G.sdpBuild  : вставочное СДП + сравнение с ИСДП (sdp.cpp)
   09 — G.sdpDelete : удаление ключей из СДП, три случая (sdp_delete.cpp)
   10 — G.a1a2      : приближённые деревья A1, A2 и точный ДОП (a1_a2.cpp)
   Подключается строкой <script src="../../assets/gens/g4-trees-b.js"></script> ДО lab.js. */
(function () {
  'use strict';

  var G = window.LabGen = window.LabGen || {};

  /* ═══════════════════ общие помощники ═══════════════════ */

  function esc(s) { return Lab.esc(s); }

  function copy(n) { return n ? { v: n.v, l: copy(n.l), r: copy(n.r) } : null; }

  function find(n, k) {
    while (n) {
      if (k === n.v) return n;
      n = k < n.v ? n.l : n.r;
    }
    return null;
  }

  function insert(n, k) {
    if (!n) return { v: k, l: null, r: null };
    if (k < n.v) n.l = insert(n.l, k);
    else if (k > n.v) n.r = insert(n.r, k);
    return n;
  }

  function build(keys) {
    var r = null;
    for (var i = 0; i < keys.length; i++) r = insert(r, keys[i]);
    return r;
  }

  function size(n) { return n ? 1 + size(n.l) + size(n.r) : 0; }

  /* буква без номера в алфавите даёт свой код — как в задачах про ФИО */
  function num(v) {
    var x = Number(v);
    return isNaN(x) ? String(v).charCodeAt(0) : x;
  }

  function sumK(n) { return n ? num(n.v) + sumK(n.l) + sumK(n.r) : 0; }

  function height(n) { return n ? 1 + Math.max(height(n.l), height(n.r)) : 0; }

  function sumPath(n, L) { return n ? L + sumPath(n.l, L + 1) + sumPath(n.r, L + 1) : 0; }

  function avgH(n) { var s = size(n); return s ? sumPath(n, 1) / s : 0; }

  function inorder(n, out) {
    if (!n) return out;
    inorder(n.l, out);
    out.push(n.v);
    inorder(n.r, out);
    return out;
  }

  /* копия с подсветкой одной вершины → HTML дерева */
  function decorate(n, k, o) {
    var c = copy(n), t = find(c, k);
    if (t) {
      if (o.hl) t.hl = o.hl;
      if (o.edge) t.edge = o.edge;
      if (o.lab != null) t.lab = o.lab;
    }
    return Lab.tree(c);
  }

  /* копия, в которой под каждым узлом — его уровень (корень = 1) → HTML дерева */
  function depthLab(n) {
    var c = copy(n);
    (function w(x, d) {
      if (!x) return;
      x.lab = String(d);
      w(x.l, d + 1);
      w(x.r, d + 1);
    })(c, 1);
    return Lab.tree(c);
  }

  /* описание пути поиска ключа: сравнения, направления, число сравнений.
     AddSDP: if (D < Data) — 1 сравнение; else if (D > Data) — второе; равенство — тоже 2. */
  function pathInfo(root, k) {
    var p = root, parts = [], comps = 0, nodes = [];
    var goL = false, goR = false, dir = null, parent = null;
    while (p) {
      nodes.push(p);
      if (k < p.v) {
        comps += 1;
        parts.push(esc(k) + ' &lt; ' + esc(p.v) + ' → влево');
        goL = true; dir = 'l'; parent = p; p = p.l;
      } else if (k > p.v) {
        comps += 2;
        parts.push(esc(k) + ' &gt; ' + esc(p.v) + ' → вправо');
        goR = true; dir = 'r'; parent = p; p = p.r;
      } else {
        comps += 2;
        parts.push(esc(k) + ' = ' + esc(p.v) + ' → найден');
        return { parts: parts, comps: comps, found: true, nodes: nodes, goL: goL, goR: goR, dir: dir, parent: parent };
      }
    }
    return { parts: parts, comps: comps, found: false, nodes: nodes, goL: goL, goR: goR, dir: dir, parent: parent };
  }

  /* копия дерева с подсвеченным путём поиска ключа k */
  function stagePath(root, k, o) {
    o = o || {};
    var c = copy(root), p = c, last = null;
    while (p) {
      p.edge = 'hl';
      last = p;
      if (k < p.v) p = p.l;
      else if (k > p.v) p = p.r;
      else break;
    }
    if (last) {
      if (k === last.v && o.found) {
        last.hl = o.found;
        if (o.lab) last.lab = o.lab;
      } else if (k !== last.v && o.parentHl) {
        last.hl = o.parentHl;
        if (o.parentLab) last.lab = o.parentLab;
      }
    }
    return Lab.tree(c);
  }

  /* копия с найденной вершиной (удаляемая — warn) и подсвеченным путём */
  function stageFound(root, x) {
    var c = copy(root), p = c;
    while (p) {
      p.edge = 'hl';
      if (x === p.v) { p.hl = 'warn'; p.lab = 'удаляем'; break; }
      p = x < p.v ? p.l : p.r;
    }
    return Lab.tree(c);
  }

  /* удаление на копии: {tree, caseName, rKey, sKey, sIsQ, movedKey} */
  function removeApply(root, x) {
    var c = copy(root), par = null, isLeft = false, cur = c;
    while (cur) {
      if (x < cur.v) { par = cur; isLeft = true; cur = cur.l; }
      else if (x > cur.v) { par = cur; isLeft = false; cur = cur.r; }
      else break;
    }
    var res = { tree: c, caseName: '', rKey: null, sKey: null, sIsQ: false, movedKey: null };
    if (!cur) return res;
    var q = cur;
    function put(repl) {
      if (!par) res.tree = repl;
      else if (isLeft) par.l = repl;
      else par.r = repl;
    }
    if (!q.l && !q.r) {
      res.caseName = 'leaf';
      put(null);
    } else if (!q.l) {
      res.caseName = 'noleft';
      res.movedKey = q.r.v;
      put(q.r);
    } else if (!q.r) {
      res.caseName = 'noright';
      res.movedKey = q.l.v;
      put(q.l);
    } else {
      res.caseName = 'two';
      var r = q.l, s = q;
      while (r.r) { s = r; r = r.r; }
      res.rKey = r.v;
      res.sKey = s.v;
      res.sIsQ = (s === q);
      if (s !== q) { s.r = r.l; r.l = q.l; }
      r.r = q.r;
      put(r);
    }
    return res;
  }

  /* ═══════════════════ 08: СДП + ИСДП ═══════════════════ */

  G.sdpBuild = function (data) {
    var keys = (data || []).slice(0, 16);
    var steps = [];
    var root = null;
    var comps = 0;

    steps.push({
      title: 'Пустое дерево',
      text: 'Вставим ключи по одному: <b>' + keys.map(esc).join(' ') + '</b>. ' +
        'Правило: меньше текущего ключа — влево, больше — вправо; равные ключи не добавляются.',
      tags: ['sig'],
      stage: Lab.tree(null),
      cap: 'n = 0, дерева ещё нет'
    });

    if (!keys.length) {
      steps.push({
        title: 'Нужны ключи',
        text: 'Введите хотя бы один ключ — например, <code>50 30 70 20 40 60 80 25</code>.',
        tags: ['sig'],
        stage: Lab.tree(null),
        cap: 'пусто'
      });
      return steps;
    }

    keys.forEach(function (k, i) {
      if (!root) {
        root = { v: k, l: null, r: null };
        steps.push({
          title: 'Корень: ' + k,
          text: 'Дерево пустое — ключ <b>' + esc(k) + '</b> становится корнем.',
          tags: ['ins'],
          stage: decorate(root, k, { hl: 'ok', edge: 'hl', lab: 'корень' }),
          cap: 'вставлен 1 ключ из ' + keys.length
        });
        return;
      }

      var pi = pathInfo(root, k);
      comps += pi.comps;

      if (pi.found) {
        steps.push({
          title: 'Ключ ' + k + ' уже есть',
          text: 'Сравнения: ' + pi.parts.join('; ') + '. Ключ найден — <b>вершина не добавляется</b>: ' +
            'данные с ключом ' + k + ' уже есть в дереве.',
          tags: ['loop', 'ins'],
          stage: stagePath(root, k, { found: 'warn', lab: 'уже есть' }),
          cap: 'вставки нет'
        });
        return;
      }

      var tags = ['loop'];
      if (pi.goL) tags.push('left');
      if (pi.goR) tags.push('right');
      steps.push({
        title: 'Ищем место для ' + k,
        text: 'Сравнения: ' + pi.parts.join('; ') + '. Дальше вершины нет — вставляем ' +
          (pi.dir === 'l' ? 'слева' : 'права') + ' от <b>' + esc(pi.parent.v) + '</b>. Сравнений: ' + pi.comps + '.',
        tags: tags,
        stage: stagePath(root, k, { parentHl: 'root', parentLab: 'сюда' }),
        cap: 'путь длиной ' + pi.nodes.length + ' вершин'
      });

      root = insert(root, k);
      steps.push({
        title: 'Вставлен ключ ' + k,
        text: 'Новая вершина <b>' + esc(k) + '</b> показана зелёным, к ней ведёт выделенное ребро. ' +
          'Теперь в дереве ' + size(root) + ' вершин, высота ' + height(root) + '.',
        tags: ['ins'],
        stage: decorate(root, k, { hl: 'ok', edge: 'hl', lab: 'вставлен' }),
        cap: 'вставлено ' + (i + 1) + ' из ' + keys.length
      });
    });

    /* ── ИСДП из отсортированной копии ── */
    var sorted = keys.slice().sort(function (a, b) { return a - b; });
    var m0 = Math.floor(sorted.length / 2);
    var isdpRoot = (function isdp(L, R) {
      if (L > R) return null;
      var m = Math.floor((L + R + 1) / 2);
      return { v: sorted[m], l: isdp(L, m - 1), r: isdp(m + 1, R) };
    })(0, sorted.length - 1);

    steps.push({
      title: 'ИСДП: корень — средний элемент',
      text: 'Сортируем те же ключи: <b>' + sorted.map(esc).join(' ') + '</b>. ' +
        'Для отрезка [0, ' + (sorted.length - 1) + '] <code>m = (L+R+1) div 2 = ' + m0 + '</code> → корень <b>' +
        sorted[m0] + '</b>, левее [0, ' + (m0 - 1) + '], правее [' + (m0 + 1) + ', ' + (sorted.length - 1) +
        ']. После сортировки ИСДП строится за O(n) и имеет минимально возможную высоту.',
      tags: ['isdp'],
      stage: Lab.cells(sorted, { done: Lab.range(0, sorted.length - 1) }),
      cap: 'отсортированный массив B'
    });

    steps.push({
      title: 'СДП и ИСДП рядом',
      text: 'Один и тот же набор ключей: слева — дерево из вставок по одному (порядок важен), ' +
        'справа — ИСДП из отсортированного массива. Под цифрами — уровни вершин (корень — уровень 1).',
      tags: ['isdp'],
      stage: Lab.pair(depthLab(root), depthLab(isdpRoot), 'СДП — вставка по одному', 'ИСДП — из отсортированного массива'),
      cap: 'формы различаются, набор ключей один'
    });

    /* ── обходы ── */
    var inSdp = inorder(root, []);
    var inIsdp = inorder(isdpRoot, []);
    steps.push({
      title: 'Обход слева направо',
      text: 'Обход выдаёт ключи по возрастанию — свойство дерева поиска. ' +
        'СДП: <b>' + inSdp.map(esc).join(' ') + '</b>. ИСДП: <b>' + inIsdp.map(esc).join(' ') + '</b>. ' +
        'Последовательности совпадают — ни один ключ не потерян.',
      tags: ['trav'],
      stage: Lab.rows([
        { label: 'СДП', vals: inSdp, done: Lab.range(0, inSdp.length - 1) },
        { label: 'ИСДП', vals: inIsdp, done: Lab.range(0, inIsdp.length - 1) }
      ]),
      cap: 'обе последовательности отсортированы'
    });

    /* ── характеристики ── */
    steps.push({
      title: 'Характеристики',
      text: 'Размер и контрольная сумма совпадают (одинаковый набор ключей). ' +
        'Высота: СДП — <b>' + height(root) + '</b>, ИСДП — <b>' + height(isdpRoot) + '</b>; ' +
        'средняя высота: СДП — <b>' + avgH(root).toFixed(2) + '</b>, ИСДП — <b>' + avgH(isdpRoot).toFixed(2) +
        '</b>. Всего сравнений при вставке ' + keys.length + ' ключей: <b>' + comps + '</b>. ' +
        'Средняя высота СДП всегда не меньше средней высоты ИСДП.',
      tags: ['stat'],
      stage: Lab.rows([
        { label: 'СДП', vals: [size(root), sumK(root), height(root), avgH(root).toFixed(2)], done: Lab.range(0, 3) },
        { label: 'ИСДП', vals: [size(isdpRoot), sumK(isdpRoot), height(isdpRoot), avgH(isdpRoot).toFixed(2)], done: Lab.range(0, 3) }
      ]),
      cap: 'Size | Sum | Height | AvgHeight'
    });

    return steps;
  };

  /* ═══════════════════ 09: удаление из СДП ═══════════════════ */

  G.sdpDelete = function (ctx) {
    ctx = ctx || {};
    var keys = (ctx.keys || []).slice(0, 16);
    var dels = (ctx.del || []).slice(0, 12);
    var steps = [];
    var root = build(keys);

    steps.push({
      title: 'Исходное дерево',
      text: 'Дерево построено вставкой ключей: <b>' + keys.map(esc).join(' ') + '</b>. ' +
        'Удаляем ключи по одному; после каждого удаления программа печатает обход слева направо.',
      tags: ['sig'],
      stage: Lab.tree(root),
      cap: 'n = ' + size(root)
    });

    if (!dels.length) {
      steps.push({
        title: 'Нет ключей для удаления',
        text: 'Укажите ключи в поле «Удалять» — например, <code>20 25 80 70 50 999</code>.',
        tags: ['sig'],
        stage: Lab.tree(root),
        cap: 'удалять нечего'
      });
      return steps;
    }

    dels.forEach(function (x) {
      /* ── поиск вершины (DeleteSDP: if (Data < X) вправо, else if (Data > X) влево) ── */
      var p = root, parts = [], comps = 0, found = false, goL = false, goR = false;
      while (p) {
        if (p.v < x) { comps += 1; parts.push(esc(p.v) + ' &lt; ' + esc(x) + ' → вправо'); goR = true; p = p.r; }
        else if (p.v > x) { comps += 2; parts.push(esc(p.v) + ' &gt; ' + esc(x) + ' → влево'); goL = true; p = p.l; }
        else { comps += 2; parts.push(esc(p.v) + ' = ' + esc(x) + ' → найден'); found = true; break; }
      }

      var ftags = ['find'];
      if (goL) ftags.push('goleft');
      if (goR) ftags.push('goright');

      if (!found) {
        steps.push({
          title: 'Ключа ' + x + ' в дереве нет',
          text: 'Сравнения: ' + parts.join('; ') + '. Указатель остался NIL — <code>return 0</code>, ' +
            'дерево не изменилось, программа печатает «Вершины ' + x + ' нет в дереве». Сравнений: ' + comps + '.',
          tags: ftags.concat(['none']),
          stage: Lab.tree(root),
          cap: 'вершины нет'
        });
        return;
      }

      steps.push({
        title: 'Найдена вершина ' + x,
        text: 'Сравнения: ' + parts.join('; ') + '. Найденная вершина <b>' + x + '</b> выделена (q). Сравнений: ' + comps + '.',
        tags: ftags.concat(['found']),
        stage: stageFound(root, x),
        cap: 'q = ' + x
      });

      var res = removeApply(root, x);

      if (res.caseName !== 'two') {
        /* ── случай: нет одного из поддеревьев ── */
        var ctag = res.caseName === 'noright' ? 'noright' : 'noleft';
        var st = copy(res.tree);
        if (res.movedKey != null) {
          var mv = find(st, res.movedKey);
          if (mv) { mv.edge = 'hl'; mv.lab = 'заняла место'; }
        }
        var body;
        if (res.caseName === 'leaf') {
          body = 'Поддеревьев нет: выполняется ветка <code>IF (q→Left = NIL) *p := q→Right</code> ' +
            '(правое поддерево тоже NIL) — вершина просто отсоединяется, затем <code>dispose(q)</code>.';
        } else if (res.caseName === 'noleft') {
          body = 'Левого потомка нет: <code>*p := q→Right</code> — правое поддерево (вершина <b>' +
            res.movedKey + '</b>) занимает место удаляемой, затем <code>dispose(q)</code>.';
        } else {
          body = 'Правого потомка нет: <code>*p := q→Left</code> — левое поддерево (вершина <b>' +
            res.movedKey + '</b>) занимает место удаляемой, затем <code>dispose(q)</code>.';
        }
        steps.push({
          title: res.caseName === 'leaf' ? 'Удаляем лист ' + x : 'Один потомок: ' + x,
          text: body,
          tags: [ctag],
          stage: Lab.tree(st),
          cap: 'n = ' + size(res.tree)
        });
      } else {
        /* ── случай: два потомка ── */
        var st1 = copy(root);
        var qn = find(st1, x);
        if (qn) {
          qn.hl = 'warn';
          qn.lab = 'удаляем';
          var sp = qn.l;
          while (sp) {
            sp.edge = 'hl';
            if (!sp.r) break;
            sp = sp.r;
          }
          if (sp) { sp.hl = 'ok'; sp.lab = 'вместо ' + x; }
        }
        steps.push({
          title: 'Предшественник r = ' + res.rKey,
          text: 'Два потомка — нужна замена. Идём по правым ссылкам левого поддерева: ' +
            '<code>r := q→Left, DO (r→Right ≠ NIL) s := r, r := r→Right OD</code>. ' +
            'Получено <b>r = ' + res.rKey + '</b>' + (res.sIsQ
              ? ', при этом <b>s = q</b> — r оказался непосредственным левым потомком, цикл не выполнялся'
              : ', <b>s = ' + res.sKey + '</b> — родитель r') +
            '. Выделен путь к r, удаляемая вершина — жёлтым.',
          tags: ['two', 'pred'],
          stage: Lab.tree(st1),
          cap: 'r = ' + res.rKey + ', s = ' + res.sKey
        });

        var st2 = copy(res.tree);
        var rn = find(st2, res.rKey);
        if (rn) { rn.hl = 'ok'; rn.edge = 'hl'; rn.lab = 'вместо ' + x; }
        var body2 = res.sIsQ
          ? 'r — непосредственный левый потомок q, поэтому шаги 1) <code>s→Right := r→Left</code> и ' +
            '2) <code>r→Left := q→Left</code> пропускаются: иначе получилось бы r→Left = r — цикл. ' +
            'Выполняются 3) <code>r→Right := q→Right</code> и 4) <code>*p := r</code>, затем <code>dispose(q)</code>.'
          : 'Выполняются все четыре шага: 1) <code>s→Right := r→Left</code>, 2) <code>r→Left := q→Left</code>, ' +
            '3) <code>r→Right := q→Right</code>, 4) <code>*p := r</code>; затем <code>dispose(q)</code>. ' +
            'Вершина r (выделена) заняла место удаляемой.';
        steps.push({
          title: x + ' заменена на ' + res.rKey,
          text: body2,
          tags: res.sIsQ ? ['two', 'join'] : ['two', 'cut', 'join'],
          stage: Lab.tree(st2),
          cap: 'r заняла место q'
        });
      }

      /* ── обход после удаления ── */
      var seq = inorder(res.tree, []);
      steps.push({
        title: 'Обход после удаления ' + x,
        text: 'Обход слева направо: <b>' + (seq.length ? seq.map(esc).join(' ') : 'дерево пустое') + '</b>. ' +
          'Порядок ключей остался возрастающим, размер = ' + size(res.tree) + '.',
        tags: ['gone'],
        stage: Lab.tree(res.tree),
        cap: 'n = ' + size(res.tree)
      });

      root = res.tree;
    });

    return steps;
  };

  /* ═══════════════════ 10: A1, A2 и ДОП ═══════════════════ */

  function wsum(items, L, R) {
    var s = 0;
    for (var i = L; i <= R; i++) s += items[i].w;
    return s;
  }

  /* выбор корня в A2 (ровно как в a1_a2.cpp: целочисленное wes/2) */
  function a2Pick(items, L, R) {
    var wes = wsum(items, L, R);
    var half = Math.floor(wes / 2);
    var sum = 0, idx = L, ok = false;
    for (; idx <= R; idx++) {
      if (sum < half && sum + items[idx].w >= half) { ok = true; break; }
      sum += items[idx].w;
    }
    if (idx > R) { idx = R; ok = false; }
    return { idx: idx, wes: wes, half: half, sum: sum, ok: ok };
  }

  /* матрица корней AR ДОП — точно как ComputeAW / ComputeAP_AR / CreateTree */
  function buildDOP(items) {
    var n = items.length, AW = [], AP = [], AR = [], i, j, h;
    for (i = 0; i < n; i++) { AW[i] = []; AP[i] = []; AR[i] = []; }
    for (i = 0; i < n; i++) {
      AW[i][i] = items[i].w;
      for (j = i + 1; j < n; j++) AW[i][j] = AW[i][j - 1] + items[j].w;
    }
    for (i = 0; i < n; i++) { AR[i][i] = i; AP[i][i] = items[i].w; }
    for (h = 2; h <= n; h++) {
      for (i = 0; i <= n - h; i++) {
        j = i + h - 1;
        var sk = AR[i][j - 1];
        var ek = (i + 1 <= j) ? AR[i + 1][j] : j;
        if (sk > ek) { var t = sk; sk = ek; ek = t; }
        var minc = Infinity, best = sk;
        for (var k = sk; k <= ek; k++) {
          var lc = (k > i) ? AP[i][k - 1] : 0;
          var rc = (k < j) ? AP[k + 1][j] : 0;
          var cur = lc + rc;
          if (cur < minc) { minc = cur; best = k; }
        }
        AP[i][j] = minc + AW[i][j];
        AR[i][j] = best;
      }
    }
    return { AW: AW, AP: AP, AR: AR };
  }

  /* порядок вставки CreateTree: корень интервала, затем лево и право */
  function dopOrder(AR, L, R, out) {
    if (L > R) return;
    var k = AR[L][R];
    out.push({ idx: k, L: L, R: R });
    dopOrder(AR, L, k - 1, out);
    dopOrder(AR, k + 1, R, out);
  }

  function totalW(items) { return wsum(items, 0, items.length - 1); }

  function sumWDepth(n, d, wm) {
    if (!n) return 0;
    return d * (wm[n.v] || 0) + sumWDepth(n.l, d + 1, wm) + sumWDepth(n.r, d + 1, wm);
  }

  function sumW(n, wm) {
    if (!n) return 0;
    return (wm[n.v] || 0) + sumW(n.l, wm) + sumW(n.r, wm);
  }

  /* средневзвешенная глубина: Σ(вес × уровень) / Σ вес, корень на уровне 1 */
  function avgWD(n, wm) {
    var t = sumW(n, wm);
    return t ? sumWDepth(n, 1, wm) / t : 0;
  }

  /* таблица матрицы AR: в ячейке [i][j] — ключ корня интервала */
  function arTable(AR, items) {
    var n = items.length, h = '', i, j;
    h += '<table style="border-collapse:collapse;font:600 12px var(--mono,monospace);margin:0 auto">';
    h += '<tr><td style="padding:4px 9px;color:var(--mut)">i\\j</td>';
    for (j = 0; j < n; j++) {
      h += '<td style="padding:4px 9px;text-align:center;color:var(--mut)">' + j + '</td>';
    }
    h += '</tr>';
    for (i = 0; i < n; i++) {
      h += '<tr><td style="padding:4px 9px;text-align:center;color:var(--mut)">' + i + '</td>';
      for (j = 0; j < n; j++) {
        h += j < i
          ? '<td style="padding:4px 9px"></td>'
          : '<td style="padding:4px 9px;text-align:center;border:1px solid var(--bd);border-radius:6px">' +
            items[AR[i][j]].v + '</td>';
      }
      h += '</tr>';
    }
    return h + '</table>';
  }

  G.a1a2 = function (data) {
    var raw = (data || []).slice(0, 16);
    var steps = [];

    /* дубликаты ключей пропускаем — как AddRec (D = p→data не добавляет) */
    var seen = {}, items = [];
    raw.forEach(function (it) {
      if (it && !seen[it.v]) { seen[it.v] = 1; items.push(it); }
    });
    var n = items.length;

    if (n < 2) {
      steps.push({
        title: 'Нужны пары «ключ:вес»',
        text: 'Введите минимум две пары через пробел — например, <code>50:8 30:6 70:4 20:20 40:15 60:12 80:10</code>.',
        tags: ['sig'],
        stage: Lab.tree(null),
        cap: 'мало данных'
      });
      steps.push({
        title: 'Формат ввода',
        text: 'Каждый ключ — свой вес (частота поиска): <code>ключ:вес</code>. Вес определяет, насколько высоко окажется ключ.',
        tags: ['sig'],
        stage: Lab.tree(null),
        cap: 'пример выше'
      });
      return steps;
    }

    var wm = {};
    items.forEach(function (it) { wm[it.v] = it.w; });
    var W = totalW(items);

    steps.push({
      title: 'Ключи и веса',
      text: 'n = ' + n + ', Σw = ' + W + '. Средневзвешенная глубина = Σ(вес × уровень) / Σw, ' +
        'корень дерева находится на уровне 1. Строим три дерева на одних и тех же данных: A1, A2 и точный ДОП.',
      tags: ['sig'],
      stage: Lab.rows([
        { label: 'ключ', vals: items.map(function (it) { return it.v; }), idx: true },
        { label: 'вес', vals: items.map(function (it) { return it.w; }) }
      ]),
      cap: 'n = ' + n + ', Σw = ' + W
    });

    /* ── A1: сортировка по убыванию веса + вставка в СДП ── */
    var a1 = items.slice().sort(function (a, b) { return b.w - a.w || a.v - b.v; });
    steps.push({
      title: 'A1: порядок по убыванию веса',
      text: 'Сортируем пары по убыванию веса и вставляем по одной в СДП: <b>' +
        a1.map(function (it) { return it.v + '(' + it.w + ')'; }).join(' → ') +
        '</b>. Самый тяжёлый ключ <b>' + a1[0].v + '</b> станет корнем — но порядок остальных может дерево «завалить».',
      tags: ['a1pick'],
      stage: Lab.rows([
        { label: 'A1', vals: a1.map(function (it) { return it.v; }), done: Lab.range(0, n - 1) },
        { label: 'вес', vals: a1.map(function (it) { return it.w; }), done: Lab.range(0, n - 1) }
      ]),
      cap: 'порядок вставки A1'
    });

    var t1 = null;
    a1.forEach(function (it, i) {
      var pi = pathInfo(t1, it.v);
      t1 = insert(t1, it.v);
      steps.push({
        title: 'A1: вставка ' + it.v,
        text: (pi.parts.length
          ? 'Сравнения: ' + pi.parts.join('; ') + '. '
          : 'Дерево пустое — ключ становится корнем. ') +
          'Вставили ключ <b>' + it.v + '</b> с весом ' + it.w + ' (сравнений: ' + pi.comps + ').',
        tags: ['a1ins'],
        stage: decorate(t1, it.v, { hl: 'ok', edge: 'hl', lab: 'w=' + it.w }),
        cap: 'A1: ' + (i + 1) + ' из ' + n
      });
    });

    /* ── A2: сортировка по ключу + выбор корня по весу ── */
    var a2 = items.slice().sort(function (a, b) { return a.v - b.v; });
    var pk0 = a2Pick(a2, 0, n - 1);
    steps.push({
      title: 'A2: порог первого интервала',
      text: 'Сортируем по ключу: <b>' + a2.map(function (it) { return it.v; }).join(' ') + '</b>. ' +
        'Сумма весов wes = ' + pk0.wes + ', порог = wes div 2 = <b>' + pk0.half + '</b>. ' +
        'Накопленный вес доходит до порога на ключе <b>' + a2[pk0.idx].v + '</b> — он станет корнем; ' +
        'затем то же слева и справа.',
      tags: ['a2', 'a2thr'],
      stage: Lab.rows([
        { label: 'ключ', vals: a2.map(function (it) { return it.v; }), hl: [pk0.idx] },
        { label: 'вес', vals: a2.map(function (it) { return it.w; }), hl: [pk0.idx] }
      ]),
      cap: 'wes = ' + pk0.wes + ', порог = ' + pk0.half
    });

    var t2 = null;
    (function a2rec(L, R) {
      if (L > R) return;
      var pk = a2Pick(a2, L, R);
      var it = a2[pk.idx];
      t2 = insert(t2, it.v);
      steps.push({
        title: 'A2: корень ' + it.v,
        text: 'Интервал [' + L + ', ' + R + '] = ' + a2.slice(L, R + 1).map(function (x) { return x.v; }).join(' ') +
          ': wes = ' + pk.wes + ', порог = ' + pk.half + ', накопленный вес перед ключом = ' + pk.sum +
          (pk.ok
            ? ' — пересечение порога на ключе <b>' + it.v + '</b>.'
            : ' — условие не сработало, берём idx = R → <b>' + it.v + '</b>.') +
          ' Вставляем его в СДП.',
        tags: ['a2rec'],
        stage: decorate(t2, it.v, { hl: 'ok', edge: 'hl', lab: 'w=' + it.w }),
        cap: 'A2: интервал [' + L + ', ' + R + ']'
      });
      a2rec(L, pk.idx - 1);
      a2rec(pk.idx + 1, R);
    })(0, n - 1);

    /* ── ДОП: матрица корней AR и вставка в порядке CreateTree ── */
    var dop = buildDOP(a2);
    steps.push({
      title: 'ДОП: матрица корней AR',
      text: 'Для каждого интервала [i, j] перебираем корни <code>k ⊂ (AR[i][j−1] … AR[i+1][j])</code> и берём минимум ' +
        '<code>AP[i][j] = min + AW[i][j]</code>; <code>AR[i][j]</code> запоминает argmin. ' +
        'В таблице — ключ корня интервала [i, j]. Корень всего дерева — <code>AR[0][n−1]</code> = <b>' +
        a2[dop.AR[0][n - 1]].v + '</b>.',
      tags: ['dopdp'],
      stage: arTable(dop.AR, a2),
      cap: 'AR[i][j] — ключ корня интервала [i, j]'
    });

    var t3 = null;
    var order = [];
    dopOrder(dop.AR, 0, n - 1, order);
    order.forEach(function (o, i) {
      var it = a2[o.idx];
      var pi = pathInfo(t3, it.v);
      t3 = insert(t3, it.v);
      steps.push({
        title: 'ДОП: вставка ' + it.v,
        text: 'Интервал [' + o.L + ', ' + o.R + '] = ' + a2.slice(o.L, o.R + 1).map(function (x) { return x.v; }).join(' ') +
          ', <code>AR[L][R]</code> → ключ <b>' + it.v + '</b> (вес ' + it.w + '). ' +
          (pi.parts.length ? 'Путь вставки: ' + pi.parts.join('; ') + '. ' : '') +
          'Корень интервала вставляется первым — так работает CreateTree.',
        tags: ['dopbuild'],
        stage: decorate(t3, it.v, { hl: 'ok', edge: 'hl', lab: 'w=' + it.w }),
        cap: 'ДОП: ' + (i + 1) + ' из ' + n
      });
    });

    /* ── сравнение ── */
    steps.push({
      title: 'A1 и A2 рядом',
      text: 'A1 держит тяжёлые ключи близко к корню, но не балансирует дерево; A2 делит интервалы по весу ' +
        'и получает более ровную форму. Под цифрами — уровни вершин.',
      tags: ['stat'],
      stage: Lab.pair(depthLab(t1), depthLab(t2), 'A1 — сначала тяжёлые', 'A2 — центр тяжести'),
      cap: 'A1: h = ' + height(t1) + ', A2: h = ' + height(t2)
    });

    steps.push({
      title: 'A2 и точный ДОП рядом',
      text: 'ДОП перебором корней минимизирует Σ(вес × уровень): его средневзвешенная глубина не больше, ' +
        'чем у любой эвристики. Под цифрами — уровни вершин.',
      tags: ['stat'],
      stage: Lab.pair(depthLab(t2), depthLab(t3), 'A2 — приближение', 'ДОП — точный'),
      cap: 'A2: h = ' + height(t2) + ', ДОП: h = ' + height(t3)
    });

    var avg1 = avgWD(t1, wm), avg2 = avgWD(t2, wm), avg3 = avgWD(t3, wm);
    var s1 = inorder(t1, []).join(' ');
    steps.push({
      title: 'Характеристики',
      text: 'Size и Sum у всех трёх одинаковы (n = ' + n + ', Sum = ' + sumK(t3) + ') — набор ключей не менялся. ' +
        'Средневзвешенная глубина: A1 — <b>' + avg1.toFixed(5) + '</b>, A2 — <b>' + avg2.toFixed(5) +
        '</b>, ДОП — <b>' + avg3.toFixed(5) + '</b>: у ДОП она минимальна. ' +
        'Обход A1 слева направо: <b>' + s1 + '</b> — ключи по возрастанию.',
      tags: ['stat'],
      stage: Lab.rows([
        { label: 'A1', vals: [size(t1), sumK(t1), height(t1), avg1.toFixed(5)], done: Lab.range(0, 3) },
        { label: 'A2', vals: [size(t2), sumK(t2), height(t2), avg2.toFixed(5)], done: Lab.range(0, 3) },
        { label: 'ДОП', vals: [size(t3), sumK(t3), height(t3), avg3.toFixed(5)], done: Lab.range(0, 3) }
      ]),
      cap: 'Size | Sum | Height | AvWeigh Height'
    });

    return steps;
  };

})();
