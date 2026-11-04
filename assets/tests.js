(function () {
  var LEVELS = { 1: "Базовый", 2: "Средний", 3: "Сложный" };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // questions: [{q, opts:[...], a: index, lvl: 1|2|3, src}] — sorted from basic to hard
  function renderQuiz(mount, questions) {
    var qs = questions.slice().sort(function (x, y) { return x.lvl - y.lvl; });
    var html = ['<div class="summary" id="score-box">' +
      '<div class="stat"><strong id="score">0</strong><span>правильных ответов</span></div>' +
      '<div class="stat"><strong>' + qs.length + '</strong><span>вопросов</span></div>' +
      '<div class="stat"><strong id="pct">0%</strong><span>результат</span></div></div>'];
    html.push('<div class="toolbar"><button class="pill" id="check-btn" type="button">Проверить все ответы</button>' +
      '<button class="pill" id="reset-btn" type="button">Сбросить</button></div>');
    html.push('<div id="banner" class="banner">Выберите ответ на каждый вопрос и нажмите «Проверить все ответы».</div>');
    qs.forEach(function (item, i) {
      html.push('<article class="qa quiz" data-index="' + i + '">' +
        '<div class="q"><span class="num">' + (i + 1) + '.</span> ' + esc(item.q) +
        ' <span class="pill" style="font-size:.75rem;padding:2px 8px">' + LEVELS[item.lvl] + '</span></div>' +
        '<div class="opts">' + item.opts.map(function (o, k) {
          return '<label class="opt"><input type="radio" name="q' + i + '" value="' + k + '"> ' + esc(o) + '</label>';
        }).join("") + '</div>' +
        '<p class="src result"></p></article>');
    });
    mount.innerHTML = html.join("\n");

    function check() {
      var correct = 0, answered = 0;
      qs.forEach(function (item, i) {
        var card = mount.querySelector('[data-index="' + i + '"]');
        var chosen = card.querySelector('input:checked');
        var labels = card.querySelectorAll("label.opt");
        labels.forEach(function (l, k) {
          l.classList.remove("right", "wrong");
          if (k === item.a) l.classList.add("right");
        });
        var res = card.querySelector(".result");
        if (!chosen) { res.textContent = "Ответ не выбран."; card.classList.remove("pass", "fail"); return; }
        answered++;
        var ok = Number(chosen.value) === item.a;
        if (ok) correct++;
        else labels[Number(chosen.value)].classList.add("wrong");
        card.classList.toggle("pass", ok);
        card.classList.toggle("fail", !ok);
        res.textContent = (ok ? "Верно. " : "Неверно. ") + (item.src ? "Источник: " + item.src : "") +
          (item.hint && !ok ? " Подсказка: " + item.hint : "");
      });
      document.getElementById("score").textContent = correct;
      document.getElementById("pct").textContent = Math.round(100 * correct / qs.length) + "%";
      var b = document.getElementById("banner");
      if (answered < qs.length) {
        b.className = "banner"; b.textContent = "Отвечено " + answered + " из " + qs.length + ". Ответьте на все вопросы для итога.";
      } else {
        b.className = "banner " + (correct === qs.length ? "ok" : "bad");
        b.textContent = "Итог: " + correct + " из " + qs.length + (correct === qs.length ? " — отлично!" : " — перечитайте теорию и псевдокод.");
      }
    }
    document.getElementById("check-btn").addEventListener("click", check);
    document.getElementById("reset-btn").addEventListener("click", function () {
      mount.querySelectorAll("input").forEach(function (x) { x.checked = false; });
      mount.querySelectorAll(".qa.quiz").forEach(function (c) { c.classList.remove("pass", "fail"); c.querySelector(".result").textContent = ""; });
      mount.querySelectorAll("label.opt").forEach(function (l) { l.classList.remove("right", "wrong"); });
      document.getElementById("score").textContent = "0";
      document.getElementById("pct").textContent = "0%";
      var b = document.getElementById("banner");
      b.className = "banner"; b.textContent = "Выберите ответ на каждый вопрос и нажмите «Проверить все ответы».";
    });
  }

  window.renderQuiz = renderQuiz;
  window.esc = esc;
})();
