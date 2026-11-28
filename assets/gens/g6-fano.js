/* Генератор шагов для работы 12 «Код Фано» (Fano.cpp).
   Подключается ДО assets/lab.js; глобальный Lab используется только
   в момент вызова генератора, поэтому при загрузке файла его ещё нет. */
(function () {
  'use strict';

  var G = window.LabGen = window.LabGen || {};

  var COLS = [
    ['sym', 'Символ'], ['n', 'n<sub>i</sub>'], ['p', 'P<sub>i</sub>'],
    ['part', 'Часть'], ['code', 'Код'], ['L', 'L<sub>i</sub>']
  ];

  /* таблица: o = {cols, cur, done, group} — строка cur подсвечивается,
     строки до done приглушаются, строки вне group — приглушаются тоже */
  function table(rows, o) {
    o = o || {};
    var cols = o.cols || ['sym', 'n', 'p', 'part', 'code', 'L'];
    var h = '<div class="tablewrap"><table class="cmp"><thead><tr>';
    COLS.forEach(function (c) {
      if (cols.indexOf(c[0]) >= 0) h += '<th>' + c[1] + '</th>';
    });
    h += '</tr></thead><tbody>';
    rows.forEach(function (r, i) {
      var style = '';
      if (o.group && o.group.indexOf(i) < 0) style = ' style="color:var(--mut)"';
      else if (i === o.cur) style = ' style="background:var(--accent-soft)"';
      else if (o.done != null && i < o.done) style = ' style="color:var(--mut)"';
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

  /* медиана как в Fano.cpp: индекс m (L ≤ m < R) с минимальной величиной
     |Σ(L..m) P − Σ(m+1..R) P| — по определению медианы из пособия */
  function med(P, L, R) {
    var m = L, best = -1, i, j;
    for (i = L; i < R; i++) {
      var SL = 0, SR = 0;
      for (j = L; j <= i; j++) SL += P[j];
      for (j = i + 1; j <= R; j++) SR += P[j];
      var diff = Math.abs(SL - SR);
      if (best < 0 || diff < best) { best = diff; m = i; }
    }
    return m;
  }

  /* медиана по алгоритму А2 (MedA2 в Fano.cpp): сумма wes делится пополам */
  function medA2(P, L, R) {
    var wes = 0, summa = 0, i;
    for (i = L; i <= R; i++) wes += P[i];
    for (i = L; i < R; i++) {
      if (summa < wes / 2 && summa + P[i] >= wes / 2) return i;
      summa += P[i];
    }
    return R - 1;
  }

  /* разбиение отрезка [L..R] с медианой m и суммами двух частей */
  function makeSplit(P, L, R, m) {
    var i, SL = 0, SR = 0;
    for (i = L; i <= m; i++) SL += P[i];
    for (i = m + 1; i <= R; i++) SR += P[i];
    return { L: L, R: R, m: m, SL: SL, SR: SR, depth: 0 };
  }

  /* все разбиения дерева Фано: сначала корень, затем по уровням (BFS) */
  function collectSplits(P, L, R, depth, out) {
    if (L >= R) return;
    var s = makeSplit(P, L, R, med(P, L, R));
    s.depth = depth;
    out.push(s);
    collectSplits(P, L, s.m, depth + 1, out);
    collectSplits(P, s.m + 1, R, depth + 1, out);
  }

  /* коды из списка разбиений: каждое разбиение дописывает бит своим строкам */
  function applySplits(n, splits) {
    var codes = [], i;
    for (i = 0; i < n; i++) codes[i] = '';
    splits.forEach(function (s) {
      for (i = s.L; i <= s.R; i++) codes[i] += (i <= s.m ? '0' : '1');
    });
    return codes;
  }

  /* ── 12 Код Фано (Fano.cpp: частоты → P → сортировка → Med → коды) ── */
  G.fano = function (text) {
    text = String(text || '');
    var N = text.length, steps = [], freq = [], i, k, q;

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

    /* вероятности в массиве с индексами 1..n, как в Fano.cpp */
    var P = [0];
    sorted.forEach(function (r) { P.push(r.p); });

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
      text: 'Список для деления должен идти по убыванию вероятностей: ' +
        'в программе — пузырьком, символы едут вместе с вероятностью.',
      tags: ['sort'],
      stage: table(sorted, { cols: ['sym', 'n', 'p'], cur: 0 }),
      cap: 'P_1 ≥ P_2 ≥ … ≥ P_n'
    });

    /* 5+. разбиения по уровням: корень, затем вершины уровня */
    var splits = [];
    collectSplits(P, 1, n, 0, splits);
    var byDepth = splits.slice().sort(function (a, b) {
      return a.depth - b.depth || a.L - b.L;
    });
    var show = Math.min(byDepth.length, 8);
    var partial = [];                    /* коды, накопленные к показанному шагу */
    for (i = 0; i < n; i++) partial[i] = '';

    if (show === 0) {
      /* один символ в алфавите — делить нечего */
      steps.push({
        title: 'Деление не требуется',
        text: 'В алфавите один символ — дерево Фано состоит из корня, ' +
          'ему достаточно одного разряда.',
        tags: ['med', 'split'],
        stage: table([{ sym: sorted[0].sym, p: sorted[0].pd, code: '0', L: 1 }],
          { cols: ['sym', 'p', 'code', 'L'] }),
        cap: 'n = 1'
      });
    }

    for (i = 0; i < show; i++) {
      (function (idx) {
        var s = byDepth[idx];
        var prefix = partial[s.L - 1];           /* префикс отрезка до разбиения */
        var group = [], inGroup;
        for (var pos = s.L; pos <= s.R; pos++) group.push(pos - 1);
        /* дописываем биты показанного разбиения */
        for (var t = s.L; t <= s.R; t++) partial[t - 1] += (t <= s.m ? '0' : '1');
        var rows = sorted.map(function (row, r) {
          inGroup = r + 1 >= s.L && r + 1 <= s.R;
          return {
            sym: row.sym, p: row.pd,
            part: inGroup ? (r + 1 <= s.m ? '0' : '1') : '',
            code: partial[r]
          };
        });
        steps.push({
          title: idx === 0 ? 'Корневое разбиение: медиана'
            : 'Разбиение отрезка [' + s.L + '…' + s.R + '] — код «' + prefix + '»',
          text: 'Функция <code>Med(L,R)</code> находит индекс <b>m = ' + s.m +
            '</b>, для которого величина |Σ<sub>лево</sub> − Σ<sub>право</sub>| минимальна: ' +
            'сумма левой части — <b>' + s.SL.toFixed(4) + '</b>, правой — <b>' +
            s.SR.toFixed(4) + '</b>. Буквам первой части приписывается бит <b>0</b>, ' +
            'второй — <b>1</b>, затем деление повторяется для каждой части.',
          tags: idx === 0 ? ['med'] : ['split'],
          stage: table(rows, { cols: ['sym', 'p', 'part', 'code'], group: group }),
          cap: (s.m - s.L + 1) + ' симв. → 0, ' + (s.R - s.m) + ' симв. → 1' +
            (idx === show - 1 && byDepth.length > show
              ? ' · …всего разбиений ' + byDepth.length : '')
        });
      })(i);
    }

    /* финальная таблица кодов */
    var codes = applySplits(n, splits);
    var codeRows = sorted.map(function (row, pos) {
      return { sym: row.sym, n: row.n, p: row.pd, code: codes[pos], L: codes[pos].length };
    });
    steps.push({
      title: 'Кодовая таблица кода Фано',
      text: 'Каждый символ получил кодовое слово — путь от корня к листу: ' +
        'биты 0 и 1, записанные по уровням дерева. Код префиксный: ни одно ' +
        'слово не является началом другого.',
      tags: ['split'],
      stage: table(codeRows, { cols: ['sym', 'p', 'code', 'L'] }),
      cap: 'префиксный код, ' + n + ' слов'
    });

    /* статистика: Крафт, энтропия, средняя длина, избыточность */
    var kraft = 0, H = 0, Lcp = 0;
    sorted.forEach(function (r, pos) {
      var L = codes[pos].length;
      kraft += Math.pow(2, -L);
      H += -r.p * Math.log(r.p) / Math.LN2;
      Lcp += r.p * L;
    });
    var R = Lcp - H;
    steps.push({
      title: 'Крафт, энтропия, избыточность',
      text: 'Сумма <code>2<sup>−L</sup></code> не превышает 1 — код префиксный. ' +
        'Средняя длина <b>Lcp</b> сравнивается с энтропией <b>H</b>: разница ' +
        '<b>R = Lcp − H</b> — избыточность, для кода Фано по теории <b>Lcp &lt; H + 1</b>.',
      tags: ['stats'],
      stage: kv([
        ['Неравенство Крафта', kraft.toFixed(4) + (kraft <= 1 + 1e-9 ? ' ≤ 1 — выполняется' : ' > 1!')],
        ['Энтропия H', H.toFixed(4) + ' бит'],
        ['Средняя длина Lcp', Lcp.toFixed(4) + ' бит'],
        ['Избыточность R = Lcp − H', R.toFixed(4)]
      ]),
      cap: 'Lcp < H + 1'
    });

    /* задание 4: вариант кода Фано с медианой алгоритма А2 */
    var m2 = medA2(P, 1, n);
    var s2 = makeSplit(P, 1, n, m2);
    var rows2 = sorted.map(function (row, pos) {
      return { sym: row.sym, p: row.pd, part: pos + 1 <= m2 ? '0' : '1', code: '' };
    });
    steps.push({
      title: 'Задание 4: медиана алгоритма А2',
      text: 'Вместо <code>Med</code> используется медиана из алгоритма А2: ' +
        'сумма весов отрезка <code>wes</code> делится пополам — выбирается индекс ' +
        '<b>m = ' + m2 + '</b>, у которого сумма элементов слева меньше <code>wes/2</code>, ' +
        'а вместе с <code>P[m]</code> — не меньше. Корневое разбиение отличается ' +
        'от разбиения по медиане Фано.',
      tags: ['a2'],
      stage: table(rows2, { cols: ['sym', 'p', 'part'] }),
      cap: 'wes = ' + (s2.SL + s2.SR).toFixed(4) + ', wes/2 = ' + ((s2.SL + s2.SR) / 2).toFixed(4)
    });

    /* длины и показатели для варианта А2 — тем же рекурсивным построением */
    var splits2 = [];
    (function rec(L, R) {
      if (L >= R) return;
      var m = medA2(P, L, R);
      splits2.push(makeSplit(P, L, R, m));
      rec(L, m);
      rec(m + 1, R);
    })(1, n);
    var codes2 = applySplits(n, splits2);
    var kraft2 = 0, Lcp2 = 0;
    sorted.forEach(function (r, pos) {
      var L = codes2[pos].length;
      kraft2 += Math.pow(2, -L);
      Lcp2 += r.p * L;
    });
    steps.push({
      title: 'Таблица п.3 для варианта А2',
      text: 'Для варианта кода Фано с медианой А2 считаются те же показатели: ' +
        'неравенство Крафта, энтропия (она не меняется), средняя длина ' +
        'кодового слова и избыточность.',
      tags: ['a2', 'stats'],
      stage: kv([
        ['Неравенство Крафта', kraft2.toFixed(4) + (kraft2 <= 1 + 1e-9 ? ' ≤ 1 — выполняется' : ' > 1!')],
        ['Энтропия H', H.toFixed(4) + ' бит'],
        ['Средняя длина Lcp', Lcp2.toFixed(4) + ' бит'],
        ['Избыточность R = Lcp − H', (Lcp2 - H).toFixed(4)]
      ]),
      cap: 'вариант с медианой А2'
    });

    return steps;
  };
})();
