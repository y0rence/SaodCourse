# 02. Дерево оптимального поиска (`OptimalSearch`)

📘 **Теория:** [THEORY.md](THEORY.md)

📝 **Ответы и тесты:** [ответы на вопросы (QA.md)](QA.md) · [тесты (TESTS.md)](TESTS.md)

| Файл | Назначение |
|---|---|
| `optimal_search.cpp` | точный алгоритм построения ДОП: матрицы AW, AP, AR, дерево по AR, обход, таблица |

**Сборка и запуск:**

```bash
g++ -Wall -o optimal_search optimal_search.cpp && ./optimal_search
```

Windows (MinGW):

```bash
g++ -Wall -o optimal_search.exe optimal_search.cpp
optimal_search.exe
```

## Что делает программа

1. **Тест 1** — пример из пособия (веса 60, 30, 10): печатает матрицы AW, AP, AR, обход и среднюю высоту (должно получиться 1.50).
2. **Задание 3** — 100 вершин, случайные веса 1..100 (`srand(2024)`, результат повторяется). Печатает обход слева направо и сравнивает `AP[0][n] / AW[0][n]` со средневзвешенной высотой построенного дерева.
3. **Задание 4** — таблица: размер, контрольная сумма (сумма ключей), высота, средневзвешенная высота.

Другие веса: замените `2024` в `srand(2024)` на другое число или на `time(NULL)` (добавьте `#include <time.h>`).

## 🧩 Как скомпилировать каждый файл

Команды для каждого исходника. Имя исполняемого файла совпадает с именем исходника.

### `optimal_search.cpp`

Библиотеки не нужны, только компилятор.

**macOS** (clang):

```bash
clang++ -std=c++17 -Wall -o optimal_search optimal_search.cpp && ./optimal_search
```

**Linux** (gcc / g++):

```bash
g++ -std=c++17 -Wall -o optimal_search optimal_search.cpp && ./optimal_search
```

**Windows** (MinGW-w64, в терминале MSYS2 или PowerShell с g++ в PATH):

```bash
g++ -std=c++17 -Wall -o optimal_search.exe optimal_search.cpp
```

