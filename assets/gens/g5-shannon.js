/* Генератор шагов для работы 11 «Код Шеннона» (Shennon.cpp).
   Подключается ДО assets/lab.js; глобальный Lab (помощники) используется
   только в момент вызова генератора, поэтому при загрузке файла его ещё нет. */
(function () {
  'use strict';

  var G = window.LabGen = window.LabGen || {};

  var COLS = [
    ['sym', 'Символ'], ['n', 'n<sub>i</sub>'], ['p', 'P<sub>i</sub>'],
    ['q', 'Q<sub>i</sub>'], ['L', 'L<sub>i</sub>'], ['code', 'Код']
  ];

  /* таблица кодов: o = {cols, cur, done} — строка cur подсвечивается,
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

  /* ── 11 Код Шеннона (Shennon.cpp: частоты → P → сортировка → Q → L → коды) ── */
  G.shannon = function (text) {
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

    /* P_i = n_i / N для каждого символа (до сортировки, порядок не важен) */
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

    /* Q_i = Q_{i-1} + P_i, L_i = ceil(-log2 P_i), код — разряды из Q_{i-1} */
    var Q = 0;
    sorted.forEach(function (r) {
      r.q = Q;
      Q += r.p;
      var L = 1;
      while (r.p < Math.pow(2, -L)) L++;
      r.L = Math.min(L, 64);
      var x = r.q, bits = '';
      for (var j = 0; j < r.L; j++) {
        x *= 2;
        var bit = x >= 1 ? 1 : 0;
        bits += bit;
        if (bit) x -= 1;
      }
      r.code = bits;
      r.qd = r.q.toFixed(4);
    });

    /* 1. вход: сколько символов и сколько различных */
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
      text: 'Кодовые слова строятся от самого частого символа к самому редкому: ' +
        'вероятности сортируются по убыванию (в программе — пузырьком).',
      tags: ['sort'],
      stage: table(sorted, { cols: ['sym', 'n', 'p'], cur: 0 }),
      cap: 'P_1 ≥ P_2 ≥ … ≥ P_n'
    });

    /* 5. накопленная вероятность */
    steps.push({
      title: 'Накопленная вероятность Q_i',
      text: '<code>Q<sub>i</sub> = Q<sub>i−1</sub> + P<sub>i</sub></code> при ' +
        '<code>Q<sub>0</sub> = 0</code> — левая граница участка символа на отрезке [0; 1): ' +
        'именно из неё берутся разряды кода.',
      tags: ['q'],
      stage: table(sorted, { cols: ['sym', 'p', 'q'] }),
      cap: 'Q растёт от 0 до 1'
    });

    /* 6. длины кодовых слов */
    steps.push({
      title: 'Длины кодовых слов L_i',
      text: 'По условию пособия <code>1/2<sup>L</sup> ≤ P<sub>i</sub> &lt; 1/2<sup>L−1</sup></code>, ' +
        'то есть <code>L<sub>i</sub> = ⌈−log<sub>2</sub> P<sub>i</sub>⌉</code>. ' +
        'Отсюда следует <b>Lcp &lt; H + 1</b>.',
      tags: ['len'],
      stage: table(sorted, { cols: ['sym', 'p', 'L'] }),
      cap: 'L = ⌈−log2 P⌉'
    });

    /* 7. разряды кода: по шагу на символ (показываем первые 8) */
    var showBits = Math.min(n, 8);
    for (i = 0; i < showBits; i++) {
      (function (idx) {
        var r = sorted[idx], x = r.q, chain = [], j;
        for (j = 0; j < r.L; j++) {
          var before = x;
          x *= 2;
          var bit = x >= 1 ? 1 : 0;
          if (bit) x -= 1;
          chain.push(before.toFixed(3) + '·2 = ' + (bit ? '1 + ' + x.toFixed(3) : x.toFixed(3)) +
            ' → бит ' + bit);
        }
        var rows = sorted.map(function (row, pos) {
          return { sym: row.sym, p: row.pd, q: row.qd, L: row.L, code: pos <= idx ? row.code : '' };
        });
        steps.push({
          title: 'Код «' + r.sym + '» — ' + r.L + ' бит',
          text: 'Разряды берутся из <code>Q<sub>' + idx + '</sub></code> = <b>' + r.qd +
            '</b>: на каждом шаге <code>X ← 2X</code>, целая часть становится битом. ' +
            (n > showBits && idx === showBits - 1 ? 'Остальные символы считаются так же. ' : '') +
            'Цепочка: ' + chain.join('; ') + '.',
          tags: ['bits'],
          stage: table(rows, { cols: ['sym', 'q', 'L', 'code'], cur: idx }),
          cap: 'C' + (idx + 1) + ' = ' + r.code
        });
      })(i);
    }

    /* 8. Крафт, энтропия, средняя длина, избыточность */
    var kraft = 0, H = 0, Lcp = 0;
    sorted.forEach(function (r) {
      kraft += Math.pow(2, -r.L);
      H += -r.p * Math.log(r.p) / Math.LN2;
      Lcp += r.p * r.L;
    });
    var R = Lcp - H;
    steps.push({
      title: 'Крафт, энтропия, избыточность',
      text: 'Сумма <code>2<sup>−L</sup></code> не превышает 1 — код префиксный, его можно ' +
        'однозначно декодировать. Средняя длина <b>Lcp</b> сравнивается с энтропией <b>H</b>: ' +
        'разница <b>R = Lcp − H</b> — избыточность, по теории <b>0 ≤ R &lt; 1</b>.',
      tags: ['stats'],
      stage: kv([
        ['Неравенство Крафта', kraft.toFixed(4) + ' ≤ 1'],
        ['Энтропия H', H.toFixed(4) + ' бит'],
        ['Средняя длина Lcp', Lcp.toFixed(4) + ' бит'],
        ['Избыточность R = Lcp − H', R.toFixed(4)]
      ]),
      cap: 'Lcp < H + 1'
    });

    /* 9. кодирование: подставляем коды вместо символов */
    var bySym = {};
    sorted.forEach(function (r) { bySym[r.sym] = r; });
    var encText = text.slice(0, 12), encRows = [], bits = 0;
    for (i = 0; i < encText.length; i++) {
      var item = bySym[encText[i]];
      if (!item) continue;
      bits += item.L;
      encRows.push({ sym: item.sym, L: item.L, code: item.code });
    }
    var fixed = n > 1 ? Math.ceil(Math.log(n) / Math.LN2) : 1;
    steps.push({
      title: 'Кодирование первых ' + encText.length + ' символов',
      text: 'Вместо каждого символа подставляем его код — получается двоичная строка длиной ' +
        '<b>' + bits + '</b> бит. При равномерном коде (<code>⌈log<sub>2</sub> ' + n +
        '⌉ = ' + fixed + '</code> бит/символ) потребовалось бы <b>' + fixed * encText.length +
        '</b> бит, коэффициент сжатия — <b>' +
        (bits ? (fixed * encText.length / bits).toFixed(3) : '—') + '</b>.',
      tags: ['encode'],
      stage: table(encRows, { cols: ['sym', 'L', 'code'] }),
      cap: bits + ' бит вместо ' + fixed * encText.length
    });

    return steps;
  };
})();
