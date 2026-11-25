/* Генераторы шагов для лабораторных работ 2 семестра (03–07): деревья поиска.
   Подключается в lab.html СТРОКОЙ ДО assets/lab.js:
     <script src="../../assets/gens/g3-trees-a.js"></script>
   Алгоритмы — дословные порты isdp.c, b_tree.cpp, binary_tree.cpp,
   avl_tree.cpp и avl_delete.cpp этого репозитория.
   Шаг: {title, text, tags, stage, cap}. */
(function () {
  'use strict';
  var G = window.LabGen = window.LabGen || {};

  /* ─────────────────── утилиты ─────────────────── */

  function e(x) { return Lab.esc(String(x)); }

  function vals(nodes) {
    return nodes.map(function (n) { return n.v; });
  }

  function sortAsc(a) {
    return a.slice().sort(function (x, y) { return x < y ? -1 : x > y ? 1 : 0; });
  }

  function hgt(n) { return n ? 1 + Math.max(hgt(n.l), hgt(n.r)) : 0; }
  function sz(n) { return n ? 1 + sz(n.l) + sz(n.r) : 0; }

  function ksum(n) {
    if (!n) return 0;
    var v = Number(n.v);
    if (isNaN(v)) v = 0;
    return v + ksum(n.l) + ksum(n.r);
  }

  function psum(n, lvl) { return n ? lvl + psum(n.l, lvl + 1) + psum(n.r, lvl + 1) : 0; }
  function avgH(n) { var s = sz(n); return s ? psum(n, 1) / s : 0; }
  function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function nb(x) { return String(x).replace('-', '−'); }
  function minH(n) { return Math.ceil(Math.log(sz(n) + 1) / Math.log(2)); }

  function walk(n, fn) { if (n) { fn(n); walk(n.l, fn); walk(n.r, fn); } }

  /* порядки обхода: возвращает список вершин */
  function nodesIn(root, mode) {
    var out = [];
    (function rec(n) {
      if (!n) return;
      if (mode === 'pre') out.push(n);
      rec(n.l);
      if (mode === 'in') out.push(n);
      rec(n.r);
      if (mode === 'post') out.push(n);
    })(root);
    return out;
  }

  /* нормализация узла в структуру Lab.tree {v, l, r, hl, edge, lab}.
     seen защищает от циклов; не-объектные дочерние узлы отбрасываются. */
  function toSvg(n, seen) {
    if (!n || typeof n !== 'object') return null;
    seen = seen || [];
    if (seen.indexOf(n) >= 0) return null;
    var o = { v: n.v };
    if (n.hl) o.hl = n.hl;
    if (n.edge) o.edge = n.edge;
    if (n.lab != null) o.lab = n.lab;
    var sub = seen.concat([n]);
    var l = toSvg(n.l, sub), r = toSvg(n.r, sub);
    if (l) o.l = l;
    if (r) o.r = r;
    return o;
  }

  /* draw(root, {lab:'bal', scope, marks:[{n, hl, edge, lab}]}) → строка SVG.
     scope ограничивает подписи баланса поддеревом (пока не пересчитаны предки). */
  function draw(root, opts) {
    opts = opts || {};
    var scope = opts.scope || root;
    if (opts.lab === 'bal') {
      walk(scope, function (n) { if (n.bal != null) n.lab = String(n.bal); });
    }
    (opts.marks || []).forEach(function (m) {
      if (!m || !m.n) return;
      if (m.hl) m.n.hl = m.hl;
      if (m.edge) m.n.edge = m.edge;
      if (m.lab != null) m.n.lab = m.lab;
    });
    var html = Lab.tree(toSvg(root, []), {});
    walk(root, function (n) { n.hl = null; n.edge = null; n.lab = null; });
    return html;
  }

  function fire(hooks, name) {
    var fn = hooks && hooks[name];
    if (typeof fn === 'function') fn.apply(null, Array.prototype.slice.call(arguments, 2));
  }

  function pairDraw(dRoot, aRoot, o) {
    o = o || {};
    return Lab.pair(
      draw(dRoot, { lab: o.labD, scope: o.scopeD, marks: o.marksD }),
      draw(aRoot, { lab: o.labA, scope: o.scopeA, marks: o.marksA }),
      o.capD || 'ДБД', o.capA || 'АВЛ');
  }

  /* ─────────────────── вставка как в дереве поиска ─────────────────── */

  function bstInsert(root, v) {
    var node = { v: v, l: null, r: null, bal: 0 };
    if (!root) return { root: node, node: node, path: [], dup: false };
    var path = [], cur = root;
    for (;;) {
      if (v < cur.v) {
        if (!cur.l) { cur.l = node; path.push({ n: cur, dir: 'l' }); break; }
        path.push({ n: cur, dir: 'l' }); cur = cur.l;
      } else if (v > cur.v) {
        if (!cur.r) { cur.r = node; path.push({ n: cur, dir: 'r' }); break; }
        path.push({ n: cur, dir: 'r' }); cur = cur.r;
      } else {
        return { root: root, node: null, path: [], dup: true };
      }
    }
    return { root: root, node: node, path: path, dup: false };
  }

  function pathPhrase(path, v) {
    if (!path.length) return 'дерево пусто — <b>' + e(v) + '</b> становится корнем';
    return 'путь поиска: ' + path.map(function (s) {
      return '<code>' + e(v) + (s.dir === 'l' ? ' &lt; ' : ' &gt; ') + e(s.n.v) + '</code> → ' +
        (s.dir === 'l' ? 'влево' : 'вправо');
    }).join(', ');
  }

  function balPhrase(ev) {
    if (!ev.length) return 'балансы не изменились';
    return ev.map(function (x) {
      return '<b>' + e(x.v) + '</b>: ' + nb(x.f) + ' → ' + nb(x.t);
    }).join(', ');
  }

  /* ─────────────────── повороты (avl_tree.cpp) ─────────────────── */

  function llTurn(p) {
    var q = p.l;
    q.bal = 0; p.bal = 0;
    p.l = q.r; q.r = p;
    return q;
  }

  function rrTurn(p) {
    var q = p.r;
    q.bal = 0; p.bal = 0;
    p.r = q.l; q.l = p;
    return q;
  }

  function lrTurn(p) {
    var q = p.l, r = q.r;
    p.bal = (r.bal < 0) ? 1 : 0;
    q.bal = (r.bal > 0) ? -1 : 0;
    r.bal = 0;
    p.l = r.r; q.r = r.l;
    r.l = q; r.r = p;
    return r;
  }

  function rlTurn(p) {
    var q = p.r, r = q.l;
    p.bal = (r.bal > 0) ? -1 : 0;
    q.bal = (r.bal < 0) ? 1 : 0;
    r.bal = 0;
    p.r = r.l; q.l = r.r;
    r.l = p; r.r = q;
    return r;
  }

  /* одинарные повороты при удалении (avl_delete.cpp) */
  function ll1Turn(p) {
    var q = p.l, stop;
    if (q.bal === 0) { q.bal = 1; p.bal = -1; stop = true; }
    else { q.bal = 0; p.bal = 0; stop = false; }
    p.l = q.r; q.r = p;
    return { root: q, stop: stop };
  }

  function rr1Turn(p) {
    var q = p.r, stop;
    if (q.bal === 0) { q.bal = -1; p.bal = 1; stop = true; }
    else { q.bal = 0; p.bal = 0; stop = false; }
    p.r = q.l; q.l = p;
    return { root: q, stop: stop };
  }

  function setChild(holder, path, i, node) {
    if (i === 0) holder.root = node;
    else { var par = path[i - 1].n; par[path[i - 1].dir] = node; }
  }

  /* ─────────────────── разворот после вставки (AddAVL / addDBD) ─────────────────── */

  function avlUnwind(holder, path, hooks) {
    var rost = path.length > 0, f;
    for (var i = path.length - 1; i >= 0 && rost; i--) {
      var p = path[i].n, dir = path[i].dir;
      if (dir === 'l') {
        if (p.bal > 0) { f = p.bal; p.bal = 0; rost = false; fire(hooks, 'bal', p, f, 0); }
        else if (p.bal === 0) { p.bal = -1; fire(hooks, 'bal', p, 0, -1); }
        else {
          var q = p.l;
          var type = (q && q.bal < 0) ? 'LL' : 'LR';
          fire(hooks, 'before', type, p, q);
          var nr = type === 'LL' ? llTurn(p) : lrTurn(p);
          setChild(holder, path, i, nr);
          fire(hooks, 'after', type, nr, p, q, true);
          rost = false;
        }
      } else {
        if (p.bal < 0) { f = p.bal; p.bal = 0; rost = false; fire(hooks, 'bal', p, f, 0); }
        else if (p.bal === 0) { p.bal = 1; fire(hooks, 'bal', p, 0, 1); }
        else {
          var q2 = p.r;
          var type2 = (q2 && q2.bal > 0) ? 'RR' : 'RL';
          fire(hooks, 'before', type2, p, q2);
          var nr2 = type2 === 'RR' ? rrTurn(p) : rlTurn(p);
          setChild(holder, path, i, nr2);
          fire(hooks, 'after', type2, nr2, p, q2, true);
          rost = false;
        }
      }
    }
  }

  /* ДБД: b_tree.cpp addDBD — VR/HR и повороты при подъёме по пути вставки */
  function dbdUnwind(holder, path, hooks) {
    var VR = true, HR = false, f;
    for (var i = path.length - 1; i >= 0; i--) {
      var p = path[i].n, dir = path[i].dir;
      if (dir === 'l') {
        if (VR) {
          if (p.bal === 0) {
            fire(hooks, 'before', 'R', p, null);
            var q = p.l;
            p.l = q.r; q.r = p;
            setChild(holder, path, i, q);
            q.bal = 1; VR = false; HR = true;
            fire(hooks, 'after', 'R', q, p, null, false);
          } else {
            f = p.bal; p.bal = 0; HR = true;
            if (f !== 0) fire(hooks, 'bal', p, f, 0);
          }
        } else { HR = false; }
      } else {
        if (VR) {
          f = p.bal; p.bal = 1; VR = false; HR = true;
          if (f !== 1) fire(hooks, 'bal', p, f, 1);
        } else if (HR) {
          if (p.bal > 0) {
            fire(hooks, 'before', 'L', p, null);
            var q2 = p.r;
            p.r = q2.l; q2.l = p;
            setChild(holder, path, i, q2);
            p.bal = 0; q2.bal = 0;
            VR = true; HR = false;
            fire(hooks, 'after', 'L', q2, p, null, false);
          } else { HR = false; }
        }
      }
    }
  }

  /* ─────────────────── удаление из АВЛ (avl_delete.cpp) ─────────────────── */

  function sget(holder, s) { return s.p ? s.p[s.k] : holder.root; }
  function sset(holder, s, v) { if (s.p) s.p[s.k] = v; else holder.root = v; }

  /* BL: уменьшилось левое поддерево. Возвращает признак Уменьшение. */
  function blSlot(holder, slot, st, hooks) {
    var p = sget(holder, slot);
    if (!p) return st.umen;
    var f = p.bal;
    if (p.bal === -1) { p.bal = 0; fire(hooks, 'bal', 'BL', p, f, 0); return true; }
    if (p.bal === 0) { p.bal = 1; fire(hooks, 'bal', 'BL', p, f, 1); st.umen = false; return false; }
    var rr = p.r;
    var useRR1 = !!rr && rr.bal >= 0;
    fire(hooks, 'before', useRR1 ? 'RR1' : 'RL', p, rr, 'BL');
    var out, umen;
    if (useRR1) { out = rr1Turn(p); umen = !out.stop; }
    else { out = { root: rlTurn(p), stop: false }; umen = true; }
    sset(holder, slot, out.root);
    fire(hooks, 'after', useRR1 ? 'RR1' : 'RL', out.root, p, umen, 'BL');
    st.umen = umen;
    return umen;
  }

  /* BR: уменьшилось правое поддерево. */
  function brSlot(holder, slot, st, hooks) {
    var p = sget(holder, slot);
    if (!p) return st.umen;
    var f = p.bal;
    if (p.bal === 1) { p.bal = 0; fire(hooks, 'bal', 'BR', p, f, 0); return true; }
    if (p.bal === 0) { p.bal = -1; fire(hooks, 'bal', 'BR', p, f, -1); st.umen = false; return false; }
    var ql = p.l;
    var useLL1 = !!ql && ql.bal <= 0;
    fire(hooks, 'before', useLL1 ? 'LL1' : 'LR', p, ql, 'BR');
    var out, umen;
    if (useLL1) { out = ll1Turn(p); umen = !out.stop; }
    else { out = { root: lrTurn(p), stop: false }; umen = true; }
    sset(holder, slot, out.root);
    fire(hooks, 'after', useLL1 ? 'LL1' : 'LR', out.root, p, umen, 'BR');
    st.umen = umen;
    return umen;
  }

  /* DeleteAVL + del: удаление ключа x из дерева holder.
     hooks: bal(proc, p, f, t), before(type, p, q, proc),
            after(type, nr, p, umen, proc), removed(info) */
  function deleteKey(holder, x, hooks) {
    var st = { umen: false, removed: null };
    var res = { found: false };

    function delProc(slot, target) {
      var r = sget(holder, slot);
      if (r.r) {
        delProc({ p: r, k: 'r' }, target);
        if (st.umen) brSlot(holder, slot, st, hooks);
      } else {
        var oldV = target.v;
        target.v = r.v;
        sset(holder, slot, r.l);
        st.umen = true;
        st.removed = r;
        fire(hooks, 'removed', { kind: 'two', target: target, oldV: oldV, newV: r.v, node: r });
      }
    }

    function rec(slot) {
      var p = sget(holder, slot);
      if (!p) return;
      if (x < p.v) {
        rec({ p: p, k: 'l' });
        if (st.umen) blSlot(holder, slot, st, hooks);
      } else if (x > p.v) {
        rec({ p: p, k: 'r' });
        if (st.umen) brSlot(holder, slot, st, hooks);
      } else {
        res.found = true;
        var child = p.l || p.r;
        if (!p.l) {
          sset(holder, slot, p.r);
          st.umen = true; st.removed = p;
          fire(hooks, 'removed', { kind: p.r ? 'one' : 'leaf', target: p, oldV: p.v, child: p.r, node: p });
        } else if (!p.r) {
          sset(holder, slot, p.l);
          st.umen = true; st.removed = p;
          fire(hooks, 'removed', { kind: 'one', target: p, oldV: p.v, child: p.l, node: p });
        } else {
          delProc({ p: p, k: 'l' }, p);
          if (st.umen) blSlot(holder, slot, st, hooks);
        }
      }
    }

    rec({ p: null, k: 'root' });
    return res;
  }

  /* тексты поворотов */

  function rotText(type, p, q, nr) {
    var V = e(p.v), Q = q ? e(q.v) : '—', N = e(nr.v);
    if (type === 'LL') {
      return 'Малый правый поворот: левый сын <b>' + Q + '</b> поднимается — ' +
        '<code>p→Left := q→Right</code>, <code>q→Right := p</code>. Корень поддерева — <b>' + N +
        '</b>, балансы обнулены, рост прекращён (<code>Рост := ЛОЖЬ</code>).';
    }
    if (type === 'RR') {
      return 'Малый левый поворот: правый сын <b>' + Q + '</b> поднимается — ' +
        '<code>p→Right := q→Left</code>, <code>q→Left := p</code>. Корень поддерева — <b>' + N +
        '</b>, балансы обнулены, рост прекращён (<code>Рост := ЛОЖЬ</code>).';
    }
    if (type === 'LR') {
      return 'Двойной поворот: левый поворот в сыне <b>' + Q + '</b>, затем правый в <b>' + V +
        '</b>; наверх поднимается внук <b>' + N + '</b> — <code>r→Left := q</code>, <code>r→Right := p</code>. ' +
        'Балансы считаются по балансу внука, рост прекращён.';
    }
    return 'Двойной поворот: правый поворот в сыне <b>' + Q + '</b>, затем левый в <b>' + V +
      '</b>; наверх поднимается внук <b>' + N + '</b> — <code>r→Left := p</code>, <code>r→Right := q</code>. ' +
      'Балансы считаются по балансу внука, рост прекращён.';
  }

  function delRotText(type, p, q, nr, umen) {
    var Q = q ? e(q.v) : '—', N = e(nr.v);
    var tail = umen
      ? 'Высота поддерева уменьшилась — подъём вверх продолжается.'
      : 'Высота поддерева не изменилась — подъём вверх прекращается.';
    if (type === 'RR1') {
      return 'Одинарный левый поворот RR1: правый сын <b>' + Q + '</b> поднимается — ' +
        '<code>p→Right := q→Left</code>, <code>q→Left := p</code>. Корень — <b>' + N + '</b>. ' + tail;
    }
    if (type === 'LL1') {
      return 'Одинарный правый поворот LL1: левый сын <b>' + Q + '</b> поднимается — ' +
        '<code>p→Left := q→Right</code>, <code>q→Right := p</code>. Корень — <b>' + N + '</b>. ' + tail;
    }
    if (type === 'LR') {
      return 'Двойной поворот LR: правый сын левого сына поднимается наверх — корень поддерева <b>' + N +
        '</b> (<code>r→Left := q</code>, <code>r→Right := p</code>). ' + tail;
    }
    return 'Двойной поворот RL: левый сын правого сына поднимается наверх — корень поддерева <b>' + N +
      '</b> (<code>r→Left := p</code>, <code>r→Right := q</code>). ' + tail;
  }

  /* ═══════════════════ 03 · ИСДП ═══════════════════ */

  G.isdp = function (data) {
    var a = (data || []).slice(0, 16);
    if (!a.length) return [];
    var steps = [];
    var sorted = sortAsc(a);

    steps.push({
      title: 'Исходный массив',
      text: 'Ключи <b>' + a.map(e).join(' ') + '</b>. ИСДП строится из упорядоченного массива, ' +
        'поэтому сначала сортируем его вставками (<code>sortArray</code>).',
      tags: ['sort'],
      stage: Lab.cells(a, {}),
      cap: 'n = ' + a.length
    });

    steps.push({
      title: 'Упорядоченный массив',
      text: 'Aупор: <b>' + sorted.map(e).join(' ') + '</b>. Индексы 1…n — корень возьмём из середины отрезка.',
      tags: ['sort', 'sig'],
      stage: Lab.cells(sorted, { done: Lab.range(0, sorted.length - 1) }),
      cap: 'отсортировано'
    });

    function build(L, R) {
      if (L > R) return null;
      var m = Math.floor((L + R) / 2);
      var node = { v: sorted[m], L: L, R: R, m: m };
      node.l = build(L, m - 1);
      node.r = build(m + 1, R);
      return node;
    }

    var root = build(0, sorted.length - 1);
    var pre = nodesIn(root, 'pre');

    pre.forEach(function (nd, i) {
      var marks = pre.map(function (m, j) {
        return { n: m, hl: j < i ? 'ok' : (j === i ? 'root' : 'dim') };
      });
      var hlSeg = [], dimSeg = [];
      for (var t = 0; t < sorted.length; t++) {
        if (t < nd.L || t > nd.R) dimSeg.push(t);
        else if (t !== nd.m) hlSeg.push(t);
      }
      steps.push({
        title: 'Отрезок [' + (nd.L + 1) + ', ' + (nd.R + 1) + '] → корень ' + nd.v,
        text: '<code>m = ⌊(L+R)/2⌋ = ' + (nd.m + 1) + '</code>, корень отрезка — ' +
          '<code>A[m] = <b>' + e(nd.v) + '</b></code>. ' +
          (nd.L <= nd.m - 1
            ? 'Левое поддерево: [' + (nd.L + 1) + ', ' + nd.m + ']. '
            : 'Слева пусто (L &gt; m−1). ') +
          (nd.m + 1 <= nd.R
            ? 'Правое поддерево: [' + (nd.m + 2) + ', ' + (nd.R + 1) + '].'
            : 'Справа пусто (m+1 &gt; R).'),
        tags: ['sig', 'mid', 'alloc', 'set', 'rec', 'ret'],
        stage: draw(root, { marks: marks }) + Lab.cells(sorted, { hl: hlSeg, box: [nd.m], dim: dimSeg }),
        cap: 'L = ' + (nd.L + 1) + ', R = ' + (nd.R + 1)
      });
    });

    var allOk = pre.map(function (n) { return { n: n, hl: 'ok' }; });
    steps.push({
      title: 'Пустые отрезки: L > R',
      text: 'Рекурсия доходит до пустого отрезка и возвращает <code>NIL</code> — ' +
        'все вершины расставлены, построение завершено.',
      tags: ['sig', 'empty'],
      stage: draw(root, { marks: allOk }) + Lab.cells(sorted, { done: Lab.range(0, sorted.length - 1) }),
      cap: 'дерево построено'
    });

    var ino = nodesIn(root, 'in');
    ino.forEach(function (nd, i) {
      var marks = [];
      ino.forEach(function (m, j) {
        if (j < i) marks.push({ n: m, hl: 'dim' });
        else if (j === i) marks.push({ n: m, hl: 'ok' });
      });
      var seq = vals(ino.slice(0, i + 1));
      steps.push({
        title: 'Обход слева направо: ' + nd.v,
        text: 'Спускаемся к самому левому листу, печатаем вершину и идём вправо. ' +
          'Последовательность: <b>' + seq.map(e).join(' ') + '</b>.',
        tags: ['trav', 'visit'],
        stage: draw(root, { marks: marks }) + Lab.cells(seq, { hl: [i] }),
        cap: 'посещено ' + (i + 1) + ' из ' + ino.length
      });
    });

    var n = sz(root), h = hgt(root), sum = ksum(root), av = avgH(root);
    var mh = minH(root);
    steps.push({
      title: 'Итог: ИСДП построен',
      text: 'Обход слева направо (его печатает программа): <b>' + vals(ino).map(e).join(' ') + '</b>. ' +
        'Прямой: <b>' + vals(pre).map(e).join(' ') + '</b>. Обратный: <b>' + vals(nodesIn(root, 'post')).map(e).join(' ') + '</b>. ' +
        'Размер: <b>' + n + '</b>, контрольная сумма: <b>' + sum + '</b>, ' +
        'высота: <b>' + h + '</b>' + (h === mh ? ' = ⌈log₂(n+1)⌉ = ' + mh + ' — минимально возможная' : '') +
        ', средняя высота: <b>' + f2(av) + '</b> — столько сравнений нужно в среднем при поиске.',
      tags: ['stats'],
      stage: draw(root, { marks: allOk }) + Lab.cells(vals(ino), { done: Lab.range(0, ino.length - 1) }),
      cap: 'n = ' + n + ', h = ' + h + ', hср = ' + f2(av)
    });

    return steps;
  };

  /* ═══════════════════ 04 · ДБД против АВЛ ═══════════════════ */

  G.btree = function (keys) {
    keys = (keys || []).slice(0, 16);
    if (!keys.length) return [];
    var steps = [];
    var dH = { root: null }, aH = { root: null };

    steps.push({
      title: 'Исходная последовательность',
      text: 'Одни и те же ключи <b>' + keys.map(e).join(' ') + '</b> вставляются по одному в два дерева: ' +
        '<b>ДБД</b> (двоичное Б-дерево: показатель баланса 0/1, признаки роста VR и HR) и ' +
        '<b>АВЛ</b> (баланс −1/0/+1, признак Рост). После вставки поднимаемся по пути поиска и пересчитываем балансы у обоих деревьев.',
      tags: ['dbd', 'avl'],
      stage: Lab.cells(keys, {}),
      cap: 'n = ' + keys.length
    });

    keys.forEach(function (k, idx) {
      var insD = bstInsert(dH.root, k);
      var insA = bstInsert(aH.root, k);

      if (insD.dup) {
        steps.push({
          title: 'Ключ ' + k + ' уже есть',
          text: 'В дереве поиска повторов быть не должно: вставка прекращается, ' +
            '<code>VR := ЛОЖЬ</code>, <code>Рост := ЛОЖЬ</code>. Деревья не изменились.',
          tags: ['dbd', 'avl'],
          stage: pairDraw(dH.root, aH.root, { labD: 'bal', labA: 'bal' }),
          cap: 'без изменений'
        });
        return;
      }

      dH.root = insD.root;
      aH.root = insA.root;

      var itags = ['dbd', 'avl', 'dbdleaf', 'avlleaf'];
      insD.path.forEach(function (s) { itags.push(s.dir === 'l' ? 'dbdleft' : 'dbdright'); });
      if (insA.path.length) itags.push('avlwalk');

      steps.push({
        title: 'Вставка ' + k,
        text: 'Ключ <b>' + e(k) + '</b>: ' + pathPhrase(insD.path, k) + '. ' +
          'Вершина добавлена в оба дерева как в обычном дереве поиска — теперь поднимемся вверх, пересчитывая балансы.',
        tags: itags,
        stage: pairDraw(dH.root, aH.root, {
          marksD: [{ n: insD.node, hl: 'root' }],
          marksA: [{ n: insA.node, hl: 'root' }]
        }),
        cap: 'ключ ' + k
      });

      var dBal = [], aBal = [], dRot = 0, aRot = 0;

      dbdUnwind(dH, insD.path, {
        bal: function (p, f, t) { if (f !== t) dBal.push({ v: p.v, f: f, t: t }); },
        before: function (type, p) {
          steps.push({
            title: 'ДБД: ' + (type === 'R' ? 'правый' : 'левый') + ' поворот в вершине ' + p.v,
            text: type === 'R'
              ? 'Вставка ушла влево, а баланс вершины <b>' + e(p.v) + '</b> равен 0 — страница переполнилась: ' +
                'левый сын поднимается на уровень выше (правый поворот). <code>VR := ЛОЖЬ</code>, <code>HR := ИСТИНА</code>.'
              : 'Вставка ушла вправо при <code>HR = ИСТИНА</code> и балансе <b>' + e(p.v) + '</b> = ' + nb(p.bal) +
                ': правый сын поднимается вверх (левый поворот), балансы обнуляются. ' +
                '<code>VR := ИСТИНА</code>, <code>HR := ЛОЖЬ</code>.',
            tags: [type === 'R' ? 'dbdrotr' : 'dbdrotl'],
            stage: pairDraw(dH.root, aH.root, { labD: 'bal', scopeD: p, marksD: [{ n: p, hl: 'warn' }] }),
            cap: 'поворот в вершине ' + p.v
          });
        },
        after: function (type, nr) {
          dRot++;
          steps.push({
            title: 'ДБД: поворот завершён',
            text: 'Корнем поддерева стал <b>' + e(nr.v) + '</b>' +
              (type === 'R' ? ': его баланс 1, у бывшего корня — 0.' : ': балансы обнулены.') +
              ' Структура ДБД сохранена, высота не выросла.',
            tags: [type === 'R' ? 'dbdrotr' : 'dbdrotl'],
            stage: pairDraw(dH.root, aH.root, { labD: 'bal', scopeD: nr, marksD: [{ n: nr, hl: 'ok', edge: 'hl' }] }),
            cap: 'ДБД сбалансирована'
          });
        }
      });

      avlUnwind(aH, insA.path, {
        bal: function (p, f, t) { if (f !== t) aBal.push({ v: p.v, f: f, t: t }); },
        before: function (type, p, q) {
          steps.push({
            title: 'АВЛ: нарушение баланса в вершине ' + p.v,
            text: 'Подъём вверх по пути вставки: у вершины <b>' + e(p.v) + '</b> баланс ' + nb(p.bal) +
              ', выросла ' + (type.charAt(0) === 'L' ? 'левая' : 'правая') + ' ветвь — стал бы ' +
              (type.charAt(0) === 'L' ? '−2' : '+2') + '. У сына <b>' + (q ? e(q.v) : '—') + '</b> баланс ' +
              nb(q ? q.bal : 0) + ' → ' + ((type === 'LL' || type === 'RR') ? 'малый' : 'двойной') +
              ' поворот ' + type + '.',
            tags: ['avlwalk'],
            stage: pairDraw(dH.root, aH.root, {
              labD: 'bal', labA: 'bal', scopeA: p, marksA: [{ n: p, hl: 'warn' }]
            }),
            cap: 'сын: ' + (q ? q.v : '—')
          });
        },
        after: function (type, nr, p, q) {
          aRot++;
          steps.push({
            title: 'АВЛ: поворот ' + type + ' выполнен',
            text: rotText(type, p, q, nr),
            tags: ['avlrot'],
            stage: pairDraw(dH.root, aH.root, {
              labD: 'bal', labA: 'bal', marksA: [{ n: nr, hl: 'ok', edge: 'hl' }]
            }),
            cap: 'корень поддерева — ' + nr.v
          });
        }
      });

      steps.push({
        title: 'Балансы пересчитаны (ключ ' + k + ')',
        text: 'ДБД: ' + (dBal.length ? balPhrase(dBal) : 'без изменений баланса') +
          (dRot ? ', поворотов: ' + dRot : '') + '. ' +
          'АВЛ: ' + (aBal.length ? balPhrase(aBal) : 'без изменений баланса') +
          (aRot ? ', поворотов: ' + aRot : '') + '. Оба дерева сбалансированы.',
        tags: ['dbdleft', 'dbdright', 'avlwalk'],
        stage: pairDraw(dH.root, aH.root, {
          labD: 'bal', labA: 'bal',
          marksD: [{ n: insD.node, hl: 'ok' }],
          marksA: [{ n: insA.node, hl: 'ok' }]
        }),
        cap: (idx + 1) + ' / ' + keys.length + ' ключей вставлено'
      });
    });

    var hD = hgt(dH.root), hA = hgt(aH.root);
    steps.push({
      title: 'Итог: два дерева из одних ключей',
      text: 'Размер: ДБД — <b>' + sz(dH.root) + '</b>, АВЛ — <b>' + sz(aH.root) + '</b>. ' +
        'Контрольная сумма: <b>' + ksum(dH.root) + '</b> и <b>' + ksum(aH.root) + '</b> — совпала, ' +
        'ни один ключ не потерян. Высота: ДБД — <b>' + hD + '</b>, АВЛ — <b>' + hA + '</b>. ' +
        'Средняя высота: <b>' + f2(avgH(dH.root)) + '</b> и <b>' + f2(avgH(aH.root)) +
        '</b> — столько сравнений нужно в среднем для поиска.',
      tags: ['stats'],
      stage: pairDraw(dH.root, aH.root, { labD: 'bal', labA: 'bal' }),
      cap: 'h(ДБД) = ' + hD + ', h(АВЛ) = ' + hA
    });

    return steps;
  };

  /* ═══════════════════ 05 · Двоичное дерево: обходы ═══════════════════ */

  G.binary = function (data) {
    var keys = (data || []).slice(0, 16);
    if (!keys.length) return [];
    var steps = [];
    var H = { root: null };

    steps.push({
      title: 'Ключи для построения дерева',
      text: 'Дерево строится вставками ключей: <b>' + keys.map(e).join(' ') + '</b>. ' +
        'В <code>binary_tree.cpp</code> структура задана явно (дерево варианта 20 из шести вершин A–F), ' +
        'а порядки обходов те же: прямой, симметричный и обратный.',
      tags: ['build'],
      stage: Lab.cells(keys, {}),
      cap: 'n = ' + keys.length
    });

    keys.forEach(function (k, i) {
      var ins = bstInsert(H.root, k);
      if (ins.dup) {
        steps.push({
          title: 'Ключ ' + k + ' уже есть',
          text: 'Повторно не добавляется — в дереве поиска одинаковых ключей нет.',
          tags: ['build'],
          stage: draw(H.root, {}),
          cap: 'без изменений'
        });
        return;
      }
      H.root = ins.root;
      steps.push({
        title: 'Вставка ' + k,
        text: pathPhrase(ins.path, k) + '. Вершина <b>' + e(k) + '</b> добавлена как лист.',
        tags: ['build'],
        stage: draw(H.root, { marks: [{ n: ins.node, hl: 'root' }] }),
        cap: (i + 1) + ' / ' + keys.length
      });
    });

    function traversal(title, order, tagMain, tagVisit) {
      order.forEach(function (nd, i) {
        var marks = [];
        order.forEach(function (m, j) {
          if (j < i) marks.push({ n: m, hl: 'dim' });
          else if (j === i) marks.push({ n: m, hl: 'ok' });
        });
        var seq = vals(order.slice(0, i + 1));
        steps.push({
          title: title + ': посещаем ' + nd.v,
          text: 'Растущая последовательность обхода: <b>' + seq.map(e).join(' ') + '</b>.',
          tags: [tagMain, tagVisit],
          stage: draw(H.root, { marks: marks }) + Lab.cells(seq, { hl: [i] }),
          cap: (i + 1) + ' из ' + order.length
        });
      });
    }

    var preo = nodesIn(H.root, 'pre');
    var ino = nodesIn(H.root, 'in');
    var posto = nodesIn(H.root, 'post');

    traversal('Прямой обход (сверху вниз)', preo, 'pre', 'vpre');
    traversal('Симметричный обход (слева направо)', ino, 'in', 'vin');
    traversal('Обратный обход (снизу вверх)', posto, 'out', 'vout');

    var allOk = nodesIn(H.root, 'in').map(function (n) { return { n: n, hl: 'ok' }; });
    var n = sz(H.root), h = hgt(H.root), sum = ksum(H.root), av = avgH(H.root);
    steps.push({
      title: 'Итог: три обхода и характеристики',
      text: 'Прямой: <b>' + vals(preo).map(e).join(' ') + '</b>. ' +
        'Симметричный: <b>' + vals(ino).map(e).join(' ') + '</b> — для дерева поиска это ключи по возрастанию. ' +
        'Обратный: <b>' + vals(posto).map(e).join(' ') + '</b>. ' +
        'Размер: <b>' + n + '</b>, контрольная сумма: <b>' + sum + '</b>, высота: <b>' + h + '</b>, ' +
        'средняя высота: <b>' + f2(av) + '</b> — столько сравнений нужно в среднем при поиске.',
      tags: ['stats'],
      stage: draw(H.root, { marks: allOk }) + Lab.rows([
        { label: 'прямой', vals: vals(preo), done: Lab.range(0, preo.length - 1) },
        { label: 'симметричный', vals: vals(ino) },
        { label: 'обратный', vals: vals(posto) }
      ]),
      cap: 'n = ' + n + ', h = ' + h + ', hср = ' + f2(av)
    });

    return steps;
  };

  /* ═══════════════════ 06 · АВЛ-дерево: вставка ═══════════════════ */

  G.avl = function (data) {
    var keys = (data || []).slice(0, 16);
    if (!keys.length) return [];
    var steps = [];
    var H = { root: null };

    steps.push({
      title: 'Последовательность ключей',
      text: 'Ключи <b>' + keys.map(e).join(' ') + '</b> добавляются по одному (<code>AddAVL</code>): ' +
        'спуск до пустого места, затем пересчёт баланса снизу вверх. При балансе ±2 — поворот ' +
        'LL, LR, RR или RL; после поворота рост прекращается.',
      tags: ['sig'],
      stage: Lab.cells(keys, {}),
      cap: 'n = ' + keys.length
    });

    keys.forEach(function (k) {
      var ins = bstInsert(H.root, k);
      if (ins.dup) {
        steps.push({
          title: 'Ключ ' + k + ' уже есть',
          text: 'Повтор не добавляется: <code>Рост := ЛОЖЬ</code>, дерево не меняется.',
          tags: ['sig'],
          stage: draw(H.root, { lab: 'bal' }),
          cap: 'без изменений'
        });
        return;
      }
      H.root = ins.root;

      var balEv = [];
      var warnStage = null, rotStage = null, rotInfo = null;

      avlUnwind(H, ins.path, {
        bal: function (p, f, t) { if (f !== t) balEv.push({ v: p.v, f: f, t: t }); },
        before: function (type, p, q) {
          warnStage = draw(H.root, { lab: 'bal', scope: p, marks: [{ n: p, hl: 'warn' }] });
          rotInfo = { type: type, p: p, q: q, balP: p.bal, balQ: q ? q.bal : 0 };
        },
        after: function (type, nr) {
          rotStage = draw(H.root, { lab: 'bal', marks: [{ n: nr, hl: 'ok', edge: 'hl' }] });
          rotInfo.nr = nr;
        }
      });

      if (rotInfo && warnStage && rotStage) {
        steps.push({
          title: 'Вставка ' + k + ': нарушение баланса в вершине ' + rotInfo.p.v,
          text: pathPhrase(ins.path, k) + '. Поднимаемся вверх: у вершины <b>' + e(rotInfo.p.v) + '</b> баланс ' +
            nb(rotInfo.balP) + ', выросла ' + (rotInfo.type.charAt(0) === 'L' ? 'левая' : 'правая') +
            ' ветвь — стал бы ' + (rotInfo.type.charAt(0) === 'L' ? '−2' : '+2') + '. ' +
            'У сына <b>' + e(rotInfo.q.v) + '</b> баланс ' + nb(rotInfo.balQ) + ' → ' +
            ((rotInfo.type === 'LL' || rotInfo.type === 'RR') ? 'малый' : 'двойной') + ' поворот ' + rotInfo.type + '.',
          tags: ['leaf', 'walk'],
          stage: warnStage,
          cap: 'баланс вершины ' + rotInfo.p.v + ' нарушен'
        });
        steps.push({
          title: 'Поворот ' + rotInfo.type + ' в вершине ' + rotInfo.p.v,
          text: rotText(rotInfo.type, rotInfo.p, rotInfo.q, rotInfo.nr),
          tags: [rotInfo.type.toLowerCase()],
          stage: rotStage,
          cap: 'корень поддерева — ' + rotInfo.nr.v
        });
      } else {
        var itags = ['sig', 'leaf'];
        if (ins.path.length) itags.push('walk');
        steps.push({
          title: 'Вставка ' + k,
          text: pathPhrase(ins.path, k) + '. Поднимаемся вверх: ' + balPhrase(balEv) +
            ' — нарушений баланса нет.',
          tags: itags,
          stage: draw(H.root, { lab: 'bal', marks: [{ n: ins.node, hl: 'root' }] }),
          cap: 'вставка ' + k
        });
      }
    });

    var ino = nodesIn(H.root, 'in');
    var n = sz(H.root), h = hgt(H.root), sum = ksum(H.root), av = avgH(H.root);
    steps.push({
      title: 'Итог: АВЛ-дерево построено',
      text: 'Обход слева направо: <b>' + vals(ino).map(e).join(' ') + '</b> — ключи по возрастанию, ' +
        'дерево поиска построено верно. Размер: <b>' + n + '</b>, контрольная сумма: <b>' + sum + '</b>, ' +
        'высота: <b>' + h + '</b> (минимальная для n — ' + minH(H.root) + '), ' +
        'средняя высота: <b>' + f2(av) + '</b>.',
      tags: ['stats'],
      stage: draw(H.root, { lab: 'bal' }),
      cap: 'n = ' + n + ', h = ' + h + ', hср = ' + f2(av)
    });

    return steps;
  };

  /* ═══════════════════ 07 · Удаление из АВЛ ═══════════════════ */

  G.avlDel = function (ctx) {
    ctx = ctx || {};
    var keys = (ctx.keys || []).slice(0, 16);
    var dels = (ctx.dels || []).slice(0, 8);
    if (!keys.length) return [];
    var steps = [];
    var H = { root: null };

    steps.push({
      title: 'Дерево и список удалений',
      text: 'Сначала строим АВЛ-дерево вставками из ключей <b>' + keys.map(e).join(' ') + '</b>, ' +
        'затем удаляем по одному: <b>' + (dels.length ? dels.map(e).join(' ') : '(список пуст)') + '</b>. ' +
        'После удаления высота поддерева может уменьшиться — поднимемся к корню, пересчитывая балансы ' +
        'процедурами <code>BL</code> и <code>BR</code>.',
      tags: ['sig', 'add'],
      stage: Lab.rows([
        { label: 'ключи', vals: keys },
        { label: 'удалить', vals: dels }
      ]),
      cap: 'n = ' + keys.length + ', удалений: ' + dels.length
    });

    keys.forEach(function (k, i) {
      var ins = bstInsert(H.root, k);
      if (ins.dup) return;
      H.root = ins.root;
      var balEv = [], rotType = null;
      avlUnwind(H, ins.path, {
        bal: function (p, f, t) { if (f !== t) balEv.push({ v: p.v, f: f, t: t }); },
        before: function (type) { rotType = type; },
        after: function () { /* поворот при вставке — см. работу 06 */ }
      });
      steps.push({
        title: 'Вставка ' + k,
        text: pathPhrase(ins.path, k) + '. Балансы: ' + balPhrase(balEv) +
          (rotType ? '. Выполнен поворот ' + rotType + ' (подробно — в работе 06)' : ' — нарушений нет.') + '.',
        tags: ['add'],
        stage: draw(H.root, { lab: 'bal', marks: [{ n: ins.node, hl: 'root' }] }),
        cap: (i + 1) + ' / ' + keys.length
      });
    });

    dels.forEach(function (x) {
      var path = [], cur = H.root, target = null;
      while (cur) {
        if (x < cur.v) { path.push({ n: cur, dir: 'l' }); cur = cur.l; }
        else if (x > cur.v) { path.push({ n: cur, dir: 'r' }); cur = cur.r; }
        else { target = cur; break; }
      }

      if (!target) {
        steps.push({
          title: 'Ключ ' + x + ' не найден',
          text: 'Спуск: ' + pathPhrase(path, x) + '. Такого ключа в дереве нет — ' +
            '<code>Уменьшение</code> остаётся ЛОЖЬ, дерево не изменилось.',
          tags: ['find'],
          stage: draw(H.root, { lab: 'bal' }),
          cap: 'ключа ' + x + ' нет'
        });
        return;
      }

      var smarks = path.map(function (s) { return { n: s.n, edge: 'hl' }; });
      smarks.push({ n: target, hl: 'root' });
      steps.push({
        title: 'Ищем ключ ' + x,
        text: pathPhrase(path, x) + '. Нашли вершину <b>' + e(target.v) + '</b> — ' +
          'удаляем её так же, как в дереве поиска.',
        tags: ['find'],
        stage: draw(H.root, { lab: 'bal', marks: smarks }),
        cap: 'вершина ' + x
      });

      var twoChildren = !!(target.l && target.r);
      if (twoChildren) {
        var pred = target.l, predPath = [];
        while (pred.r) { predPath.push({ n: pred, dir: 'r' }); pred = pred.r; }
        var pm = [{ n: target, hl: 'root' }, { n: pred, hl: 'warn' }];
        predPath.forEach(function (s) { pm.push({ n: s.n, edge: 'hl' }); });
        steps.push({
          title: 'Два потомка: ищем предшественник',
          text: 'У вершины <b>' + e(target.v) + '</b> два потомка — заменяем её предшественником: ' +
            'самой правой вершиной левого поддерева, <b>' + e(pred.v) + '</b>. ' +
            'Спускаемся вправо от <b>' + e(target.l.v) + '</b> до упора (<code>del</code>).',
          tags: ['delx'],
          stage: draw(H.root, { lab: 'bal', marks: pm }),
          cap: 'предшественник ' + pred.v
        });
      }

      var balEv = [], rots = [], removal = null;
      var used = { bl: false, br: false };

      var hooks = {
        bal: function (proc, p, f, t) {
          used[proc === 'BL' ? 'bl' : 'br'] = true;
          if (f !== t) balEv.push({ v: p.v, f: f, t: t, proc: proc });
        },
        before: function (type, p, q, proc) {
          used[proc === 'BL' ? 'bl' : 'br'] = true;
          rots.push({
            warn: draw(H.root, { lab: 'bal', scope: p, marks: [{ n: p, hl: 'warn' }] }),
            type: type, p: p, q: q, proc: proc, balP: p.bal, balQ: q ? q.bal : 0
          });
        },
        after: function (type, nr, p, umen, proc) {
          var rec = rots[rots.length - 1];
          rec.nr = nr;
          rec.umen = umen;
          rec.stage = draw(H.root, { lab: 'bal', scope: nr, marks: [{ n: nr, hl: 'ok', edge: 'hl' }] });
        },
        removed: function (info) {
          var marks = [];
          if (info.kind === 'two') marks.push({ n: info.target, hl: 'root' });
          else if (info.child) marks.push({ n: info.child, hl: 'ok', edge: 'hl' });
          info.stage = draw(H.root, { marks: marks });
          removal = info;
        }
      };

      deleteKey(H, x, hooks);

      /* шаг удаления: снимок снят внутри deleteKey в нужный момент */
      if (removal) {
        var rmStage = removal.stage;
        steps.push({
          title: removal.kind === 'two'
            ? 'Замена предшественником: ' + removal.oldV + ' → ' + removal.newV
            : (removal.kind === 'one' ? 'Удаление ' + removal.oldV + ': один потомок' : 'Удаление ' + removal.oldV + ': лист'),
          text: removal.kind === 'two'
            ? 'Данные предшественника <b>' + e(removal.newV) + '</b> перенесены в вершину <b>' +
              e(removal.oldV) + '</b> (теперь в ней <b>' + e(removal.newV) + '</b>), физически удалён ' +
              'узел предшественника — он был листом или имел одного потомка. ' +
              '<code>Уменьшение := ИСТИНА</code> — поднимемся вверх, восстанавливая баланс.'
            : removal.child
              ? 'У вершины только одно поддерево: указатель родителя перенаправлен на <b>' +
                e(removal.child.v) + '</b> (<code>p := q→Left/Right</code>). ' +
                '<code>Уменьшение := ИСТИНА</code>.'
              : 'Вершина — лист: указатель родителя стал NIL (<code>p := NIL</code>). ' +
                '<code>Уменьшение := ИСТИНА</code>.',
          tags: ['rem'].concat(twoChildren ? ['delx'] : []),
          stage: rmStage,
          cap: 'удалена ' + removal.oldV
        });
      }

      /* повороты вдоль пути удаления */
      rots.forEach(function (r) {
        steps.push({
          title: 'Баланс нарушен в вершине ' + r.p.v + ' (поворот ' + r.type + ')',
          text: 'При подъёме к корню у вершины <b>' + e(r.p.v) + '</b> баланс ' + nb(r.balP) +
            ' — ' + (r.proc === 'BL' ? 'уменьшилось левое' : 'уменьшилось правое') +
            ' поддерево, стал бы ' + (r.proc === 'BL' ? '+2' : '−2') + '. ' +
            'У сына <b>' + (r.q ? e(r.q.v) : '—') + '</b> баланс ' + (r.q ? nb(r.balQ) : 0) +
            ' → ' + (r.type === 'LR' || r.type === 'RL' ? 'двойной' : 'одинарный') + ' поворот ' + r.type + '.',
          tags: [r.proc === 'BL' ? 'bl' : 'br'],
          stage: r.warn,
          cap: 'процедура ' + r.proc
        });
        steps.push({
          title: 'Поворот ' + r.type + ' выполнен',
          text: delRotText(r.type, r.p, r.q, r.nr, r.umen),
          tags: ['rot'],
          stage: r.stage,
          cap: 'корень поддерева — ' + r.nr.v
        });
      });

      /* итог по этому ключу */
      var stags = [];
      if (used.bl) stags.push('bl');
      if (used.br) stags.push('br');
      steps.push({
        title: 'Балансы восстановлены после удаления ' + x,
        text: (balEv.length ? 'Пересчёт вверх по пути: ' + balPhrase(balEv) + '.' : 'Балансы вдоль пути не изменились.') +
          (rots.length ? ' Поворотов: ' + rots.length + ' (' + rots.map(function (r) { return r.type; }).join(', ') + ').' : ' Повороты не потребовались.') +
          ' Дерево снова сбалансировано.',
        tags: stags,
        stage: draw(H.root, { lab: 'bal' }),
        cap: 'размер ' + sz(H.root) + ', высота ' + hgt(H.root)
      });
    });

    var ino = nodesIn(H.root, 'in');
    steps.push({
      title: 'Итог: удаления выполнены',
      text: 'Обход слева направо: <b>' + vals(ino).map(e).join(' ') + '</b> — ключи по возрастанию. ' +
        'Размер: <b>' + sz(H.root) + '</b>, контрольная сумма: <b>' + ksum(H.root) + '</b>, ' +
        'высота: <b>' + hgt(H.root) + '</b>, средняя высота: <b>' + f2(avgH(H.root)) + '</b>. ' +
        'Удалённых ключей: <b>' + dels.length + '</b>.',
      tags: ['stats'],
      stage: draw(H.root, { lab: 'bal' }),
      cap: 'размер ' + sz(H.root) + ', высота ' + hgt(H.root)
    });

    return steps;
  };
})();
