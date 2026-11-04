# Установка компиляторов и библиотек

Подробная инструкция для Windows, macOS и Linux. Красивая версия: [INSTALL.html](INSTALL.html).

## 1. Что нужно установить

Программы проекта — это программы на C и C++. Для их сборки нужны два набора:

- **Компилятор** — gcc/g++ или clang. Нужен для всех работ.
- **Библиотеки SFML 3 и CSFML** — только для работ с графиками (см. список в README каждой папки). Остальные программы работают без них.


## 2. macOS


### 2.1 Компилятор

Установите инструменты командной строки Xcode (содержат clang):

```bash
xcode-select --install
```

Проверка:

```bash
clang++ --version
```


### 2.2 Библиотеки SFML 3 и CSFML

Самый простой путь — Homebrew (https://brew.sh):

```bash
brew install sfml csfml
```

Homebrew на Apple Silicon ставит файлы в `/opt/homebrew`, на Intel — в `/usr/local`. Команды из README используют путь `/opt/homebrew`; на Intel замените его на `/usr/local`.

```bash
clang++ -std=c++17 -I/opt/homebrew/include -L/opt/homebrew/lib -o quick_sort quick_sort.cpp -lsfml-graphics -lsfml-window -lsfml-system && ./quick_sort
```


### 2.3 Clang-format (по желанию)

Для форматирования по `.clang-format` из репозитория:

```bash
brew install llvm
```


## 3. Linux


### 3.1 Компилятор

Debian / Ubuntu:

```bash
sudo apt update && sudo apt install build-essential
```

Fedora:

```bash
sudo dnf groupinstall "Development Tools"
```

Arch / Manjaro:

```bash
sudo pacman -S base-devel
```

Проверка:

```bash
g++ --version && gcc --version
```


### 3.2 Библиотеки SFML 3 и CSFML

> Внимание: пакеты `libsfml-dev` в дистрибутивах (например, Ubuntu 24.04) часто содержат SFML 2.x. Проект написан под SFML 3 — API отличается. Проверьте версию: `pkg-config --modversion sfml-graphics`. Если версия 2.x, соберите SFML 3 из исходников (ниже).

Сборка SFML 3 из исходников (нужны git, cmake и зависимости):

```bash
sudo apt install git cmake libx11-dev libxrandr-dev libxcursor-dev libxi-dev libudev-dev libgl-dev libfreetype-dev libflac-dev libvorbis-dev libopenal-dev
git clone --depth 1 --branch 3.0.0 https://github.com/SFML/SFML.git
cmake -S SFML -B SFML/build -DCMAKE_BUILD_TYPE=Release -DSFML_BUILD_TESTS=OFF
cmake --build SFML/build -j$(nproc)
sudo cmake --install SFML/build
```

Для CSFML (C-обёртка) — то же самое из репозитория CSFML (https://github.com/SFML/CSFML) с веткой для SFML 3. После установки библиотеки попадают в `/usr/local/lib`; при необходимости выполните `sudo ldconfig`.


### 3.3 Проверка

```bash
pkg-config --cflags --libs sfml-graphics
```


## 4. Windows


### 4.1 Компилятор (MinGW-w64 через MSYS2)

1. Скачайте и установите MSYS2 с https://www.msys2.org.
2. Откройте терминал «MSYS2 UCRT64» и выполните:
3. pacman -Syu
4. pacman -S mingw-w64-ucrt-x86_64-gcc
5. Добавьте в переменную PATH папку `C:\msys64\ucrt64\bin`.
6. Проверка в PowerShell: `g++ --version`.


### 4.2 Библиотеки SFML 3 и CSFML

Вариант A — готовый SDK: скачайте SFML 3 и CSFML для вашего MinGW с https://www.sfml-dev.org/download.php. Распакуйте, например, в `C:\SFML`. В командной строке:

```bash
g++ -std=c++17 -IC:/SFML/include -LC:/SFML/lib -o quick_sort.exe quick_sort.cpp -lsfml-graphics -lsfml-window -lsfml-system
```

Затем скопируйте все DLL из `C:\SFML\bin` рядом с `quick_sort.exe`, иначе программа не запустится (ошибка «не найдена библиотека»).

Вариант B — MSYS2: `pacman -S mingw-w64-ucrt-x86_64-sfml` (версию проверьте: в пакете может быть SFML 2.x).


## 5. Частые ошибки

- `fatal error: SFML/Graphics.hpp: No such file` — не указан путь `-I` к заголовкам.
- `undefined reference to sf::...` — не подключены библиотеки или они стоят до исходного файла. Флаги `-l...` пишите после имени файла.
- `dyld: Library not loaded` (macOS) — библиотека не найдена во время запуска; проверьте `brew install sfml`.
- Программа на Windows сразу закрывается — не скопированы DLL SFML из папки `bin`.
- Программа без графики не собирается при `-Werror` — уберите этот флаг или исправьте предупреждения.


## 6. Как проверить сборку проекта

Откройте README любой работы: в разделе «Как скомпилировать каждый файл» указана команда для каждого исходника и для каждой ОС. Пример для работы 1 семестра без графики:

```bash
gcc -std=c11 -Wall -o select_sort select_sort.c -lm && ./select_sort
```
