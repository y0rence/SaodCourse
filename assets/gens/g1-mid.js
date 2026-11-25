/* Генераторы шагов для лабораторных работ 08, 11, 12, 13 (1 семестр).
   Файл подключается в lab.html СТРОКОЙ
     <script src="../../../assets/gens/g1-mid.js"></script>
   ПЕРЕД подключением assets/lab.js. Helpers (Lab.*) используются во время
   вызова steps(), то есть после загрузки lab.js. */
(function () {
  var G = window.LabGen = window.LabGen || {};

  /* склейка опций: extra перезаписывает base */
  function merge(base, extra) {
    var o = {}, k;
    for (k in base) o[k] = base[k];
    if (extra) for (k in extra) o[k] = extra[k];
    return o;
  }

  /* метка указателя над ячейкой (несколько меток через запятую) */
  function ptr(p, k, name) {
    if (k == null || k < 0) return;
    p[k] = p[k] ? p[k] + ', ' + name : name;
  }

  /* ── 08 StructSort: сортировка записей включением по ключу
        «фамилия + имя» и быстрый двоичный поиск (task2_phonebook.c) ── */
  G.structSort = function (ctx) {
    var recs = (ctx && ctx.recs) ? ctx.recs.slice() : [];
    var x = (ctx && ctx.x) ? ctx.x : '';
    var n = recs.length, steps = [], st = Lab.mkCount();
    if (!n) return steps;

    function surVals() { return recs.map(function (r) { return r.last; }); }
    function firVals() { return recs.map(function (r) { return r.first; }); }
    function rowsStage(so, fo) {
      return Lab.rows([
        merge({ label: 'Фамилия', vals: surVals() }, so),
        merge({ label: 'Имя', vals: firVals() }, fo)
      ]);
    }
    function outside(L, R) { return Lab.range(0, L - 1).concat(Lab.range(R + 1, n - 1)); }
    function pair(r) { return r.last + ' ' + r.first; }

    var pairs = recs.map(pair);
    steps.push({
      title: 'Исходный справочник',
      text: 'Ключ записи — «<b>фамилия + имя</b>»: сначала <code>strcmp(last_name)</code>, а при равенстве фамилий — <code>strcmp(first_name)</code>. Записи: <b>' +
        pairs.map(Lab.esc).join(' · ') + '</b>.',
      tags: ['sig'],
      stage: rowsStage(null, null),
      cap: 'n = ' + n, C: 0, M: 0
    });

    for (var i = 1; i < n; i++) {
      var t = recs[i];
      steps.push({
        title: 'Вставляем «' + pair(t) + '»',
        text: 'Отсортированная часть <b>0…' + (i - 1) + '</b>; запись <code>t = «<b>' + Lab.esc(pair(t)) +
          '</b>»</code> взята с позиции <code>i = ' + i + '</code>.',
        tags: ['ins', 'take'],
        stage: rowsStage(
          merge({ box: [i] }, (function () { var p = {}; p[i] = 'i'; return { ptrs: p }; })()),
          { box: [i] }),
        cap: 't = ' + pair(t), C: st.C, M: st.M
      });

      var j = i - 1;
      while (j >= 0) {
        var same = recs[j].last === t.last;
        /* CompareSubscribers: 1 strcmp по фамилиям, при равенстве — ещё 1 по именам */
        Lab.cnt(st, same ? 2 : 1, 0);
        var greater = same ? (recs[j].first > t.first) : (recs[j].last > t.last);
        var cmpTags = ['less', 'scan', 'cmp'];
        if (same) cmpTags.push('cmp2');

        if (!greater) {
          steps.push({
            title: 'Сравнение с «' + pair(recs[j]) + '»',
            text: (same
              ? 'Фамилии совпали — второй <code>strcmp</code> по именам: '
              : 'Сравнение фамилий: ') +
              '<code>CompareSubscribers(t, a[j]) &gt; 0</code> ложно — место найдено, выходим из цикла.',
            tags: cmpTags,
            stage: rowsStage(
              merge({ hl: [j], box: [i] }, (function () { var p = {}; p[i] = 'i'; p[j] = 'j'; return { ptrs: p }; })()),
              { hl: [j], box: [i] }),
            cap: 'вставка после позиции ' + j, C: st.C, M: st.M
          });
          break;
        }

        Lab.cnt(st, 0, 1);
        recs[j + 1] = recs[j];
        steps.push({
          title: 'Сравнение с «' + pair(recs[j]) + '», сдвиг',
          text: '«<b>' + Lab.esc(pair(recs[j])) + '</b>» больше t — запись сдвигается вправо: ' +
            '<code>a[j+1] ← a[j]</code> (M := M + 1).',
          tags: cmpTags.concat(['shift']),
          stage: rowsStage(
            merge({ hl: [j], box: [i] }, (function () { var p = {}; p[i] = 'i'; p[j] = 'j'; return { ptrs: p }; })()),
            { hl: [j], box: [i] }),
          cap: 'a[' + (j + 1) + '] ← a[' + j + ']', C: st.C, M: st.M
        });
        j--;
      }

      var pos = j + 1;
      if (pos !== i) Lab.cnt(st, 0, 1);
      recs[pos] = t;
      steps.push({
        title: '«' + pair(t) + '» на позиции ' + pos,
        text: 'Цикл закончился — <code>a[j+1] ← t</code>. Отсортированная часть теперь <b>0…' + i + '</b>: <b>' +
          recs.slice(0, i + 1).map(pair).map(Lab.esc).join(' · ') + '</b>.',
        tags: ['put'],
        stage: rowsStage({ box: [pos], done: Lab.range(0, i) }, { box: [pos], done: Lab.range(0, i) }),
        cap: 'вставлено', C: st.C, M: st.M
      });
    }

    steps.push({
      title: 'Справочник отсортирован',
      text: 'Порядок по ключу «фамилия + имя»: <b>' + recs.map(pair).map(Lab.esc).join(' · ') +
        '</b>. Всего сравнений <b>C = ' + st.C + '</b>, пересылок записей <b>M = ' + st.M + '</b>.',
      tags: ['done'],
      stage: rowsStage({ done: Lab.range(0, n - 1) }, { done: Lab.range(0, n - 1) }),
      cap: 'сортировка завершена', C: st.C, M: st.M
    });

    /* ── быстрый двоичный поиск по старшей части ключа (фамилии) ── */
    st.C = 0; st.M = 0;
    var L = 0, R = n - 1, found = -1;
    var win0 = {};
    ptr(win0, 0, 'L'); ptr(win0, n - 1, 'R');
    steps.push({
      title: 'Двоичный поиск: «' + x + '»',
      text: 'Счётчики обнулены — так же, как <code>C = 0</code> в начале функции поиска. Окно <code>L = 0, R = ' +
        (n - 1) + '</code>; каждое <code>strcmp</code> увеличивает C.',
      tags: ['bsig'],
      stage: rowsStage({ dim: outside(L, R), ptrs: win0 }, { dim: outside(L, R) }),
      cap: 'окно 0…' + (n - 1), C: 0, M: 0
    });

    while (L < R) {
      var m = Math.floor((L + R) / 2);
      var lp = {};
      ptr(lp, L, 'L'); ptr(lp, R, 'R'); ptr(lp, m, 'm');
      steps.push({
        title: 'Окно [' + L + ', ' + R + '], середина ' + m,
        text: '<code>m = ⌊(L+R)/2⌋ = ' + m + '</code> — сравним <code>strcmp(a[m], «<b>' + Lab.esc(x) +
          '</b>»)</code>, где <code>a[m].Фамилия = «<b>' + Lab.esc(recs[m].last) + '</b>»</code>.',
        tags: ['bloop', 'bmid'],
        stage: rowsStage({ dim: outside(L, R), hl: [m], ptrs: lp }, { dim: outside(L, R), hl: [m] }),
        cap: 'a[m] = ' + pair(recs[m]), C: st.C, M: st.M
      });

      var goRight = recs[m].last < x;
      Lab.cnt(st, 1, 0);
      if (goRight) {
        L = m + 1;
        steps.push({
          title: 'a[m] < X → ищем справа',
          text: 'C++: <code>strcmp(«' + Lab.esc(recs[m].last) + '», «' + Lab.esc(x) +
            '») &lt; 0</code> — фамилия меньше искомой, <code>L := m+1 = ' + L + '</code>.',
          tags: ['bloop', 'bright'],
          stage: (function () {
            var p = {}; ptr(p, L, 'L'); ptr(p, R, 'R');
            return rowsStage({ dim: outside(L, R), ptrs: p }, { dim: outside(L, R) });
          })(),
          cap: 'L = ' + L, C: st.C, M: st.M
        });
      } else {
        R = m;
        steps.push({
          title: 'a[m] ≥ X → ищем слева',
          text: 'C++: <code>strcmp(«' + Lab.esc(recs[m].last) + '», «' + Lab.esc(x) +
            '») ≥ 0</code> — правая граница сдвигается: <code>R := m = ' + R + '</code>.',
          tags: ['bloop', 'bleft'],
          stage: (function () {
            var p = {}; ptr(p, L, 'L'); ptr(p, R, 'R');
            return rowsStage({ dim: outside(L, R), ptrs: p }, { dim: outside(L, R) });
          })(),
          cap: 'R = ' + R, C: st.C, M: st.M
        });
      }
    }

    Lab.cnt(st, 1, 0);
    found = (recs[R] && recs[R].last === x) ? R : -1;
    var homonyms = [];
    if (found >= 0) {
      for (var f = found; f < n && recs[f].last === x; f++) homonyms.push(pair(recs[f]));
    }
    steps.push({
      title: found >= 0 ? 'Найдено: позиция ' + found : 'Не найдено',
      text: found >= 0
        ? 'Цикл закончился (<code>L = R = ' + R + '</code>), последний <code>strcmp</code> = 0: фамилия «<b>' +
          Lab.esc(x) + '</b>» на позиции ' + found + '. Дальше выводятся все однофамильцы: <b>' +
          homonyms.map(Lab.esc).join(' · ') + '</b>. Всего сравнений <b>C = ' + st.C + '</b>.'
        : 'Цикл закончился (<code>L = R = ' + R + '</code>), но <code>strcmp(a[R], X) ≠ 0</code> — фамилии «<b>' +
          Lab.esc(x) + '</b>» в справочнике нет. Всего сравнений <b>C = ' + st.C + '</b>.',
      tags: ['bfound'],
      stage: found >= 0
        ? rowsStage({ box: [found] }, { box: [found] })
        : rowsStage({ dim: Lab.range(0, n - 1) }, { dim: Lab.range(0, n - 1) }),
      cap: found >= 0 ? 'позиция ' + found : 'не найдено', C: st.C, M: st.M
    });

    return steps;
  };

  /* ── 11 StackQueue: операции стека и очереди на одном списке (lists.cpp) ── */
  G.stackQueue = function (nums) {
    var vals = (nums || []).slice();
    var steps = [];
    var stack = [], queue = [];

    function lp(len, headName, tailName) {
      var p = {};
      if (len > 0) {
        p[0] = headName;
        p[len - 1] = tailName;
        if (len === 1) p[0] = headName + ', ' + tailName;
      }
      return p;
    }
    function stackStage(o) {
      return Lab.list(stack.slice(), merge({ label: 'Стек', nil: true, ptrs: lp(stack.length, 'Head', 'Head') }, o));
    }
    function queueStage(o) {
      return Lab.list(queue.slice(), merge({ label: 'Очередь', nil: true, ptrs: lp(queue.length, 'Head', 'Tail') }, o));
    }
    function both(so, qo) {
      return '<div class="rows">' + stackStage(so) + queueStage(qo) + '</div>';
    }

    steps.push({
      title: 'Пустой список',
      text: 'Стек и очередь — один и тот же связный список: у стека только <code>Head</code>, у очереди — ' +
        '<code>Head</code> и <code>Tail</code>. Приём <b>Tail ← @Head</b> (хвост указывает на поле Head) ' +
        'делает пустую очередь частным случаем непустой. Собираем стек из <b>' +
        vals.map(Lab.esc).join(' ') + '</b>.',
      tags: ['sig'],
      stage: both(null, null),
      cap: 'Head = NIL, Tail = NIL'
    });

    /* push в стек — в начало */
    vals.forEach(function (v) {
      stack.unshift(v);
      steps.push({
        title: 'push: ' + v,
        text: '<code>p→Next ← Head;  Head ← p</code> — новый узел <b>' + v +
          '</b> встаёт в <b>начало</b> списка: вставка в голову, O(1). Порядок LIFO.',
        tags: ['push'],
        stage: stackStage({ hl: [0] }),
        cap: 'Head → ' + stack.join(' → ') + ' → NIL'
      });
    });

    /* pop из стека — из начала */
    if (stack.length) {
      var popped = stack.shift();
      steps.push({
        title: 'pop: ' + popped,
        text: '<code>p ← Head;  Head ← p→Next;  освободить память по адресу p</code> — извлечён <b>' + popped +
          '</b>: последний добавленный уходит первым (LIFO). Удаление из головы — O(1).',
        tags: ['pop'],
        stage: stackStage(stack.length ? { hl: [0] } : null),
        cap: stack.length ? 'Head → ' + stack.join(' → ') + ' → NIL' : 'стек пуст'
      });
    }

    /* очередь */
    steps.push({
      title: 'Очередь пуста',
      text: '<code>initQueue</code>: <code>Head = Tail = NIL</code>. Дальше элементы добавляются в конец, ' +
        'берутся из начала (FIFO).',
      tags: ['sig'],
      stage: both(null, null),
      cap: 'Head = Tail = NIL'
    });

    vals.forEach(function (v) {
      var first = queue.length === 0;
      queue.push(v);
      steps.push({
        title: 'enqueue: ' + v,
        text: '<code>p→Next ← NIL</code>; ' +
          (first
            ? '<code>Head ← p</code> — очередь была пуста; '
            : '<code>Tail→Next ← p</code>; ') +
          '<code>Tail ← p</code> — <b>' + v + '</b> добавлен в <b>конец</b>, O(1).',
        tags: ['qpush'],
        stage: queueStage({ hl: [queue.length - 1] }),
        cap: 'Head → ' + queue.join(' → ') + ' → NIL'
      });
    });

    /* dequeue — из начала очереди */
    if (queue.length) {
      var out = queue.shift();
      steps.push({
        title: 'dequeue: ' + out,
        text: '<code>p ← Head;  Head ← p→Next</code> — из начала извлечён <b>' + out +
          '</b> (FIFO: первый добавленный уходит первым). Это та же операция, что pop стека, O(1).',
        tags: ['pop'],
        stage: queueStage(queue.length ? { hl: [0] } : null),
        cap: queue.length ? 'Head → ' + queue.join(' → ') + ' → NIL' : 'очередь пуста'
      });
    }

    /* перемещение элемента из начала в конец без копирования */
    if (queue.length > 1) {
      var headVal = queue[0], tailIdx = queue.length - 1;
      steps.push({
        title: 'Перемещение: Tail→Next ← List',
        text: 'Соединяем хвост очереди с головой списка: <code>Queue.Tail→Next ← List</code>. ' +
          'Меняется один указатель — данные не копируются.',
        tags: ['move'],
        stage: queueStage({ hl: [0, tailIdx] }),
        cap: 'Head = ' + headVal + ', Tail = ' + queue[tailIdx]
      });
      steps.push({
        title: 'Перемещение: Tail ← List',
        text: '<code>Queue.Tail ← List</code> — бывшая голова становится последним элементом очереди. ' +
          'Всего три присваивания указателей.',
        tags: ['move'],
        stage: queueStage({ hl: [0, tailIdx] }),
        cap: 'Tail → ' + headVal
      });
      queue.shift();
      queue.push(headVal);
      steps.push({
        title: 'Перемещение: List ← List→Next',
        text: '<code>List ← List→Next</code> — <b>' + headVal +
          '</b> теперь в конце очереди, данные не переносились и не копировались (0 пересылок данных).',
        tags: ['move'],
        stage: queueStage({ hl: [queue.length - 1] }),
        cap: 'Head → ' + queue.join(' → ') + ' → NIL'
      });
    }

    /* рекурсивная печать */
    steps.push({
      title: 'Рекурсивная печать в прямом порядке',
      text: '<code>Печать(p): IF p ≠ NIL THEN вывод p→Data; Печать(p→Next) FI</code> — обход с головы: <b>' +
        queue.map(Lab.esc).join(' → ') + '</b>.',
      tags: ['rec'],
      stage: queueStage({ done: Lab.range(0, queue.length - 1) }),
      cap: 'прямой порядок'
    });
    steps.push({
      title: 'Рекурсивная печать в обратном порядке',
      text: '<code>ПечатьОбр(p): IF p ≠ NIL THEN ПечатьОбр(p→Next); вывод p→Data FI</code> — сначала рекурсия, ' +
        'вывод при возврате: <b>' + queue.slice().reverse().map(Lab.esc).join(' → ') + '</b>.',
      tags: ['rec'],
      stage: queueStage({ done: Lab.range(0, queue.length - 1) }),
      cap: 'обратный порядок'
    });

    return steps;
  };

  /* ── 12 MergeSort: прямое слияние серий через очереди c0/c1 (merge_sort.cpp).
        Визуализация на массиве-аналоге: списки и очереди описаны в подписях. ── */
  G.mergeSort = function (a0) {
    var data = (a0 || []).slice(), n = data.length, steps = [];
    var st = Lab.mkCount();
    if (!n) return steps;

    function mStage(A, B, c0, c1, o) {
      o = o || {};
      var rows = [];
      if (o.s) rows.push(merge({ label: 'S', vals: o.s, idx: true }, o.sO));
      rows.push(merge({ label: 'a', vals: A, idx: true }, o.a));
      rows.push(merge({ label: 'b', vals: B, idx: true }, o.b));
      if (o.queues) {
        rows.push(merge({ label: 'c0', vals: c0, idx: true }, o.c0));
        rows.push(merge({ label: 'c1', vals: c1, idx: true }, o.c1));
      }
      if (o.note) rows.push({ note: o.note });
      return Lab.rows(rows);
    }

    steps.push({
      title: 'Исходный список S',
      text: 'Сортировка прямым слиянием: <b>' + data.map(Lab.esc).join(' ') +
        '</b>. Сначала расщепление списка через один элемент — переставляются только указатели, данные не копируются.',
      tags: ['sig'],
      stage: Lab.rows([{ label: 'S', vals: data, idx: true }]),
      cap: 'n = ' + n, C: 0, M: 0
    });

    /* расщепление через один элемент: a — чётные позиции, b — нечётные */
    var A = [], B = [];
    for (var i0 = 0; i0 < n; i0++) { if (i0 % 2 === 0) A.push(data[i0]); else B.push(data[i0]); }
    steps.push({
      title: 'Расщепление через один элемент',
      text: '<code>a ← S,  b ← S→Next</code>: в <b>a</b> — элементы с чётных позиций, в <b>b</b> — с нечётных. ' +
        '|a| = ' + A.length + ', |b| = ' + B.length + ', всего n = ' + n + '.',
      tags: ['split'],
      stage: Lab.rows([
        { label: 'S', vals: data, idx: true, dim: Lab.range(0, n - 1) },
        { label: 'a', vals: A, idx: true },
        { label: 'b', vals: B, idx: true }
      ]),
      cap: '|a| = ' + A.length + ', |b| = ' + B.length, C: 0, M: 0
    });

    var p = 1;
    while (p < n) {
      var c0 = [], c1 = [];
      steps.push({
        title: 'Проход p = ' + p,
        text: 'Слияние серий длиной <b>p = ' + p + '</b>: по одной серии из <code>a</code> и <code>b</code> ' +
          'сливаем в очередь <code>c0</code>, следующую пару — в <code>c1</code> (<code>i ← 1 − i</code>). ' +
          'Результат прохода: <code>a ← c0.Head, b ← c1.Head</code>.',
        tags: ['pass'],
        stage: mStage(A, B, c0, c1, { queues: true, note: 'серии по ' + p + ' элемент(ов)' }),
        cap: 'p = ' + p, C: st.C, M: st.M
      });

      var i = 0, m = n;
      while (m > 0) {
        var q = Math.min(p, m); m -= q;
        var r = Math.min(p, m); m -= r;
        var ci = i;
        var dest = (ci === 0) ? c0 : c1;

        while (q > 0 && r > 0) {
          Lab.cnt(st, 1, 0);                       /* Cf++ — сравнение голов серий */
          var va = A[0], vb = B[0], takeA = va <= vb;
          var moved = takeA ? A.shift() : B.shift();
          if (takeA) q--; else r--;
          dest.push(moved);
          Lab.cnt(st, 0, 1);                       /* Mf++ — пересылка в очередь */
          steps.push({
            title: 'Сравнение ' + va + ' и ' + vb + ' → пересылка ' + moved,
            text: '<code>Cf++</code>: «<b>' + Lab.esc(va) + '</b>» ≤ «<b>' + Lab.esc(vb) +
              '</b>» — берём элемент из <code>' + (takeA ? 'a' : 'b') + '</code>. ' +
              '<code>enqueue(c, takeFirst(...))</code>: <b>' + Lab.esc(moved) + '</b> уходит в <code>c' + ci +
              '</code> (Mf++), голова серии ' + (takeA ? 'a' : 'b') + ' сдвигается.',
            tags: ['cmp', 'move'],
            stage: mStage(A, B, c0, c1, {
              queues: true,
              a: takeA ? { hl: [] } : { hl: [0] },
              b: takeA ? { hl: [0] } : { hl: [] },
              c0: ci === 0 ? { hl: [c0.length - 1] } : {},
              c1: ci === 1 ? { hl: [c1.length - 1] } : {},
              note: 'c' + ci + ' ← ' + dest.length + ' элем.'
            }),
            cap: 'c' + ci + ': ' + dest.length + ' из ' + (q + r + dest.length),
            C: st.C, M: st.M
          });
        }

        if (q > 0) {
          var rest = [];
          while (q > 0) { rest.push(A.shift()); q--; }
          Lab.cnt(st, 0, rest.length);
          rest.forEach(function (v) { dest.push(v); });
          steps.push({
            title: 'Остаток серии a → c' + ci,
            text: '<code>DO пока q &gt; 0: переместить из a в c</code> — серия <code>b</code> исчерпана, ' +
              'сравнений не нужно: <b>' + rest.length + '</b> пересылок (Mf += ' + rest.length + ').',
            tags: ['move'],
            stage: mStage(A, B, c0, c1, {
              queues: true,
              c0: ci === 0 ? { hl: [c0.length - 1] } : {},
              c1: ci === 1 ? { hl: [c1.length - 1] } : {},
              note: 'c' + ci + ' ← ' + dest.length + ' элем.'
            }),
            cap: 'c' + ci + ': ' + dest.length, C: st.C, M: st.M
          });
        } else if (r > 0) {
          var restB = [];
          while (r > 0) { restB.push(B.shift()); r--; }
          Lab.cnt(st, 0, restB.length);
          restB.forEach(function (v) { dest.push(v); });
          steps.push({
            title: 'Остаток серии b → c' + ci,
            text: '<code>DO пока r &gt; 0: переместить из b в c</code> — серия <code>a</code> исчерпана: <b>' +
              restB.length + '</b> пересылок (Mf += ' + restB.length + ').',
            tags: ['move'],
            stage: mStage(A, B, c0, c1, {
              queues: true,
              c0: ci === 0 ? { hl: [c0.length - 1] } : {},
              c1: ci === 1 ? { hl: [c1.length - 1] } : {},
              note: 'c' + ci + ' ← ' + dest.length + ' элем.'
            }),
            cap: 'c' + ci + ': ' + dest.length, C: st.C, M: st.M
          });
        }

        i = 1 - i;
      }

      A = c0; B = c1;
      steps.push({
        title: 'Конец прохода p = ' + p,
        text: '<code>c0.Tail→Next ← NIL; c1.Tail→Next ← NIL; a ← c0.Head, b ← c1.Head, p := 2p = ' +
          (p * 2) + '</code>. Теперь серии длиннее — на следующем проходе они сливаются попарно.',
        tags: ['pass'],
        stage: mStage(A, B, [], [], { note: 'новые a и b; p := ' + (p * 2) }),
        cap: 'a = ' + A.length + ', b = ' + B.length + ' элем.', C: st.C, M: st.M
      });
      p = 2 * p;
    }

    steps.push({
      title: 'Готово: список отсортирован',
      text: '<code>c0.Tail→Next ← NIL; S ← c0.Head</code>. Итог: <b>' + A.map(Lab.esc).join(' ') +
        '</b>. Сравнений <b>Cf = ' + st.C + '</b>, пересылок <b>Mf = ' + st.M + '</b> ' +
        '(теория: M = n·⌈log₂n⌉ = ' + (n * Math.ceil(Math.log(n) / Math.log(2))) + ').',
      tags: ['done'],
      stage: Lab.rows([{ label: 'S', vals: A, idx: true, done: Lab.range(0, A.length - 1) }]),
      cap: 'слияние завершено', C: st.C, M: st.M
    });

    return steps;
  };

  /* ── 13 DigitalSort: цифровая сортировка по разрядам, base 10,
        карманы Q0…Q9 (digital_sort.cpp, но m = 10 и десятичные цифры) ── */
  G.digitalSort = function (a0) {
    var nums = (a0 || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    var n = nums.length, steps = [];
    var st = { C: 0, M: 0 };
    if (!n) return steps;

    var maxV = 0;
    nums.forEach(function (v) { maxV = Math.max(maxV, Math.abs(v)); });
    var L = 1, tens = 10;
    while (maxV >= tens) { L++; tens *= 10; }

    function digit(v, j) { return Math.floor(Math.abs(v) / Math.pow(10, j)) % 10; }
    function place(j) {
      return j === 0 ? 'единицы' : j === 1 ? 'десятки' : j === 2 ? 'сотни' : 'разряд 10^' + j;
    }

    steps.push({
      title: 'Исходный список',
      text: 'Цифровая сортировка (RadixSort), основание 10: <b>' + nums.join(' ') + '</b>. ' +
        'Ключ раскладывается по цифрам, поэтому сравнений не будет вообще — только пересылки Mf.',
      tags: ['sig'],
      stage: Lab.rows([{ label: 'S', vals: nums, idx: true }]),
      cap: 'n = ' + n + ', L = ' + L + ' разряд(ов)', C: 0, M: 0
    });

    var cur = nums.slice();
    for (var j = 0; j < L; j++) {
      var digits = cur.map(function (v) { return digit(v, j); });
      steps.push({
        title: 'Проход: разряд «' + place(j) + '»',
        text: 'Разряд ' + (j + 1) + ' из ' + L + ' — от младшего к старшему (в исходнике порядок задаёт ' +
          'массив <code>KDI = {0, 1, 2, 3}</code>). Элементы разложатся по карманам <code>Q0…Q9</code> ' +
          'по <code>d ← p→Digit[j]</code>: <b>' + digits.join(' ') + '</b>.',
        tags: ['pass'],
        stage: (function () {
          var rows = [
            { label: 'S', vals: cur, idx: true },
            { label: 'Цифры', vals: digits },
            { note: 'разряд «' + place(j) + '» из ' + L }
          ];
          return Lab.rows(rows);
        })(),
        cap: 'j = ' + j + ' (' + place(j) + ')', C: st.C, M: st.M
      });

      steps.push({
        title: 'Карманы Q0…Q9 пусты',
        text: '<code>DO i = 0 … m−1: Qᵢ.Tail ← @Qᵢ.Head OD</code> — приём «хвост указывает на голову»: ' +
          'пустой карман обрабатывается как непустой.',
        tags: ['init'],
        stage: Lab.rows([
          { label: 'S', vals: cur, idx: true },
          { note: 'Q0…Q9: Tail ← @Head' }
        ]),
        cap: '10 карманов', C: st.C, M: st.M
      });

      var pockets = [];
      for (var z = 0; z < 10; z++) pockets.push([]);
      var used = {};

      for (var i = 0; i < cur.length; i++) {
        var d = digits[i], v = cur[i];
        pockets[d].push(v);
        used[d] = true;
        st.M++;                                   /* Mf++ в цикле раскладки */
        steps.push({
          title: v + ' → Q' + d,
          text: '<code>d ← p→Digit[' + j + ']</code> = <b>' + d + '</b> (' + place(j) + '). ' +
            '<code>Q' + d + '.Tail→Next ← p;  Q' + d + '.Tail ← p;  p ← p→Next</code> — Mf++.',
          tags: ['dist'],
          stage: (function () {
            var rows = [
              merge({
                label: 'S', vals: cur, idx: true,
                dim: Lab.range(0, i - 1), hl: [i]
              }, (function () { var pp = {}; pp[i] = 'p'; return { ptrs: pp }; })()),
              { label: 'Цифры', vals: digits, dim: Lab.range(0, i - 1), hl: [i] }
            ];
            for (var dd = 0; dd < 10; dd++) {
              if (!used[dd]) continue;
              rows.push({
                label: 'Q' + dd, vals: pockets[dd],
                hl: (dd === d && pockets[dd].length) ? [pockets[dd].length - 1] : []
              });
            }
            rows.push({ note: 'p → ' + cur[i] + ' → Q' + d });
            return Lab.rows(rows);
          })(),
          cap: 'карман Q' + d + ': ' + pockets[d].length + ' элем.', C: st.C, M: st.M
        });
      }

      var next = [], order = [];
      for (var d2 = 0; d2 < 10; d2++) {
        if (used[d2]) { next = next.concat(pockets[d2]); order.push('Q' + d2); }
      }
      steps.push({
        title: 'Склейка карманов: ' + order.join(' → '),
        text: '<code>p ← @S</code> и для <code>i = 0 … m−1</code>: <code>IF Qᵢ.Tail ≠ @Qᵢ.Head THEN ' +
          'p→Next ← Qᵢ.Head; p ← Qᵢ.Tail FI</code>, затем <code>p→Next ← NIL</code>. Новый список: <b>' +
          next.join(' ') + '</b>.',
        tags: ['concat'],
        stage: (function () {
          var rows = [];
          for (var dd = 0; dd < 10; dd++) {
            if (!used[dd]) continue;
            rows.push({ label: 'Q' + dd, vals: pockets[dd], done: Lab.range(0, pockets[dd].length - 1) });
          }
          rows.push({ note: order.join(' → ') });
          rows.push({ label: 'S', vals: next, idx: true });
          return Lab.rows(rows);
        })(),
        cap: 'разряд «' + place(j) + '» обработан', C: st.C, M: st.M
      });

      cur = next;
    }

    steps.push({
      title: 'Готово: список отсортирован',
      text: 'Проходов <b>L = ' + L + '</b>, пересылок <b>Mf = ' + st.M + '</b> (= L·n = ' + (L * n) +
        '), сравнений <b>C = 0</b>. Итог: <b>' + cur.join(' ') + '</b>. Зависимости от упорядоченности нет — ' +
        'ровно L проходов на любых данных.',
      tags: ['done'],
      stage: Lab.rows([{ label: 'S', vals: cur, idx: true, done: Lab.range(0, n - 1) }]),
      cap: 'Mf = ' + st.M + ', C = 0', C: st.C, M: st.M
    });

    return steps;
  };
})();
