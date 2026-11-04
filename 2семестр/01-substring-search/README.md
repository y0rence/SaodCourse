# 01. Поиск подстроки (`SubstringSearch`)

| Файл | Назначение |
|---|---|
| `substring_search.cpp` | прямой перебор и метод Рабина–Карпа, подсчёт сравнений |
| `text.txt` | текст, в котором производится поиск |

**Сборка и запуск** (программа читает `text.txt` из папки, где лежит исполняемый файл):

```bash
g++ -std=c++17 -o substring_search substring_search.cpp && ./substring_search
```

## Что делает программа

1. Читает `text.txt` и выводит его на экран.
2. Запрашивает слово для поиска.
3. Ищет слово прямым перебором и методом Рабина–Карпа (хеш по модулю 101).
4. Выводит индекс первого вхождения (или `-1`, если слова нет) и число сравнений символов для каждого метода.

Если слово пустое или длиннее текста, программа сообщает об этом и завершается.

## 🧩 Как скомпилировать каждый файл

Команды для каждого исходника. Имя исполняемого файла совпадает с именем исходника.

### `substring_search.cpp`

Библиотеки не нужны, только компилятор.

**macOS** (clang):

```bash
clang++ -std=c++17 -Wall -o substring_search substring_search.cpp && ./substring_search
```

**Linux** (gcc / g++):

```bash
g++ -std=c++17 -Wall -o substring_search substring_search.cpp && ./substring_search
```

**Windows** (MinGW-w64, в терминале MSYS2 или PowerShell с g++ в PATH):

```bash
g++ -std=c++17 -Wall -o substring_search.exe substring_search.cpp
```

