/* Генератор шагов для работы 14 «Код Гилберта-Мура» (GilbertMoore.cpp).
   Подключается ДО assets/lab.js; глобальный Lab используется только
   в момент вызова генератора, поэтому при загрузке файла его ещё нет. */
(function () {
  'use strict';

  var G = window.LabGen = window.LabGen || {};

  var COLS = [
    ['sym', 'Символ'], ['n', 'n<sub>i</sub>'], ['p', 'P<sub>i</sub>'],
    ['q', 'Q<sub>i</sub>'], ['L', 'L<sub>i</sub>'], ['code', 'Код']
  ];

  /* таблица: o = {cols, cur, done} — строка cur подсвечивается,
     строки до done приглушаются (как «готовая часть» в сортировках) */
  function table(rows, o) {
    o = o || {};
    var cols = o.cols || ['sym', 'n', 'p', 'q', 'L', 'code'];
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

  /* длина кода Шеннона L = ceil(-log2 p) — для сравнения */
  function shannonLen(p) {
    var L = 1;
    while (p < Math.pow(2, -L)) L++;
    return L;
  }

  /* код Фано для сравнения: медиана по определению + рекурсия */
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

  /* средняя длина кода Хаффмана: классическое слияние двух наименьших */
  function huffmanLcp(ps) {
    /* длины через дерево слияний: два наименьших узла сливаются, пока не останется один */
    var pool = ps.map(function (p) { return { p: p, l: null, r: null }; });
    while (pool.length > 1) {
      pool.sort(function (x, y) { return y.p - x.p; });   /* два последних = наименьшие */
      var b = pool.pop(), c = pool.pop();
      pool.push({ p: b.p + c.p, l: b, r: c });
    }
    var root = pool[0], Lcp = 0;
    (function walk(nd, d) {
      if (!nd) return;
      if (!nd.l && !nd.r) { Lcp += nd.p * d; return; }
      walk(nd.l, d + 1);
      walk(nd.r, d + 1);
    })(root, 0);
    return Lcp;
  }

  /* ── 14 Код Гилберта-Мура (GilbertMoore.cpp: P → Q → L → биты Q) ── */
  G.gilbertMoore = function (text) {
    text = String(text || '');
    var N = text.length, steps = [], freq = [], i, j;

    /* подсчёт частот: новый символ — в алфавит, встреченный — счётчик n_i + 1 */
    for (i = 0; i < N; i++) {
      var found = null;
      for (j = 0; j < freq.length; j++) {
        if (freq[j].sym === text[i]) { found = freq[j]; break; }
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
      for (j = 0; j < n - i - 1; j++) {
        if (sorted[j].n < sorted[j + 1].n) {
          var tmp = sorted[j]; sorted[j] = sorted[j + 1]; sorted[j + 1] = tmp;
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
      text: 'Код Гилберта-Мура — алфавитный: кодовые слова идут в том же ' +
        'порядке, что и символы, поэтому список упорядочивается по убыванию ' +
        'вероятностей, как и для остальных кодов пособия.',
      tags: ['sort'],
      stage: table(sorted, { cols: ['sym', 'n', 'p'], cur: 0 }),
      cap: 'P_1 ≥ P_2 ≥ … ≥ P_n'
    });

    /* 5. суммы Q_i = p1 + … + p_{i-1} + p_i/2 (шаг 1 пособия) */
    var sum = 0;
    sorted.forEach(function (r) {
      r.q = sum + r.p / 2;
      sum += r.p;
      r.qd = r.q.toFixed(4);
    });
    steps.push({
      title: 'Суммы Q_i (шаг 1)',
      text: '<code>Q<sub>i</sub> = p<sub>1</sub> + … + p<sub>i−1</sub> + p<sub>i</sub>/2</code> — ' +
        'середина интервала символа на отрезке [0; 1): левая граница всех ' +
        'предыдущих вероятностей плюс половина своей. Из двоичной записи ' +
        '<code>Q<sub>i</sub></code> и берётся кодовое слово.',
      tags: ['q'],
      stage: table(sorted, { cols: ['sym', 'p', 'q'] }),
      cap: 'Q растёт от p_1/2 до 1 − p_n/2'
    });

    /* 6. длины L_i = ceil(-log2 p_i) + 1 (шаг 3 пособия) */
    sorted.forEach(function (r) {
      r.L = Math.min(Math.ceil(-Math.log(r.p) / Math.LN2) + 1, 64);
    });
    steps.push({
      title: 'Длины кодовых слов L_i (шаг 3)',
      text: 'По пособию <code>L<sub>i</sub> = ⌈−log<sub>2</sub> p<sub>i</sub>⌉ + 1</code> — ' +
        'на один разряд длиннее длины Шеннона. Лишний бит гарантирует, что ' +
        'двоичный интервал слова целиком лежит внутри интервала символа, ' +
        'поэтому код всегда префиксный и <b>Lcp &lt; H + 2</b>.',
      tags: ['len'],
      stage: table(sorted, { cols: ['sym', 'p', 'L'] }),
      cap: 'L = ⌈−log2 P⌉ + 1'
    });

    /* 7. разряды кода: двоичная дробь Q_i (шаг 2), по шагу на символ */
    var showBits = Math.min(n, 5);
    for (i = 0; i < showBits; i++) {
      (function (idx) {
        var r = sorted[idx], x = r.q, chain = [], jj;
        for (jj = 0; jj < r.L; jj++) {
          var before = x;
          x *= 2;
          var bit = x >= 1 ? 1 : 0;
          if (bit) x -= 1;
          chain.push(before.toFixed(3) + '·2 = ' + (bit ? '1 + ' + x.toFixed(3) : x.toFixed(3)) +
            ' → бит ' + bit);
        }
        var rows = sorted.map(function (row, pos) {
          return { sym: row.sym, p: row.pd, q: row.qd, L: row.L,
            code: pos <= idx ? row.code || '' : '' };
        });
        /* код — первые L бит дробной части Q (шаг 2) */
        var y = r.q, bits = '';
        for (jj = 0; jj < r.L; jj++) {
          y *= 2;
          var b = y >= 1 ? 1 : 0;
          bits += b;
          if (b) y -= 1;
        }
        r.code = bits;
        rows[idx].code = bits;
        steps.push({
          title: 'Код «' + r.sym + '» — ' + r.L + ' бит (шаг 2)',
          text: 'Из двоичной записи <code>Q<sub>' + (idx + 1) + '</sub></code> = <b>' +
            r.qd + '</b> берутся первые <b>' + r.L + '</b> бит после запятой. ' +
            'На каждом шаге <code>X ← 2X</code>, целая часть становится битом. ' +
            (n > showBits && idx === showBits - 1 ? 'Остальные символы считаются так же. ' : '') +
            'Цепочка: ' + chain.join('; ') + '.',
          tags: ['bits'],
          stage: table(rows, { cols: ['sym', 'q', 'L', 'code'], cur: idx }),
          cap: 'C' + (idx + 1) + ' = ' + bits
        });
      })(i);
    }

    /* досчитываем коды оставшихся символов той же цепочкой */
    sorted.forEach(function (r) {
      if (r.code) return;
      var x = r.q, bits = '';
      for (var jj = 0; jj < r.L; jj++) {
        x *= 2;
        var b = x >= 1 ? 1 : 0;
        bits += b;
        if (b) x -= 1;
      }
      r.code = bits;
    });

    /* 8. кодовая таблица */
    var codeRows = sorted.map(function (row) {
      return { sym: row.sym, n: row.n, p: row.pd, q: row.qd, L: row.L, code: row.code };
    });
    steps.push({
      title: 'Кодовая таблица кода Гилберта-Мура',
      text: 'Кодовые слова идут в том же порядке, что и символы — код ' +
        'алфавитный (лексикографически упорядоченный) и префиксный: ' +
        'ни одно слово не является началом другого.',
      tags: ['code'],
      stage: table(codeRows, { cols: ['sym', 'p', 'q', 'L', 'code'] }),
      cap: 'алфавитный префиксный код'
    });

    /* 9. статистика: Крафт, энтропия, средняя длина, избыточность */
    var kraft = 0, H = 0, Lcp = 0;
    sorted.forEach(function (r) {
      kraft += Math.pow(2, -r.L);
      H += -r.p * Math.log(r.p) / Math.LN2;
      Lcp += r.p * r.L;
    });
    var R = Lcp - H;
    steps.push({
      title: 'Крафт, энтропия, избыточность',
      text: 'Сумма <code>2<sup>−L</sup></code> не превышает 1 — код префиксный. ' +
        'Средняя длина <b>Lcp</b> сравнивается с энтропией <b>H</b>: разница ' +
        '<b>R = Lcp − H</b> — избыточность, для кода Гилберта-Мура по теории ' +
        '<b>Lcp &lt; H + 2</b>.',
      tags: ['stats'],
      stage: kv([
        ['Неравенство Крафта', kraft.toFixed(4) + (kraft <= 1 + 1e-9 ? ' ≤ 1 — выполняется' : ' > 1!')],
        ['Энтропия H', H.toFixed(4) + ' бит'],
        ['Средняя длина Lcp', Lcp.toFixed(4) + ' бит'],
        ['Избыточность R = Lcp − H', R.toFixed(4) + (R < 2 ? ' < 2 — выполняется' : ' ≥ 2!')]
      ]),
      cap: 'Lcp < H + 2'
    });

    /* 10. сравнение со средней длиной остальных кодов */
    var P1 = [0], LcpS = 0, LcpF = 0;
    sorted.forEach(function (r) { P1.push(r.p); });
    var fcodes = fanoCodes(P1, n);
    var ps = sorted.map(function (r) { return r.p; });
    var LcpH = huffmanLcp(ps);
    sorted.forEach(function (r, pos) {
      LcpS += r.p * shannonLen(r.p);
      LcpF += r.p * fcodes[pos + 1].length;
    });
    steps.push({
      title: 'Сравнение со средней длиной остальных кодов',
      text: 'Для тех же вероятностей считаются средние длины кодов Шеннона, ' +
        'Фано и Хаффмана. Граница Гилберта-Мура — <b>Lcp &lt; H + 2</b>: код ' +
        'чуть длиннее, зато назначается по алфавиту, без дерева.',
      tags: ['compare'],
      stage: kv([
        ['Код Гилберта-Мура', Lcp.toFixed(4) + ' бит'],
        ['Код Шеннона', LcpS.toFixed(4) + ' бит'],
        ['Код Фано', LcpF.toFixed(4) + ' бит'],
        ['Код Хаффмана', LcpH.toFixed(4) + ' бит'],
        ['Энтропия H (предел)', H.toFixed(4) + ' бит']
      ]),
      cap: 'Lcp < H + 2'
    });

    /* 11. кодирование первых символов */
    var encText = text.slice(0, 12), encRows = [], bits = 0;
    for (i = 0; i < encText.length; i++) {
      var item = null;
      for (j = 0; j < sorted.length; j++) {
        if (sorted[j].sym === encText[i]) { item = sorted[j]; break; }
      }
      if (!item) continue;
      bits += item.L;
      encRows.push({ sym: item.sym, L: item.L, code: item.code });
    }
    var fixed = n > 1 ? Math.ceil(Math.log(n) / Math.LN2) : 1;
    steps.push({
      title: 'Кодирование первых ' + encRows.length + ' символов',
      text: 'Вместо каждого символа подставляем его код — получается двоичная ' +
        'строка длиной <b>' + bits + '</b> бит. При равномерном коде ' +
        '(<code>⌈log<sub>2</sub> ' + n + '⌉ = ' + fixed + '</code> бит/символ) ' +
        'потребовалось бы <b>' + fixed * encRows.length + '</b> бит (коэффициент ' +
        '<b>' + (bits ? (fixed * encRows.length / bits).toFixed(3) : '—') + '</b>), ' +
        'а в UTF-8 (16 бит/символ) — <b>' + encRows.length * 16 + '</b> бит ' +
        '(коэффициент <b>' + (bits ? (encRows.length * 16 / bits).toFixed(3) : '—') + '</b>).',
      tags: ['encode'],
      stage: table(encRows, { cols: ['sym', 'L', 'code'] }),
      cap: bits + ' бит вместо ' + fixed * encRows.length
    });

    return steps;
  };
})();
