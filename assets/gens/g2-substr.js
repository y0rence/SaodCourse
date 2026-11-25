/* Генераторы шагов для работ 2 семестра.
   Подключается ДО assets/lab.js; глобальный Lab (помощники) используется
   только в момент вызова генератора, поэтому при загрузке файла его ещё нет. */
(function () {
  'use strict';

  var G = window.LabGen = window.LabGen || {};

  /* ── 01 Поиск подстроки: прямой перебор + метод Рабина–Карпа
        (substring_search.cpp: bruteForce и rabinKarp, хеш mod 101) ── */
  G.substring = function (ctx) {
    var T = String((ctx && ctx.text) || '');
    var W = String((ctx && ctx.word) || '');
    var n = T.length, m = W.length, steps = [];

    /* байты строки в UTF-8 — в исходнике хеш берётся по (unsigned char) */
    function bytes(s) {
      var out = [], i, c;
      for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        if (c < 128) out.push(c);
        else if (c < 2048) out.push(192 | (c >> 6), 128 | (c & 63));
        else out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
      return out;
    }

    /* hashFunc: h = (h·256 + байт) mod 101, длина len */
    function hashOf(s, from, len) {
      var h = 0, b = bytes(s.substr(from, len)), i;
      for (i = 0; i < b.length; i++) h = (h * 256 + b[i]) % 101;
      return h;
    }

    /* сцена: строка T с окном и текущим сравнением, строка W, заметка */
    function scene(o) {
      o = o || {};
      var items = [
        { label: 'T', vals: T.split(''), idx: true, box: o.box || [], hl: o.tHl || [] },
        { label: 'W', vals: W.split(''), hl: o.wHl || [], done: o.wDone || [] }
      ];
      if (o.note) items.push({ note: o.note });
      return Lab.rows(items);
    }

    if (!n || !m || m > n) {
      steps.push({
        title: 'Нечего искать',
        text: 'Текст пуст, слово пустое или слово длиннее текста — так <code>bruteForce</code> и <code>rabinKarp</code> сразу возвращают <b>−1</b>.',
        tags: ['sig', 'bf', 'loop', 'cmp', 'found'],
        stage: Lab.note('Введите текст и слово не длиннее текста'),
        cap: 'n = ' + n + ', m = ' + m, C: 0
      });
      steps.push({
        title: 'Готово',
        text: 'Результат обоих методов: индекс <b>−1</b>, сравнений <b>0</b>.',
        tags: ['done', 'rk', 'hash'],
        stage: Lab.note('—'), cap: 'пустой ввод', C: 0
      });
      return steps;
    }

    var C = 0, i, j, cBrute, found = -1;

    /* ── фаза 1: прямой перебор (bruteForce) ── */
    steps.push({
      title: 'Искомое слово: «' + W + '»',
      text: 'Прямой перебор: двигаем окно <code>T[i…i+m−1]</code> по тексту и сравниваем символы. ' +
        'Программа увеличивает <code>c</code> на <b>каждом</b> шаге внутреннего цикла — это счётчик <b>C</b>.',
      tags: ['sig', 'bf'],
      stage: scene({}),
      cap: 'n = ' + n + ', m = ' + m, C: 0
    });

    for (i = 0; i <= n - m; i++) {
      steps.push({
        title: 'Сдвиг окна: i = ' + i,
        text: 'Окно <code>' + i + '…' + (i + m - 1) + '</code> — «<b>' + Lab.esc(T.substr(i, m)) +
          '</b>» — сравнивается со словом «<b>' + Lab.esc(W) + '</b>».',
        tags: ['bf', 'loop'],
        stage: scene({ box: Lab.range(i, i + m - 1) }),
        cap: 'окно ' + i + '…' + (i + m - 1), C: C
      });
      j = 0;
      while (j < m) {
        C++;
        var eq = T.charAt(i + j) === W.charAt(j);
        steps.push({
          title: 'Сравнение T[' + (i + j) + '] и W[' + j + ']',
          text: '«<b>' + Lab.esc(T.charAt(i + j)) + '</b>» против «<b>' + Lab.esc(W.charAt(j)) +
            '</b>» — ' + (eq ? 'совпало, <code>j := ' + (j + 1) + '</code>.' : 'не совпало — <code>break</code>, переход к следующему <code>i</code>.') +
            '<span class="note-under">C := C + 1 → C = ' + C + '.</span>',
          tags: ['bf', 'cmp'],
          stage: scene({ box: Lab.range(i, i + m - 1), tHl: [i + j], wHl: [j], wDone: Lab.range(0, j - 1) }),
          cap: 'сравнение №' + C, C: C
        });
        if (!eq) break;
        j++;
      }
      if (j === m) {
        found = i;
        steps.push({
          title: 'Найдено: индекс ' + i,
          text: 'Все ' + m + ' символов совпали — <code>return ' + i + '</code>. Прямой перебор: индекс <b>' +
            i + '</b>, сравнений <b>C = ' + C + '</b>.',
          tags: ['bf', 'found'],
          stage: scene({ box: Lab.range(i, i + m - 1), tHl: Lab.range(i, i + m - 1), wDone: Lab.range(0, m - 1) }),
          cap: 'первое вхождение', C: C
        });
        break;
      }
    }
    if (found < 0) steps.push({
      title: 'Не найдено',
      text: 'Проверены все ' + (n - m + 1) + ' позиций — <code>return −1</code>. Сравнений: <b>C = ' + C + '</b>.',
      tags: ['bf', 'done'],
      stage: scene({}),
      cap: 'индекс −1', C: C
    });
    cBrute = C;

    /* ── фаза 2: метод Рабина–Карпа (rabinKarp), хеш mod 101 ── */
    var hW = hashOf(W, 0, m), hT = hashOf(T, 0, m), found2 = -1;
    steps.push({
      title: 'Рабина–Карп: хеши',
      text: 'Хеш строки: <code>h ← (h·256 + байт) mod 101</code>. H(слова) = <b>' + hW +
        '</b>, H(первого окна) = <b>' + hT + '</b>. Перед вторым методом программа делает <code>c = 0</code> — счётчик <b>C</b> начинается заново.',
      tags: ['rk', 'hash'],
      stage: scene({ box: Lab.range(0, m - 1), note: 'H(W) = ' + hW + ' · H(T[0…' + (m - 1) + ']) = ' + hT }),
      cap: 'mod 101', C: 0
    });
    C = 0;
    for (i = 0; i <= n - m; i++) {
      if (i > 0) hT = hashOf(T, i, m);
      var hit = hT === hW;
      steps.push({
        title: 'Окно ' + i + ': H = ' + hT,
        text: hit
          ? 'Хеши совпали (' + hT + ' = ' + hW + ') — возможна ложная тревога, нужна проверка символов.'
          : 'Хеши различны (' + hT + ' ≠ ' + hW + ') — символьных сравнений не требуется, <code>i := ' + (i + 1) + '</code>.',
        tags: ['rk', 'hash'],
        stage: scene({ box: Lab.range(i, i + m - 1), note: 'H(окна) = ' + hT + ', H(слова) = ' + hW }),
        cap: 'окно ' + i, C: C
      });
      if (hit) {
        var j2 = 0;
        while (j2 < m) {
          C++;
          var eq2 = T.charAt(i + j2) === W.charAt(j2);
          steps.push({
            title: 'Проверка T[' + (i + j2) + '] и W[' + j2 + ']',
            text: 'Хеши совпали, поэтому сравниваем символы: «<b>' + Lab.esc(T.charAt(i + j2)) +
              '</b>» против «<b>' + Lab.esc(W.charAt(j2)) + '</b>» — ' +
              (eq2 ? 'совпало.' : 'не совпало — ложная тревога, <code>break</code>.') +
              '<span class="note-under">C := C + 1 → C = ' + C + '.</span>',
            tags: ['rk', 'cmp'],
            stage: scene({ box: Lab.range(i, i + m - 1), tHl: [i + j2], wHl: [j2], wDone: Lab.range(0, j2 - 1), note: 'H(окна) = ' + hT }),
            cap: 'сравнение №' + C, C: C
          });
          if (!eq2) break;
          j2++;
        }
        if (j2 === m) {
          found2 = i;
          steps.push({
            title: 'Найдено: индекс ' + i,
            text: 'Символы совпали — <code>return ' + i + '</code>. Рабина–Карп: индекс <b>' + i +
              '</b>, сравнений <b>C = ' + C + '</b>.',
            tags: ['rk', 'found'],
            stage: scene({ box: Lab.range(i, i + m - 1), tHl: Lab.range(i, i + m - 1), wDone: Lab.range(0, m - 1), note: 'H(окна) = ' + hT }),
            cap: 'первое вхождение', C: C
          });
          break;
        }
      }
    }
    if (found2 < 0) steps.push({
      title: 'Не найдено',
      text: 'Ни одно окно не дало совпадения — <code>return −1</code>. Сравнений: <b>C = ' + C + '</b>.',
      tags: ['rk', 'done'],
      stage: scene({}),
      cap: 'индекс −1', C: C
    });

    steps.push({
      title: 'Итог: два метода',
      text: 'прямой перебор: индекс <b>' + found + '</b>, сравнений <b>' + cBrute +
        '</b>; метод Рабина–Карпа: индекс <b>' + found2 + '</b>, сравнений <b>' + C + '</b>. ' +
        (C <= cBrute
          ? 'Рабин–Карп сравнивает символы только при совпадении хешей.'
          : 'Окна часто дают одинаковый хеш — символьных сравнений не меньше.'),
      tags: ['done'],
      stage: scene({
        box: found >= 0 ? Lab.range(found, found + m - 1) : [],
        tHl: found >= 0 ? Lab.range(found, found + m - 1) : [],
        wDone: Lab.range(0, m - 1)
      }),
      cap: found === found2 ? 'оба метода дали один индекс ' + found : 'индексы различаются',
      C: C
    });
    return steps;
  };

  /* ── 02 Дерево оптимального поиска (optimal_search.cpp:
        ComputeAW, ComputeAPAR, CreateTree — точный алгоритм, п. 14.2) ── */
  G.optimalTree = function (ctx) {
    var w = ((ctx && ctx.w) || []).filter(function (x) { return typeof x === 'number' && x > 0; });
    var n = w.length, steps = [];
    var keys = [], k;
    for (k = 1; k <= n; k++) keys.push(k);

    if (!n) {
      steps.push({
        title: 'Нет весов',
        text: 'Введите положительные веса через пробел — например <code>60 30 10</code> (пример из пособия).',
        tags: ['sig', 'aw'],
        stage: Lab.note('Веса не заданы'),
        cap: 'n = 0'
      });
      steps.push({
        title: 'Готово',
        text: 'Матрицы AP и AR не вычисляются, дерево не строится.',
        tags: ['ap', 'ar', 'add', 'done', 'check'],
        stage: Lab.note('—'),
        cap: '—'
      });
      return steps;
    }

    var W = [0];
    for (k = 1; k <= n; k++) W[k] = w[k - 1];

    var Aw = [], Ap = [], Ar = [], i, j;
    for (i = 0; i <= n; i++) {
      Aw.push([]); Ap.push([]); Ar.push([]);
      for (j = 0; j <= n; j++) { Aw[i].push(0); Ap[i].push(0); Ar[i].push(0); }
    }

    /* строки матрицы: label = 'AW[i]', значения j = 0…n */
    function matRows(M, label, boxMap, hlMap, unset) {
      var rows = [];
      for (var a = 0; a <= n; a++) {
        var vals = [];
        for (var b = 0; b <= n; b++) {
          vals.push(b < a ? '·' : (unset && b > a && M[a][b] === 0 ? '·' : String(M[a][b])));
        }
        rows.push({
          label: label + '[' + a + ']',
          vals: vals,
          box: (boxMap && boxMap[a]) || [],
          hl: (hlMap && hlMap[a]) || [],
          idx: a === 0
        });
      }
      return rows;
    }

    function sumOf(arr) {
      var s = 0, q;
      for (q = 0; q < arr.length; q++) s += arr[q];
      return s;
    }

    /* шаг 1: веса */
    steps.push({
      title: 'Веса вершин',
      text: 'Ключи <b>1…' + n + '</b>, веса (частоты обращений): <b>' + w.join(', ') + '</b>, Σw = <b>' +
        sumOf(w) + '</b>. Цель — дерево поиска с минимальной средневзвешенной высотой <code>P = Σ wᵢ·hᵢ</code> (корень на уровне 1).',
      tags: ['sig'],
      stage: Lab.rows([
        { label: 'ключи', vals: keys, idx: true },
        { label: 'веса', vals: w, idx: true }
      ]),
      cap: 'n = ' + n
    });

    /* шаг 2: матрица весов AW */
    for (i = 0; i <= n; i++) {
      Aw[i][i] = 0;
      for (j = i + 1; j <= n; j++) Aw[i][j] = Aw[i][j - 1] + W[j];
    }
    steps.push({
      title: 'Матрица весов AW',
      text: '<code>AW[i][j] = AW[i][j−1] + wⱼ</code> — сумма весов вершин интервала <code>(i, j]</code>. ' +
        '<code>AW[0][' + n + '] = ' + Aw[0][n] + '</code> — общий вес всех вершин.',
      tags: ['aw'],
      stage: Lab.rows(matRows(Aw, 'AW')),
      cap: 'веса интервалов'
    });

    /* шаг 3: начальные AP и AR (h = 1) */
    var box1 = {};
    for (i = 0; i <= n - 1; i++) {
      Ap[i][i + 1] = Aw[i][i + 1];
      Ar[i][i + 1] = i + 1;
      box1[i] = [i + 1];
    }
    steps.push({
      title: 'Начальные AP и AR (h = 1)',
      text: 'Интервал из одной вершины: корень единственный, <code>AR[i][i+1] = i+1</code>, <code>AP[i][i+1] = AW[i][i+1]</code>.',
      tags: ['ap', 'ar'],
      stage: Lab.rows(matRows(Ap, 'AP', box1, null, true).concat(matRows(Ar, 'AR', box1, null, true))),
      cap: 'h = 1'
    });

    /* шаги 4…: перебор корней для h = 2…n */
    for (var h = 2; h <= n; h++) {
      for (i = 0; i <= n - h; i++) {
        j = i + h;
        var m0 = Ar[i][j - 1];
        var min = Ap[i][m0 - 1] + Ap[m0][j];
        var lo = m0, hi = Ar[i + 1][j], best = m0;
        for (k = m0 + 1; k <= hi; k++) {
          var x = Ap[i][k - 1] + Ap[k][j];
          if (x < min) { min = x; best = k; }
        }
        Ap[i][j] = min + Aw[i][j];
        Ar[i][j] = best;
        var boxAP = {}, boxAR = {}, hlAR = {};
        boxAP[i] = [j];
        boxAR[i] = [j];
        hlAR[i] = [j - 1];
        hlAR[i + 1] = [j];
        steps.push({
          title: 'Интервал (' + i + ', ' + j + ']',
          text: 'Перебираем корни <code>k</code> от <code>AR[i][j−1] = ' + lo + '</code> до <code>AR[i+1][j] = ' +
            hi + '</code>: лучший <code>k = ' + best + '</code>. <code>AP = min + AW = ' + min + ' + ' +
            Aw[i][j] + ' = ' + Ap[i][j] + '</code>, <code>AR[' + i + '][' + j + '] = ' + best + '</code>.',
          tags: ['ap', 'ar'],
          stage: Lab.rows(matRows(Ap, 'AP', boxAP, null, true).concat(matRows(Ar, 'AR', boxAR, hlAR, true))),
          cap: 'AR[' + i + '][' + j + '] = ' + best
        });
      }
    }

    /* построение дерева по AR (CreateTree) */
    var rootObj = null, prev = null;
    function create(L, R, parent, side) {
      if (L >= R) return;
      var kk = Ar[L][R];
      var node = { v: kk, lab: String(W[kk]) };
      if (parent) parent[side] = node; else rootObj = node;
      if (prev) { delete prev.hl; delete prev.edge; }
      node.hl = 'root';
      node.edge = 'hl';
      steps.push({
        title: 'Добавляем вершину ' + kk,
        text: '<code>AR[' + L + '][' + R + '] = ' + kk + '</code> — корень отрезка <code>[' + L + ', ' + R +
          ']</code>, вес <b>' + W[kk] + '</b>. Левое поддерево — <code>[' + L + ', ' + (kk - 1) +
          ']</code>, правое — <code>[' + kk + ', ' + R + ']</code>.',
        tags: ['add'],
        stage: Lab.tree(rootObj),
        cap: 'ключ ' + kk + ', подпись — вес'
      });
      prev = node;
      create(L, kk - 1, node, 'l');
      create(kk, R, node, 'r');
    }
    create(0, n, null, null);

    /* контроль: AP[0][n] = Σ wᵢ·hᵢ, средневзвешенная высота */
    var P = 0, total = 0, maxLvl = 0;
    (function walk(nd, lvl) {
      if (!nd) return;
      P += W[nd.v] * lvl;
      total += W[nd.v];
      if (lvl > maxLvl) maxLvl = lvl;
      walk(nd.l, lvl + 1);
      walk(nd.r, lvl + 1);
    })(rootObj, 1);
    var avg = P / total, apAvg = Ap[0][n] / Aw[0][n];
    (function mark(nd) {
      if (!nd) return;
      nd.hl = 'ok';
      nd.edge = 'ok';
      mark(nd.l);
      mark(nd.r);
    })(rootObj);
    steps.push({
      title: 'Готово: дерево оптимально',
      text: 'Контроль: <code>AP[0][n] = ' + Ap[0][n] + '</code>, а <code>Σ wᵢ·hᵢ = ' + P + '</code> — ' +
        (Ap[0][n] === P ? '<b>совпало</b>' : '<b>не совпало</b>') +
        '. Средневзвешенная высота <code>AP/AW = ' + apAvg.toFixed(2) + '</code>, по дереву = <b>' +
        avg.toFixed(2) + '</b>, высота дерева = ' + maxLvl + '.',
      tags: ['done', 'check'],
      stage: Lab.tree(rootObj),
      cap: 'Σw = ' + total
    });
    return steps;
  };
})();
