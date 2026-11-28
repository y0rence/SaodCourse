# 2 семестр: деревья, поиск и кодирование

Лабораторные работы по деревьям поиска: оптимальное дерево, ИСДП, АВЛ, СДП, бинарные деревья и их удаление.
Плюс побуквенный код Шеннона для русского текста — работа 11.
Теория каждой работы вынесена в отдельный файл `THEORY.md`, задания и сборка — в `README.md` папки.

| № | Работа | Программа | README | Теория |
|---|---|---|---|---|
| 01 | Поиск подстроки | `substring_search.cpp` | [README](01-substring-search/README.md) · [страница](01-substring-search/lab.html) | — |
| 02 | Дерево оптимального поиска | `optimal_search.cpp` | [README](02-optimal-search/README.md) · [страница](02-optimal-search/lab.html) | [THEORY](02-optimal-search/THEORY.md) |
| 03 | Идеально сбалансированное дерево (ИСДП) | `isdp.c` | [README](03-isdp/README.md) · [страница](03-isdp/lab.html) | [THEORY](03-isdp/THEORY.md) |
| 04 | Сравнение ДБД и АВЛ | `b_tree.cpp` | [README](04-b-tree/README.md) · [страница](04-b-tree/lab.html) | [THEORY](04-b-tree/THEORY.md) |
| 05 | Бинарное дерево: обходы | `binary_tree.cpp` | [README](05-binary-tree/README.md) · [страница](05-binary-tree/lab.html) | [THEORY](05-binary-tree/THEORY.md) |
| 06 | АВЛ-дерево поиска | `avl_tree.cpp` | [README](06-avl-tree/README.md) · [страница](06-avl-tree/lab.html) | [THEORY](06-avl-tree/THEORY.md) |
| 07 | Удаление из АВЛ-дерева | `avl_delete.cpp` | [README](07-avl-delete/README.md) · [страница](07-avl-delete/lab.html) | [THEORY](07-avl-delete/THEORY.md) |
| 08 | Дерево поиска (СДП) и ИСДП | `sdp.cpp` | [README](08-sdp/README.md) · [страница](08-sdp/lab.html) | [THEORY](08-sdp/THEORY.md) |
| 09 | Удаление из СДП | `sdp_delete.cpp` | [README](09-sdp-delete/README.md) · [страница](09-sdp-delete/lab.html) | [THEORY](09-sdp-delete/THEORY.md) |
| 10 | Приближённые алгоритмы A1 и A2 | `a1_a2.cpp` | [README](10-a1-a2/README.md) · [страница](10-a1-a2/lab.html) | [THEORY](10-a1-a2/THEORY.md) |
| 11 | Код Шеннона | `Shennon.cpp` | [README](11-shannon/README.md) · [страница](11-shannon/lab.html) | — |

У каждой работы есть **интерактивная страница** `lab.html`: задание, пошаговый проигрыватель и «листочек» с кодом (псевдокод ↔ исходный файл).

Учебное пособие: [Пособие_СиАОД.pdf](Пособие_СиАОД.pdf).

Курсовая работа по этой же дисциплине: [../Курсовая/README.md](../Курсовая/README.md).

## Сборка

Подробная установка — [INSTALL.html](../INSTALL.html). Тесты и ответы на вопросы — в папках работ (`TESTS.md`, `QA.md`).

Для программ на C и C++ нужен любой современный компилятор (`gcc`, `g++` или `clang`). Точные команды — в README каждой папки.
