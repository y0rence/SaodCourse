#!/usr/bin/env python3
# Проверка корректности кода Шеннона: инварианты + обратное декодирование.
import subprocess, math, re, sys, os

DIR = os.path.dirname(os.path.abspath(__file__))
EXE = os.path.join(DIR, "Shennon")
FAIL = []

def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (("  -> " + str(extra)) if extra and not ok else ""))
    if not ok:
        FAIL.append(name)

def run(path=None):
    p = subprocess.run([EXE] + ([path] if path else []),
                       capture_output=True, text=True, cwd=DIR)
    assert p.returncode == 0, f"exit code {p.returncode}"
    return p.stdout

def parse(out):
    N = int(re.search(r"Всего символов N = (\d+)", out).group(1))
    rows = []
    lines = out.splitlines()
    i = next(k for k, l in enumerate(lines) if l.startswith("Символ"))
    for l in lines[i + 1:]:
        if l.startswith("Задание 3"):
            break
        f = l.split()
        if not f:
            continue
        rows.append(dict(sym=f[0], cnt=int(f[1]), p=float(f[2]), code=f[3], L=int(f[4])))
    g = lambda key: float(re.search(key + r": ([\d.eE+-]+)", out).group(1))
    return N, rows, dict(kraft=g("Неравенство Крафта"), H=g("Энтропия"),
                         Lavg=g("Средняя длина"), R=g("Избыточность"),
                         sP=float(re.search(r"Сумма вероятностей: ([\d.eE+-]+)", out).group(1)),
                         bits=int(re.search(r"Длина закодированной строки: (\d+)", out).group(1)),
                         enc=out.split("Закодированная строка:\n")[1].split("\n")[0])

def cyr_chars(path):
    txt = open(path, encoding="utf-8").read()
    # U+0400..U+047F — ровно те символы, что читает read_utf8 (байты 0xD0/0xD1)
    return [c for c in txt if 0x0400 <= ord(c) <= 0x047F]

for path in ["proizvedenie_11kb.txt", "proizvedenie_2kb.txt", "code_artifact.txt"]:
    print(f"\n=== {path} ===")
    out = run(path)
    N, rows, m = parse(out)

    # 1. частоты: сумма n_i = N, сумма P_i = 1
    check("сумма n_i = N", sum(r["cnt"] for r in rows) == N,
          f'{sum(r["cnt"] for r in rows)} vs {N}')
    check("сумма P_i = 1", abs(sum(r["p"] for r in rows) - 1) < 1e-5,
          sum(r["p"] for r in rows))
    check("напечатанная сумма вероятностей = 1", abs(m["sP"] - 1) < 1e-9, m["sP"])
    check("вывод печатает 'Сумма вероятностей: 1 (равна 1)'", "(равна 1)" in out, m["sP"])
    check("N = число кириллических букв файла", N == len(cyr_chars(DIR + "/" + path)),
          f'{N} vs {len(cyr_chars(DIR + "/" + path))}')

    # 2. длина L_i = ceil(-log2 p_i) (пособие, п. 16.5)
    bad = [r for r in rows if r["L"] != math.ceil(-math.log2(r["p"]) - 1e-12)]
    check("L_i = ceil(-log2 p_i)", not bad, bad[:3])

    # 3. Крафт, энтропия, средняя длина, избыточность
    kraft = sum(2 ** -r["L"] for r in rows)
    H = -sum(r["p"] * math.log2(r["p"]) for r in rows)
    Lavg = sum(r["p"] * r["L"] for r in rows)
    check("Крафт <= 1", kraft <= 1 + 1e-9, kraft)
    check("Крафт совпадает с выводом", abs(kraft - m["kraft"]) < 1e-5, (kraft, m["kraft"]))
    check("H совпадает с выводом", abs(H - m["H"]) < 1e-5, (H, m["H"]))
    check("Lcp совпадает с выводом", abs(Lavg - m["Lavg"]) < 1e-5, (Lavg, m["Lavg"]))
    check("Lcp < H + 1 (пособие)", Lavg < H + 1, (Lavg, H + 1))
    check("избыточность r = Lcp - H: 0 <= r < 1",
          0 <= m["R"] < 1 and abs(m["R"] - (Lavg - H)) < 1e-6, m["R"])

    # 4. префиксность: ни один код не является префиксом другого
    codes = [r["code"] for r in rows]
    pref = [(a, b) for i, a in enumerate(codes) for b in codes[i + 1:]
            if b.startswith(a) or a.startswith(b)]
    check("коды префиксные", not pref, pref[:3])
    check("коды уникальны", len(set(codes)) == len(codes))

    # 5. обратное декодирование первых 100 символов
    orig = cyr_chars(DIR + "/" + path)[:100]
    table = {r["code"]: r["sym"] for r in rows}
    dec, cur = [], ""
    for bit in m["enc"]:
        cur += bit
        if cur in table:
            dec.append(table[cur])
            cur = ""
    check("декодирование вернуло исходные 100 символов",
          dec == orig and cur == "",
          f"{''.join(dec[:20])}... vs {''.join(orig[:20])}...")
    check("нет '---' в выводе", "---" not in out)

print("\n" + ("ВСЁ ХОРОШО, ошибок: 0" if not FAIL else f"ОШИБКИ ({len(FAIL)}): " + ", ".join(FAIL)))
sys.exit(1 if FAIL else 0)
