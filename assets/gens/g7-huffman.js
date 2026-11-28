/* Генератор шагов для работы 13 «Код Хаффмана» (Huffman.cpp).
   Подключается ДО assets/lab.js; глобальный Lab используется только
   в момент вызова генератора, поэтому при загрузке файла его ещё нет. */
(function () {
  'use strict';

  var G = window.LabGen = window.LabGen || {};

  var COLS = [
    ['sym', 'Символ'], ['n', 'n<sub>i</sub>'], ['p', 'P<sub>i</sub>'],
    ['q', 'q'], ['code', 'Код'], ['L', 'L<sub>i</sub>']
  ];

  /* таблица: o = {cols, cur, done} — строка cur подсвечивается,
     строки до done приглушаются (как «готовая часть» в сортировках) */
  function table(rows, o) {
    o = o || {};
    var cols = o.cols || ['sym', 'n', 'p', 'code', 'L'];
    var h = '<div class="tablewrap"><table class="cmp"><thead><tr>';
    COLS.forEach(function (c) {
      if (cols.indexOf(c[0]) >= 0) h += '<th>' + c[1] + '</th>';
    });
    h += '</tr></thead><tbody>';
    rows.forEach(function (r, i) {
      var style = i === o.cur ? ' style="background:var(--accent-soft)"'
        : (o.done != null && i < o.done ? ' style="color:var(--mut)"' : '');
      h += '<tr' + style + '>';
      cols.forEach(function (k) {
        var v = r[k];
        h += '<td>' + (k === 'sym' ? '<code>' + Lab.esc(v) + '</code>'
          : (v == null || v === '' ? '·' : Lab.esc(String(v)))) + '</td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* двухколоночная таблица «показатель — значение» */
  function kv(pairs) {
    return '<div class="tablewrap"><table class="cmp"><tbody>' +
      pairs.map(function (p) {
        return '<tr><th>' + p[0] + '</th><td><code>' + p[1] + '</code></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* длина кода Шеннона L = ceil(-log2 p) — для сравнения в задании 3 */
  function shannonLen(p) {
    var L = 1;
    while (p < Math.pow(2, -L)) L++;
    return L;
  }

  /* код Фано для сравнения в задании 3: медиана по определению + рекурсия */
  function fanoCodes(P, n) {
    var codes = [], i;
    for (i = 0; i <= n; i++) codes[i] = '';
    function med(L, R) {
      var m = L, best = -1, a, b, SL, SR;
      for (a = L; a < R; a++) {
        SL = 0; SR = 0;
        for (b = L; b <= a; b++) SL += P[b];
        for (b = a + 1; b <= R; b++) SR += P[b];
        var diff = Math.abs(SL - SR);
        if (best < 0 || diff < best) { best = diff; m = a; }
      }
      return m;
    }
    (function rec(L, R) {
      if (L >= R) return;
      var m = med(L, R), j;
      for (j = L; j <= R; j++) codes[j] += (j <= m ? '0' : '1');
      rec(L, m);
      rec(m + 1, R);
    })(1, n);
    return codes;
  }

  /* ── 13 Код Хаффмана (Huffman.cpp: частоты → P → Up/Down → коды) ── */
  G.huffman = function (text) {
    text = String(text || '');
    var N = text.length, steps = [], freq = [], i, k;

    /* подсчёт частот: новый символ — в алфавит, встреченный — счётчик n_i + 1 */
    for (i = 0; i < N; i++) {
      var found = null;
      for (k = 0; k < freq.length; k++) {
        if (freq[k].sym === text[i]) { found = freq[k]; break; }
      }
      if (found) found.n++;
      else freq.push({ sym: text[i], n: 1 });
    }

    /* P_i = n_i / N */
    freq.forEach(function (r) { r.p = r.n / N; r.pd = String(+r.p.toPrecision(3)); });
    var n = freq.length;

    /* сортировка по убыванию — пузырьком, как в программе */
    var sorted = freq.slice();
    for (i = 0; i < n - 1; i++) {
      for (k = 0; k < n - i - 1; k++) {
        if (sorted[k].n < sorted[k + 1].n) {
          var tmp = sorted[k]; sorted[k] = sorted[k + 1]; sorted[k + 1] = tmp;
        }
      }
    }

    /* 1. вход */
    steps.push({
      title: 'Исходный текст',
      text: 'Программа читает файл и один раз проходит по всем <b>' + N + '</b> символам; ' +
        'различных символов — <b>' + n + '</b>.<span class="note-under">' +
        'P<sub>i</sub> = n<sub>i</sub> / N — оценка вероятности по всему тексту.</span>',
      tags: ['sig'],
      stage: Lab.cells(text.slice(0, 12).split(''), { idx: true }) +
        (N > 12 ? Lab.note('… ещё ' + (N - 12) + ' символов') : ''),
      cap: 'N = ' + N
    });

    /* 2. частоты */
    steps.push({
      title: 'Частоты n_i',
      text: 'Для каждого символа увеличиваем счётчик <code>n<sub>i</sub></code>, новый символ ' +
        'добавляем в алфавит. Сумма частот равна <b>N = ' + N + '</b>.',
      tags: ['cnt'],
      stage: table(freq, { cols: ['sym', 'n'] }),
      cap: 'алфавит: ' + n + ' символов'
    });

    /* 3. вероятности */
    steps.push({
      title: 'Вероятности P_i = n_i / N',
      text: 'Вероятность — доля повторений символа в тексте. Сумма всех ' +
        '<code>P<sub>i</sub></code> должна быть равна <b>1</b>.',
      tags: ['prob'],
      stage: table(freq, { cols: ['sym', 'n', 'p'] }),
      cap: 'Σ P = 1'
    });

    /* 4. сортировка по убыванию */
    steps.push({
      title: 'Сортировка по убыванию',
      text: 'Массив вероятностей упорядочен по убыванию: две наименьшие ' +
        'вероятности — последние два элемента массива <code>P</code>.',
      tags: ['sort'],
      stage: table(sorted, { cols: ['sym', 'n', 'p'], cur: 0 }),
      cap: 'P_1 ≥ P_2 ≥ … ≥ P_n'
    });

    /* 5+. слияния: ровно как Huffman(n,P) / Up(n,q) в программе */
    var A = [{ sym: null, p: 1, node: null }];   /* A[1..m] — рабочий массив P */
    var leaves = [];
    sorted.forEach(function (r) {
      var leaf = { v: r.sym === ' ' ? '␣' : r.sym, sym: r.sym, p: r.p, leaf: true };
      leaves.push(leaf);
      A.push({ sym: r.sym, p: r.p, node: leaf });
    });
    var m = n, merges = 0;

    while (m > 2) {
      var left = A[m - 1], right = A[m];        /* две наименьшие: P[n-1], P[n] */
      var qv = left.p + right.p;                /* q := P[n−1] + P[n] */
      var parent = { v: qv.toFixed(2), p: qv, l: left.node, r: right.node };
      /* Up(n,q): сдвиг элементов ≤ q вниз, затем P[j] := q — как в Up() */
      var before = [];
      for (i = 1; i <= m; i++) before.push(A[i].p.toFixed(3));
      var j = m - 1, i2;
      for (i2 = m - 1; i2 >= 2; i2--) {
        if (A[i2 - 1].p <= qv) { A[i2] = A[i2 - 1]; j = i2 - 1; }
        else { j = i2; break; }
      }
      A[j] = { sym: null, p: qv, node: parent };
      merges++;

      if (merges <= 8) {
        (function (mv, mB, mQ, mJ, mLeft, mRight) {
          steps.push({
            title: 'Слияние ' + mv + ': два наименьших → q',
            text: 'Берутся две наименьшие вероятности — последние два элемента ' +
              'массива: <b>' + mLeft + '</b> и <b>' + mRight + '</b>. Их сумма ' +
              '<code>q = ' + mQ.toFixed(4) + '</code> вставляется функцией ' +
              '<code>Up(n,q)</code> на позицию <b>j = ' + mJ +
              '</b>: элементы, не больше q, сдвигаются вниз.',
            tags: ['merge', 'up'],
            stage: Lab.rows([
              { label: 'P', vals: mB, hl: [mB.length - 2, mB.length - 1], idx: true },
              { note: 'q = ' + mQ.toFixed(4) + ' → позиция j = ' + mJ }
            ]),
            cap: 'осталось элементов: ' + (m - 1)
          });
        })(merges, before, qv, j, left.p.toFixed(3), right.p.toFixed(3));
      }
      m--;
    }
    if (merges > 8) {
      steps.push({
        title: '…ещё ' + (merges - 8) + ' слияний',
        text: 'Далее алгоритм повторяется: каждое новое <code>q</code> снова ' +
          'вставляется на своё место, пока в массиве не останется два элемента. ' +
          'Всего слияний — <b>' + merges + '</b>.',
        tags: ['merge', 'up'],
        stage: Lab.note('P[1] = ' + A[1].p.toFixed(3) + ', P[2] = ' + A[2].p.toFixed(3)),
        cap: 'n = 2 — базовый случай'
      });
    }

    /* базовый случай n = 2: C[1,1] := 0, C[2,1] := 1 */
    var baseRows = [];
    if (n === 1) {
      baseRows.push({ sym: sorted[0].sym, p: sorted[0].pd, code: '0', L: 1 });
    } else {
      for (i = 1; i <= 2; i++) {
        var el = A[i];
        var sym = el.sym != null ? el.sym : 'узел q';
        baseRows.push({ sym: sym, p: el.p.toFixed(3), code: i === 1 ? '0' : '1', L: 1 });
      }
    }
    steps.push({
      title: 'Базовый случай: n = 2',
      text: 'Когда в массиве остаются два элемента, первый получает код <b>0</b>, ' +
        'второй — <b>1</b>. Дальше — обратный ход рекурсии: процедура ' +
        '<code>Down(n,j)</code> возвращает сохранённый префикс и дописывает ' +
        'к нему 0 и 1.',
      tags: ['code'],
      stage: table(baseRows, { cols: ['sym', 'p', 'code', 'L'] }),
      cap: '0 и 1 — коды оставшихся элементов'
    });

    /* дерево: корень — два элемента базового случая, листья — символы */
    var root = n === 1 ? A[1].node
      : { v: '1.00', p: 1, l: A[1].node, r: A[2].node };
    steps.push({
      title: 'Down(n,j): дерево кодов готово',
      text: 'На подъёме рекурсии <code>Down</code> восстанавливает запомненную ' +
        'строку <code>S := C[j,*]</code>, сдвигает строки вверх и дописывает ' +
        'детям <b>0</b> и <b>1</b>. Так собирается дерево: слева — 0, справа — 1, ' +
        'код символа — путь от корня к листу.',
      tags: ['down'],
      stage: Lab.tree(root, { hl: 'root' }),
      cap: 'код читается от корня к листу'
    });

    /* коды: обход дерева */
    var codes = [];
    codes[0] = '';
    (function walk(node, prefix, out) {
      if (!node) return;
      if (node.leaf) { out[node.sym] = prefix || '0'; return; }
      walk(node.l, prefix + '0', out);
      walk(node.r, prefix + '1', out);
    })(root, '', codes);
    var codeRows = sorted.map(function (row) {
      var c = codes[row.sym] || '0';
      return { sym: row.sym, n: row.n, p: row.pd, code: c, L: c.length };
    });
    steps.push({
      title: 'Кодовая таблица кода Хаффмана',
      text: 'Код каждого символа — путь от корня к его листу. Код Хаффмана ' +
        'оптимален: среди всех префиксных кодов у него минимальная средняя длина.',
      tags: ['code'],
      stage: table(codeRows, { cols: ['sym', 'p', 'code', 'L'] }),
      cap: 'префиксный и оптимальный код'
    });

    /* статистика: Крафт, энтропия, средняя длина, избыточность */
    var kraft = 0, H = 0, Lcp = 0;
    sorted.forEach(function (r) {
      var L = (codes[r.sym] || '0').length;
      kraft += Math.pow(2, -L);
      H += -r.p * Math.log(r.p) / Math.LN2;
      Lcp += r.p * L;
    });
    var R = Lcp - H;
    steps.push({
      title: 'Крафт, энтропия, избыточность',
      text: 'Сумма <code>2<sup>−L</sup></code> не превышает 1 — код префиксный. ' +
        'Средняя длина <b>Lcp</b> сравнивается с энтропией <b>H</b>: разница ' +
        '<b>R = Lcp − H</b> — избыточность кода Хаффмана.',
      tags: ['stats'],
      stage: kv([
        ['Неравенство Крафта', kraft.toFixed(4) + (kraft <= 1 + 1e-9 ? ' ≤ 1 — выполняется' : ' > 1!')],
        ['Энтропия H', H.toFixed(4) + ' бит'],
        ['Средняя длина Lcp', Lcp.toFixed(4) + ' бит'],
        ['Избыточность R = Lcp − H', R.toFixed(4)]
      ]),
      cap: 'Lcp ≥ H и близка к ней'
    });

    /* сравнение со средней длиной кодов Шеннона и Фано */
    var P1 = [0], LcpS = 0, LcpF = 0;
    sorted.forEach(function (r) { P1.push(r.p); });
    var fcodes = fanoCodes(P1, n);
    sorted.forEach(function (r, pos) {
      LcpS += r.p * shannonLen(r.p);
      LcpF += r.p * fcodes[pos + 1].length;
    });
    steps.push({
      title: 'Сравнение со средней длиной кодов Шеннона и Фано',
      text: 'Для тех же вероятностей считаются средние длины кодов Шеннона ' +
        '(<code>L = ⌈−log<sub>2</sub> P⌉</code>) и Фано (деление по медиане). ' +
        'Оптимум Хаффмана означает: его средняя длина не больше, чем у любого ' +
        'из них.',
      tags: ['compare'],
      stage: kv([
        ['Код Хаффмана', Lcp.toFixed(4) + ' бит'],
        ['Код Фано', LcpF.toFixed(4) + ' бит'],
        ['Код Шеннона', LcpS.toFixed(4) + ' бит'],
        ['Энтропия H (предел)', H.toFixed(4) + ' бит']
      ]),
      cap: 'L_Хаффмана ≤ L_Фано ≤ L_Шеннона'
    });

    /* кодирование: первые символов текста */
    var encText = text.slice(0, 12), encRows = [], bits = 0;
    for (i = 0; i < encText.length; i++) {
      var c = codes[encText[i]];
      if (c == null) continue;
      bits += c.length;
      encRows.push({ sym: encText[i], L: c.length, code: c });
    }
    var fixed = n > 1 ? Math.ceil(Math.log(n) / Math.LN2) : 1;
    steps.push({
      title: 'Кодирование первых ' + encRows.length + ' символов',
      text: 'Вместо каждого символа подставляем его код — получается двоичная ' +
        'строка длиной <b>' + bits + '</b> бит. При равномерном коде ' +
        '(<code>⌈log<sub>2</sub> ' + n + '⌉ = ' + fixed + '</code> бит/символ) ' +
        'потребовалось бы <b>' + fixed * encRows.length + '</b> бит, коэффициент ' +
        'сжатия — <b>' + (bits ? (fixed * encRows.length / bits).toFixed(3) : '—') + '</b>.',
      tags: ['encode'],
      stage: table(encRows, { cols: ['sym', 'L', 'code'] }),
      cap: bits + ' бит вместо ' + fixed * encRows.length
    });

    return steps;
  };
})();
