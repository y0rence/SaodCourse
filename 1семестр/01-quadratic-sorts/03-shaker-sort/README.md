# 03. Шейкерная сортировка (`ShakerSort`)

> **Интерактивная страница:** [lab.html](lab.html) — пошаговый проигрыватель с подсветкой кода (псевдокод ↔ исходный файл).

| Файл | Назначение |
|---|---|
| `shaker_sort.c` | ShakerSort, BubbleSort, SelectSort, таблица и график (CSFML) |
| `shaker_sort_sfml.cpp` | та же работа на C++ с графиком на SFML 3 |

**Сборка:**

```bash
clang -I/opt/homebrew/include shaker_sort.c -o shaker_sort \
    -L/opt/homebrew/lib -lcsfml-graphics -lcsfml-window -lcsfml-system -lm && ./shaker_sort
```

## Задание

1. Для 8 первых символов ФИО выполнить шейкерную сортировку вручную.
2. Написать шейкерную сортировку массива целых чисел по возрастанию; проверить контрольной суммой и числом серий; считать `Мф` и `Сф`.
3. Сравнить работу метода на убывающих, возрастающих и случайных массивах.
4. Составить таблицу трудоёмкости пузырьковой и шейкерной сортировок для `N = 100 … 500`.
5\*. Построить в одной системе координат графики `Мф + Сф` для прямого выбора, пузырьковой и шейкерной сортировок.

## Псевдокод

```
L ← 1,  R ← n,  k ← n
DO
    DO j = R … L+1:  IF aⱼ < aⱼ₋₁ THEN aⱼ ↔ aⱼ₋₁, k ← j OD
    L ← k
    DO j = L … R−1:  IF aⱼ > aⱼ₊₁ THEN aⱼ ↔ aⱼ₊₁, k ← j OD
    R ← k
OD пока L < R
```

Два улучшения пузырька: границы рабочей части ставятся в **место последнего обмена**, а проходы **чередуются** справа налево и слева направо.

## Трудоёмкость

| Величина | Минимум (возрастающий) | Максимум (убывающий) |
|---|:---:|:---:|
| Сравнения `C` | `n − 1` | `(n² − n)/2` |
| Пересылки `M` | `0` | `3(n² − n)/2` |

Средняя трудоёмкость `O(n²)`, но сравнений меньше, чем у пузырьковой сортировки.

**Зависимость от упорядоченности: сильная** — и по `C`, и по `M`. На упорядоченном массиве достаточно одного прохода.

**Устойчивость:** устойчивая.

## Проверка правильности

- **Контрольная сумма.** Сумма элементов до и после сортировки должна совпадать: иначе элементы потерялись.
- **Число серий.** Серия — неубывающий участок. У массива, упорядоченного по возрастанию, ровно одна серия.
- **Счётчики `Мф` и `Сф`** сравниваются с теоретическими оценками на убывающем, случайном и возрастающем массивах.

## Как скомпилировать каждый файл

Команды для каждого исходника. Имя исполняемого файла совпадает с именем исходника.

### `shaker_sort.c`

Библиотеки не нужны, только компилятор.

**macOS** (clang):

```bash
clang -std=c11 -Wall -o shaker_sort shaker_sort.c -lm && ./shaker_sort
```

**Linux** (gcc / g++):

```bash
gcc -std=c11 -Wall -o shaker_sort shaker_sort.c -lm && ./shaker_sort
```

**Windows** (MinGW-w64, в терминале MSYS2 или PowerShell с g++ в PATH):

```bash
gcc -std=c11 -Wall -o shaker_sort.exe shaker_sort.c -lm
```

### `shaker_sort_sfml.cpp`

Нужна библиотека **SFML 3** (см. [INSTALL](../../../INSTALL.html)).

**macOS** (clang):

```bash
clang++ -std=c++17 -I/opt/homebrew/include -L/opt/homebrew/lib -o shaker_sort_sfml shaker_sort_sfml.cpp -lsfml-graphics -lsfml-window -lsfml-system && ./shaker_sort_sfml
```

**Linux** (gcc / g++):

```bash
g++ -std=c++17 -o shaker_sort_sfml shaker_sort_sfml.cpp -lsfml-graphics -lsfml-window -lsfml-system && ./shaker_sort_sfml
```

**Windows** (MinGW-w64, в терминале MSYS2 или PowerShell с g++ в PATH):

```bash
g++ -std=c++17 -o shaker_sort_sfml.exe shaker_sort_sfml.cpp -lsfml-graphics -lsfml-window -lsfml-system
```

