#include <iconv.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "db.h"

#define FANO_MAX_SYMBOLS 256
#define FANO_CODE_MAX 300
#define FANO_PACKED_FILE "testBase2.fano"

typedef struct {
    unsigned char sym;
    long long count;
    double prob;
    char code[FANO_CODE_MAX];
    int len;
} FanoSymbol;

#define PAGE_SIZE 20 /* сколько записей показывать на одной странице */
#define FIO_COL 32   /* ширина колонки ФИО в выводе */
#define POS_COL 25   /* ширина колонки Должность в выводе */
// удалить  пробелы в конце строки
//  Удаляет пробелы в конце строки.
void rtrim(char *s) {
    int len = (int)strlen(s);
    while (len > 0 && s[len - 1] == ' ')
        len--;
    s[len] = '\0';
}

// Преобразует строку из CP866 в UTF-8.
void cp866_to_utf8(const char *src, char *dst, int dst_size) {
    iconv_t cd = iconv_open("UTF-8", "CP866");

    size_t inbytesleft = strlen(src);
    size_t outbytesleft = dst_size - 1;
    char *inbuf = (char *)src;
    char *outbuf = dst;

    iconv(cd, &inbuf, &inbytesleft, &outbuf, &outbytesleft);
    *outbuf = '\0';

    iconv_close(cd);
}

// Преобразует строку из UTF-8 в CP866.
void utf8_to_cp866(const char *src, char *dst, int dst_size) {
    iconv_t cd = iconv_open("CP866", "UTF-8");

    size_t inbytesleft = strlen(src);
    size_t outbytesleft = dst_size - 1;
    char *inbuf = (char *)src;
    char *outbuf = dst;

    iconv(cd, &inbuf, &inbytesleft, &outbuf, &outbytesleft);
    *outbuf = '\0';

    iconv_close(cd);
}

// Сравнивает две строки посимвольно.
int my_strcmp(const char *a, const char *b) {
    int i = 0;

    while (a[i] != '\0' && b[i] != '\0') {
        if (a[i] != b[i])
            return a[i] - b[i];
        i++;
    }
    return a[i] - b[i];
}

// Находит первое вхождение подстроки в строке.
int my_strstr(const char *text, const char *pattern) {
    int i, j;

    for (i = 0; text[i] != '\0'; i++) {
        j = 0;
        while (pattern[j] != '\0' && text[i + j] == pattern[j])
            j++;

        if (pattern[j] == '\0')
            return i;
    }

    return -1;
}

// Извлекает день из даты рождения.
int get_day(const char *birth) {
    return (birth[0] - '0') * 10 + (birth[1] - '0');
}
// Извлекает месяц из даты рождения.
int get_month(const char *birth) {
    return (birth[3] - '0') * 10 + (birth[4] - '0');
}
// Извлекает год из даты рождения.
int get_year(const char *birth) {
    return (birth[6] - '0') * 10 + (birth[7] - '0');
}

// Сравнивает сотрудников по дате рождения и ФИО.
int cmp_workers(Worker *a, Worker *b) {
    int y1 = get_year(a->birth), y2 = get_year(b->birth);
    if (y1 != y2)
        return y1 - y2;

    int m1 = get_month(a->birth), m2 = get_month(b->birth);
    if (m1 != m2)
        return m1 - m2;

    int d1 = get_day(a->birth), d2 = get_day(b->birth);
    if (d1 != d2)
        return d1 - d2;

    return my_strcmp(a->fio, b->fio);
}

// Загружает записи сотрудников из бинарного файла.
Worker *load_database(const char *filename, int *count) {
    FILE *f = fopen(filename, "rb");
    if (f == NULL) {
        *count = 0;
        return NULL;
    }

    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);

    int record_size = FIO_LEN + (int)sizeof(short) + POS_LEN + BIRTH_LEN;
    int n = (int)(size / record_size);

    Worker *db = (Worker *)malloc(n * sizeof(Worker));

    int i;
    for (i = 0; i < n; i++) {
        fread(db[i].fio, 1, FIO_LEN, f);
        db[i].fio[FIO_LEN] = '\0';

        fread(&db[i].dept, sizeof(short), 1, f);

        fread(db[i].position, 1, POS_LEN, f);
        db[i].position[POS_LEN] = '\0';

        fread(db[i].birth, 1, BIRTH_LEN, f);
        db[i].birth[BIRTH_LEN] = '\0';

        rtrim(db[i].fio);
        rtrim(db[i].position);
    }

    fclose(f);
    *count = n;
    return db;
}

// Меняет местами два указателя на записи.
void swap_ptr(Worker **a, Worker **b) {
    Worker *t = *a;
    *a = *b;
    *b = t;
}

// Сортирует указатели на записи быстрой сортировкой Хоара.
void quick_sort_hoare(Worker **idx, int L, int R) {
    Worker *x = idx[(L + R) / 2];
    int i = L, j = R;

    do {
        while (cmp_workers(idx[i], x) < 0)
            i++;
        while (cmp_workers(idx[j], x) > 0)
            j--;

        if (i <= j) {
            swap_ptr(&idx[i], &idx[j]);
            i++;
            j--;
        }
    } while (i <= j);

    if (L < j)
        quick_sort_hoare(idx, L, j);
    if (i < R)
        quick_sort_hoare(idx, i, R);
}

// Подсчитывает количество символов в строке UTF-8.
int utf8_len(const char *s) {
    int len = 0;
    int i;

    for (i = 0; s[i] != '\0'; i++)
        if (((unsigned char)s[i] & 0xC0) != 0x80)
            len++;

    return len;
}

// Выводит строку с дополнением пробелами до заданной ширины.
void print_padded(const char *s, int width) {
    int len = utf8_len(s);
    int i;

    printf("%s", s);
    for (i = len; i < width; i++)
        printf(" ");
}

// Выводит заголовок таблицы сотрудников.
void print_header(void) {
    printf("%3s | ", "#");
    print_padded("ФИО сотрудника", FIO_COL);
    printf(" | %4s | ", "Отд");
    print_padded("Должность", POS_COL);
    printf(" | %s\n", "Дата рожд.");

    printf("----+");
    for (int i = 0; i < FIO_COL + 2; i++)
        printf("-");
    printf("+------+");
    for (int i = 0; i < POS_COL + 2; i++)
        printf("-");
    printf("+-----------\n");
}

// Выводит одну запись сотрудника в таблицу.
void print_worker(int num, Worker *w) {
    char fio_utf8[128];
    char pos_utf8[128];

    cp866_to_utf8(w->fio, fio_utf8, sizeof(fio_utf8));
    cp866_to_utf8(w->position, pos_utf8, sizeof(pos_utf8));

    printf("%3d | ", num);
    print_padded(fio_utf8, FIO_COL);
    printf(" | %4d | ", w->dept);
    print_padded(pos_utf8, POS_COL);
    printf(" | %s\n", w->birth);
}

// Очищает остаток ввода до конца строки.
void flush_stdin(void) {
    int c;
    while ((c = getchar()) != '\n' && c != EOF)
        ;
}

struct TNode;
void search_tree_by_fio(struct TNode *root);
void build_tree_from_records(Worker **idx, int n);

// Показывает записи постранично; z строит дерево, f запускает поиск в дереве.
void view_pages(Worker **idx, int n, const char *title, const char *key_info,
                struct TNode *search_root = NULL, int allow_tree_build = 0) {
    int pages = (n + PAGE_SIZE - 1) / PAGE_SIZE; // Общее количество страниц.
    int page = 0;                                // Номер текущей страницы, начиная с нуля.

    while (1) {
        int start = page * PAGE_SIZE; // Индекс первой записи текущей страницы.
        int end = start + PAGE_SIZE;  // Индекс за последней записью страницы.
        if (end > n)
            end = n;

        printf("\n%s\n", title);
        if (key_info[0] != '\0')
            printf("%s\n", key_info);
        print_header();

        int i;
        for (i = start; i < end; i++)
            print_worker(i + 1, idx[i]);

        if (search_root != NULL)
            printf("\nf - поиск по ФИО в дереве, n - вперёд, p - назад, q - выход: ");
        else if (allow_tree_build)
            printf("\nz - построить ДБД из найденных записей, n - вперёд, p - назад, "
                   "q - выход: ");
        else
            printf("\nn - вперёд, p - назад, q - выход: ");

        int cmd = getchar(); // Команда пользователя: n, p, q, z или f.
        flush_stdin();

        if (cmd == 'q' || cmd == 'Q' || cmd == EOF)
            break;
        if ((cmd == 'f' || cmd == 'F') && search_root != NULL) {
            search_tree_by_fio(search_root);
            continue;
        }
        if ((cmd == 'z' || cmd == 'Z') && allow_tree_build) {
            build_tree_from_records(idx, n);
            continue;
        }
        if ((cmd == 'n' || cmd == 'N') && page + 1 < pages)
            page++;
        if ((cmd == 'p' || cmd == 'P') && page > 0)
            page--;
    }
}

struct QueueNode {
    Worker *rec;     // Указатель на запись сотрудника в основной базе.
    QueueNode *next; // Адрес следующего узла очереди.
};

struct Queue {
    QueueNode *head; // Первый элемент очереди.
    QueueNode *tail; // Последний элемент очереди.
};

// Инициализирует пустую очередь.
void queue_init(Queue *q) {
    q->head = NULL;
    q->tail = NULL;
}

/* Алгоритм на псевдокоде (методичка, стр. 29-30,
   "Добавление элемента по адресу p в очередь"):
   1) p->Next := NIL
   2) IF (Head <> NIL) Tail->Next := p
          ELSE Head := p
      FI
   3) Tail := p

   Добавляет запись rec в конец очереди. Сама запись в очередь не
   копируется - в узле хранится только указатель на неё в базе. */
// Добавляет указатель на запись в конец очереди.
void queue_push(Queue *q, Worker *rec) {
    QueueNode *p = (QueueNode *)malloc(sizeof(QueueNode));
    p->rec = rec;
    p->next = NULL;

    if (q->head != NULL)
        q->tail->next = p;
    else
        q->head = p;

    q->tail = p;
}

// Подсчитывает количество элементов в очереди.
int queue_count(Queue *q) {
    int count = 0;
    QueueNode *p = q->head;

    while (p != NULL) {
        count++;
        p = p->next;
    }

    return count;
}

// Освобождает узлы очереди.
void queue_free(Queue *q) {
    QueueNode *p = q->head;

    while (p != NULL) {
        QueueNode *next = p->next;
        free(p);
        p = next;
    }

    q->head = NULL;
    q->tail = NULL;
}

// Выводит результат поиска из очереди постранично.
void show_queue_result(Queue *q, const char *title, const char *not_found_msg,
                       int allow_tree_build = 0) {
    int count = queue_count(q);

    if (count == 0) {
        printf("%s\n", not_found_msg);
        queue_free(q);
        return;
    }

    printf("Найдено записей: %d\n", count);

    Worker **q_idx =
        (Worker **)malloc(count * sizeof(Worker *)); // Массив указателей для постраничного вывода.
    QueueNode *node = q->head;                       // Текущий узел при обходе очереди.
    int i = 0;                                       // Индекс следующей ячейки массива.
    while (node != NULL) {
        q_idx[i] = node->rec;
        i++;
        node = node->next;
    }

    view_pages(q_idx, count, title, "", NULL, allow_tree_build);

    free(q_idx);
    queue_free(q);
}

/* Алгоритм на псевдокоде (двоичный поиск):
   L:=1, R:=n, Найден:=нет
   DO (L<=R)
       m:=(L+R)/2
       IF (a[m]=X) Найден:=да OD FI
       IF (a[m]<X) L:=m+1
           ELSE R:=m-1
       FI
   OD */
// Выполняет двоичный поиск записи по году рождения.
Worker **binary_search_year(Worker **idx, int n, int year) {
    Worker **lo = idx;         // Левая граница текущего диапазона поиска.
    Worker **hi = idx + n - 1; // Правая граница текущего диапазона поиска.

    while (lo <= hi) {
        Worker **mid = lo + (hi - lo) / 2; // Середина текущего диапазона.
        int y = get_year((*mid)->birth);   // Год рождения в средней записи.

        if (y == year)
            return mid;

        if (y < year)
            lo = mid + 1;
        else
            hi = mid - 1;
    }

    return NULL;
}

/* поиск по дате рождения с гибкой точностью - можно ввести:
     46            -> только год
     08 46         -> месяц и год
     08 03 46      -> день, месяц и год
*/
// Ищет сотрудников по году, месяцу или полной дате рождения.
void search_by_date(Worker **idx, int n) {
    char line[64];

    printf("\nПример: год (46), месяц и год (08 46) или день, месяц "
           "и год (08 03 46)\n");
    printf("Введите дату рождения для поиска: ");

    fgets(line, sizeof(line), stdin);

    int v1 = -1, v2 = -1, v3 = -1; // Числа, введённые пользователем.
    int parts = sscanf(line, "%d %d %d", &v1, &v2,
                       &v3); // Количество успешно считанных чисел.

    int year, month, day; // Части даты, по которым выполняется поиск.

    if (parts == 1) {
        year = v1;
        month = -1;
        day = -1;
    } else if (parts == 2) {
        month = v1;
        year = v2;
        day = -1;
    } else if (parts == 3) {
        day = v1;
        month = v2;
        year = v3;
    } else {
        printf("Не понял ввод - нужно ввести от 1 до 3 чисел.\n");
        return;
    }

    Worker **pos = binary_search_year(idx, n, year);

    if (pos == NULL) {
        printf("Записей с годом рождения %02d не найдено.\n", year);
        return;
    }

    Worker **first = pos; // Начало диапазона записей с искомым годом.
    while (first > idx && get_year((*(first - 1))->birth) == year)
        first--;

    Worker **last = pos; // Конец диапазона записей с искомым годом.
    while (last < idx + n - 1 && get_year((*(last + 1))->birth) == year)
        last++;

    Queue q;
    queue_init(&q);

    Worker **p;
    for (p = first; p <= last; p++) {
        Worker *w = *p;
        if (month != -1 && get_month(w->birth) != month)
            continue;
        if (day != -1 && get_day(w->birth) != day)
            continue;

        queue_push(&q, w);
    }

    char title[64];
    if (parts == 1)
        snprintf(title, sizeof(title), "Очередь: год рождения %02d", year);
    else if (parts == 2)
        snprintf(title, sizeof(title), "Очередь: месяц %02d, год %02d", month, year);
    else
        snprintf(title, sizeof(title), "Очередь: дата рождения %02d-%02d-%02d", day, month, year);

    show_queue_result(&q, title, "Записей с такой датой рождения не найдено.", 1);
}

// Ищет сотрудников по ФИО или его части.
void search_by_fio(Worker **idx, int n) {
    char line[128];        // Строка, введённая пользователем.
    char query_cp866[128]; // Введённый запрос в кодировке базы CP866.

    printf("\nПример: Иванов Иван Иванович (можно и часть ФИО, "
           "например просто \"Иванов\")\n");
    printf("Введите ФИО для поиска: ");

    fgets(line, sizeof(line), stdin);

    int len = (int)strlen(line);
    if (len > 0 && line[len - 1] == '\n')
        line[len - 1] = '\0';

    utf8_to_cp866(line, query_cp866, sizeof(query_cp866));
    Queue q; // Очередь сотрудников, найденных по ФИО.
    queue_init(&q);

    int i; // Индекс записи при просмотре базы.
    for (i = 0; i < n; i++)
        if (my_strstr(idx[i]->fio, query_cp866) != -1)
            queue_push(&q, idx[i]);

    char title[192];
    snprintf(title, sizeof(title), "Очередь: записи с ФИО \"%s\"", line);

    char not_found[192];
    snprintf(not_found, sizeof(not_found), "Записей с ФИО \"%s\" не найдено.", line);

    show_queue_result(&q, title, not_found);
}

// Ищет сотрудников по должности или её части.
void search_by_position(Worker **idx, int n) {
    char line[128];        // Строка, введённая пользователем.
    char query_cp866[128]; // Введённый запрос в кодировке базы CP866.

    printf("\nПример: инженер (можно и часть должности, например "
           "просто \"начальник\")\n");
    printf("Введите должность для поиска: ");

    fgets(line, sizeof(line), stdin);

    int len = (int)strlen(line);
    if (len > 0 && line[len - 1] == '\n')
        line[len - 1] = '\0';

    utf8_to_cp866(line, query_cp866, sizeof(query_cp866));

    Queue q;
    queue_init(&q);

    int i;
    for (i = 0; i < n; i++)
        if (my_strstr(idx[i]->position, query_cp866) != -1)
            queue_push(&q, idx[i]);

    char title[192];
    snprintf(title, sizeof(title), "Очередь: записи с должностью \"%s\"", line);

    char not_found[192];
    snprintf(not_found, sizeof(not_found), "Записей с должностью \"%s\" не найдено.", line);

    show_queue_result(&q, title, not_found);
}

// Ищет сотрудников по номеру отдела.
void search_by_dept(Worker **idx, int n) {
    char line[32];

    printf("\nПример: 130 (номер отдела)\n");
    printf("Введите номер отдела для поиска: ");

    fgets(line, sizeof(line), stdin);

    int dept;
    if (sscanf(line, "%d", &dept) != 1) {
        printf("Не понял ввод - нужно ввести число.\n");
        return;
    }

    Queue q;
    queue_init(&q);

    int i;
    for (i = 0; i < n; i++)
        if (idx[i]->dept == dept)
            queue_push(&q, idx[i]);

    char title[64];
    snprintf(title, sizeof(title), "Очередь: записи отдела %d", dept);

    char not_found[64];
    snprintf(not_found, sizeof(not_found), "Записей с отделом %d не найдено.", dept);

    show_queue_result(&q, title, not_found);
}

/* ДБД - двоичное Б-дерево      */
struct TNode {
    Worker *rec;  // Указатель на сотрудника, хранящегося в узле.
    TNode *Left;  // Левый потомок.
    TNode *Right; // Правый потомок.
    int Balance;  /* 1 - правая ссылка горизонтальная (на той же странице), 0 -
                     вертикальная */
};

struct TStats {
    int size;       // Количество узлов дерева.
    long sum;       // Сумма годов рождения во всех узлах.
    int height;     // Максимальная глубина дерева.
    long depth_sum; // Сумма глубин всех узлов.
};

// VR - рост дерева по вертикали, HR - по горизонтали
int VR, HR;
TNode *TRoot = NULL;

// Рекурсивно вставляет запись в ДБД с балансировкой.
void tree_add(Worker *rec, TNode **p) {
    if (*p == NULL) {
        *p = (TNode *)malloc(sizeof(TNode));
        (*p)->rec = rec;
        (*p)->Left = NULL;
        (*p)->Right = NULL;
        (*p)->Balance = 0;
        VR = 1;
    } else if (my_strcmp(rec->fio, (*p)->rec->fio) < 0) {
        tree_add(rec, &(*p)->Left);
        if (VR) {
            if ((*p)->Balance == 0) {
                TNode *q = (*p)->Left; // Временный указатель для поворота вправо.
                (*p)->Left = q->Right;
                q->Right = *p;
                *p = q;
                q->Balance = 1;
                VR = 0;
                HR = 1;
            } else {
                (*p)->Balance = 0;
                HR = 1;
            }
        } else {
            HR = 0;
        }
    } else {
        tree_add(rec, &(*p)->Right);
        if (VR) {
            (*p)->Balance = 1;
            VR = 0;
            HR = 1;
        } else if (HR) {
            if ((*p)->Balance > 0) {
                TNode *q = (*p)->Right; // Временный указатель для поворота влево.
                (*p)->Right = q->Left;
                (*p)->Balance = 0;
                q->Balance = 0;
                q->Left = *p;
                *p = q;
                VR = 1;
                HR = 0;
            } else {
                HR = 0;
            }
        }
    }
}

// Запускает вставку записи в корень ДБД.
void tree_insert(Worker *rec) {
    VR = 1;
    HR = 1;
    tree_add(rec, &TRoot);
}

// Подсчитывает количество узлов дерева.
int tree_count(TNode *p) {
    if (p == NULL)
        return 0;
    return 1 + tree_count(p->Left) + tree_count(p->Right);
}

// Собирает записи дерева при симметричном обходе.
void tree_collect(TNode *p, Worker **out, int *k) {
    if (p == NULL)
        return;
    tree_collect(p->Left, out, k);
    out[*k] = p->rec;
    (*k)++;
    tree_collect(p->Right, out, k);
}

// Сравнивает запрос с фамилией, то есть первой частью поля ФИО.
int surname_equals(const char *fio, const char *surname) {
    char current_surname[FIO_LEN + 1]; // Фамилия из записи сотрудника.
    int i = 0;
    while (fio[i] != '\0' && fio[i] != ' ' && i < FIO_LEN) {
        current_surname[i] = fio[i];
        i++;
    }
    current_surname[i] = '\0';
    return my_strcmp(current_surname, surname) == 0;
}

// Ищет в дереве точное ФИО или точное совпадение по фамилии.
void tree_find_fio(TNode *p, const char *query, Queue *q, int surname_only) {
    if (p == NULL)
        return;
    tree_find_fio(p->Left, query, q, surname_only);
    if (surname_only) {
        if (surname_equals(p->rec->fio, query))
            queue_push(q, p->rec);
    } else if (my_strcmp(p->rec->fio, query) == 0) {
        queue_push(q, p->rec);
    }
    tree_find_fio(p->Right, query, q, surname_only);
}

// Запрашивает режим поиска: по полному ФИО или только по фамилии.
void search_tree_by_fio(TNode *root) {
    char line[128];        // Полное ФИО или фамилия, введённые пользователем.
    char query_cp866[128]; // Запрос в кодировке записей базы.
    char title[192];
    int mode;

    printf("\n1 - поиск по полному ФИО\n");
    printf("2 - поиск только по фамилии\n");
    printf("Выберите способ поиска: ");
    mode = getchar();
    flush_stdin();
    if (mode != '1' && mode != '2') {
        printf("Неизвестный способ поиска.\n");
        return;
    }

    if (mode == '1')
        printf("Введите полное ФИО: ");
    else
        printf("Введите фамилию: ");
    if (fgets(line, sizeof(line), stdin) == NULL)
        return;

    int len = (int)strlen(line);
    if (len > 0 && line[len - 1] == '\n')
        line[len - 1] = '\0';
    if (line[0] == '\0') {
        printf("Пустой запрос.\n");
        return;
    }

    utf8_to_cp866(line, query_cp866, sizeof(query_cp866));
    Queue q;
    queue_init(&q);
    tree_find_fio(root, query_cp866, &q, mode == '2');

    if (mode == '1')
        snprintf(title, sizeof(title), "ДБД: поиск по полному ФИО \"%s\"", line);
    else
        snprintf(title, sizeof(title), "ДБД: поиск по фамилии \"%s\"", line);
    show_queue_result(&q, title, "В дереве нет записей по заданному запросу.");
}

// Собирает размер, сумму, высоту и глубины узлов дерева.
void tree_stats(TNode *p, int depth,
                TStats *st) { // depth — глубина текущего узла, st — собираемая статистика.
    if (p == NULL)
        return;
    st->size++;
    st->sum += get_year(p->rec->birth);
    if (depth > st->height)
        st->height = depth;
    st->depth_sum += depth;
    tree_stats(p->Left, depth + 1, st);
    tree_stats(p->Right, depth + 1, st);
}

// Выводит основные характеристики дерева.
void tree_print_report(TNode *root) {
    TStats st = {0, 0, 0, 0}; // Обнуляем все показатели перед подсчётом.
    tree_stats(root, 1, &st);

    printf("размер:            %d\n", st.size);
    printf("контрольная сумма: %ld\n", st.sum);
    printf("высота:            %d\n", st.height);
    printf("средняя высота:    %.2f\n", (double)st.depth_sum / st.size);
}

// Рекурсивно освобождает память, занятую деревом.
void tree_free(TNode *p) {
    if (p == NULL)
        return;
    tree_free(p->Left);
    tree_free(p->Right);
    free(p);
}

// Строит ДБД по ФИО из записей, найденных поиском по дате рождения.
void build_tree_from_records(Worker **idx, int n) {
    TRoot = NULL;

    int i;
    for (i = 0; i < n; i++)
        tree_insert(idx[i]);

    int count = tree_count(TRoot);
    Worker **arr = (Worker **)malloc(count * sizeof(Worker *));
    int k = 0;
    tree_collect(TRoot, arr, &k);

    printf("\nВ дереве записей: %d\n", count);
    view_pages(arr, count, "ДБД по ФИО из результатов поиска по дате: обход слева направо", "",
               TRoot);

    free(arr);
    tree_print_report(TRoot);
    tree_free(TRoot);
    TRoot = NULL;
}

// Строит ДБД по ФИО из записей, найденных по ФИО.
void build_tree_by_fio(Worker **idx, int n) {
    char line[128];        // Строка, введённая пользователем.
    char query_cp866[128]; // Введённый запрос в кодировке базы CP866.

    printf("\nПример: Иванов (часть ФИО - по найденным записям построим ДБД "
           "по ФИО)\n");
    printf("Введите ФИО для поиска: ");

    fgets(line, sizeof(line), stdin);

    int len = (int)strlen(line);
    if (len > 0 && line[len - 1] == '\n')
        line[len - 1] = '\0';

    utf8_to_cp866(line, query_cp866, sizeof(query_cp866));

    Queue q; // Очередь сотрудников, найденных по ФИО.
    queue_init(&q);

    int i; // Индекс записи при просмотре базы.
    for (i = 0; i < n; i++)
        if (my_strstr(idx[i]->fio, query_cp866) != -1)
            queue_push(&q, idx[i]);

    if (queue_count(&q) == 0) {
        printf("Записей с ФИО \"%s\" не найдено.\n", line);
        queue_free(&q);
        return;
    }

    TRoot = NULL;
    QueueNode *node = q.head; // Текущий элемент очереди при построении дерева.
    while (node != NULL) {
        tree_insert(node->rec);
        node = node->next;
    }
    queue_free(&q);

    int count = tree_count(TRoot); // Количество узлов построенного дерева.
    Worker **arr =
        (Worker **)malloc(count * sizeof(Worker *)); // Массив для записей при обходе дерева.
    int k = 0;                                       // Текущая позиция заполнения массива.
    tree_collect(TRoot, arr, &k);

    printf("В дереве записей: %d\n", count);
    view_pages(arr, count, "ДБД: обход слева направо (ключ - ФИО)", "", TRoot);
    free(arr);
    tree_print_report(TRoot);

    tree_free(TRoot);
    TRoot = NULL;
}

// Загружает базу данных и запускает главное меню программы.
long read_whole_file(const char *filename, unsigned char **out) {
    FILE *f = fopen(filename, "rb");
    if (f == NULL) {
        return -1;
    }
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (size <= 0) {
        fclose(f);
        return -1;
    }
    unsigned char *buf = (unsigned char *)malloc((size_t)size);
    if (buf == NULL) {
        fclose(f);
        return -1;
    }
    if (fread(buf, 1, (size_t)size, f) != (size_t)size) {
        free(buf);
        fclose(f);
        return -1;
    }
    fclose(f);
    *out = buf;
    return size;
}

void fano_count_symbols(const unsigned char *buf, long size, FanoSymbol *tab, int *count) {
    long long freq[FANO_MAX_SYMBOLS];
    memset(freq, 0, sizeof(freq));
    long i;
    for (i = 0; i < size; i++) {
        freq[buf[i]]++;
    }
    int k = 0;
    int s;
    for (s = 0; s < FANO_MAX_SYMBOLS; s++) {
        if (freq[s] > 0) {
            tab[k].sym = (unsigned char)s;
            tab[k].count = freq[s];
            tab[k].prob = (double)freq[s] / (double)size;
            tab[k].len = 0;
            tab[k].code[0] = '\0';
            k++;
        }
    }
    *count = k;
}

int fano_compare(const void *a, const void *b) {
    const FanoSymbol *x = (const FanoSymbol *)a;
    const FanoSymbol *y = (const FanoSymbol *)b;
    if (x->prob < y->prob) {
        return 1;
    }
    if (x->prob > y->prob) {
        return -1;
    }
    return (int)x->sym - (int)y->sym;
}

void fano_assign(FanoSymbol *tab, int lo, int hi) {
    if (lo >= hi) {
        return;
    }
    double sum = 0.0;
    int i;
    for (i = lo; i <= hi; i++) {
        sum += tab[i].prob;
    }
    double acc = 0.0;
    int split = lo;
    for (i = lo; i < hi; i++) {
        acc += tab[i].prob;
        if (acc >= sum / 2.0) {
            break;
        }
        split = i + 1;
    }
    if (split >= hi) {
        split = hi - 1;
    }
    for (i = lo; i <= split; i++) {
        tab[i].code[tab[i].len] = '0';
        tab[i].len++;
        tab[i].code[tab[i].len] = '\0';
    }
    for (i = split + 1; i <= hi; i++) {
        tab[i].code[tab[i].len] = '1';
        tab[i].len++;
        tab[i].code[tab[i].len] = '\0';
    }
    fano_assign(tab, lo, split);
    fano_assign(tab, split + 1, hi);
}

void fano_symbol_text(unsigned char sym, char *out, int out_size) {
    if (sym >= 32 && sym < 127) {
        snprintf(out, out_size, "%c", sym);
        return;
    }
    char src[2];
    src[0] = (char)sym;
    src[1] = '\0';
    cp866_to_utf8(src, out, out_size);
    if (out[0] == '\0') {
        snprintf(out, out_size, "0x%02X", sym);
    }
}

void fano_print_table(const FanoSymbol *tab, int count) {
    printf("%-10s %-16s %-14s %s\n", "Символ", "Вероятность", "Кодовое слово", "Длина");
    int i;
    for (i = 0; i < count; i++) {
        char text[16];
        fano_symbol_text(tab[i].sym, text, (int)sizeof(text));
        printf("%-10s %-16.8f %-14s %d\n", text, tab[i].prob, tab[i].code, tab[i].len);
    }
}

double fano_entropy(const FanoSymbol *tab, int count) {
    double h = 0.0;
    int i;
    for (i = 0; i < count; i++) {
        if (tab[i].prob > 0.0) {
            h -= tab[i].prob * (log(tab[i].prob) / log(2.0));
        }
    }
    return h;
}

double fano_avg_length(const FanoSymbol *tab, int count) {
    double len = 0.0;
    int i;
    for (i = 0; i < count; i++) {
        len += tab[i].prob * (double)tab[i].len;
    }
    return len;
}

double fano_kraft_sum(const FanoSymbol *tab, int count) {
    double kraft = 0.0;
    int i;
    for (i = 0; i < count; i++) {
        kraft += pow(2.0, -(double)tab[i].len);
    }
    return kraft;
}

long fano_encode(const unsigned char *buf, long size, const FanoSymbol *tab, int count,
                 const char *outname) {
    int index[FANO_MAX_SYMBOLS];
    int i;
    for (i = 0; i < FANO_MAX_SYMBOLS; i++) {
        index[i] = -1;
    }
    for (i = 0; i < count; i++) {
        index[tab[i].sym] = i;
    }
    long long total_bits = 0;
    long j;
    for (j = 0; j < size; j++) {
        int k = index[buf[j]];
        if (k >= 0) {
            total_bits += tab[k].len;
        }
    }
    long packed_size = (total_bits + 7) / 8;
    unsigned char *out = (unsigned char *)malloc((size_t)packed_size + 1);
    if (out == NULL) {
        return -1;
    }
    long long bit = 0;
    long out_pos = 0;
    unsigned char acc = 0;
    int nbits = 0;
    for (j = 0; j < size; j++) {
        int k = index[buf[j]];
        if (k < 0) {
            continue;
        }
        const FanoSymbol *s = &tab[k];
        for (i = 0; i < s->len; i++) {
            acc = (unsigned char)((acc << 1) | (s->code[i] - '0'));
            nbits++;
            bit++;
            if (nbits == 8) {
                out[out_pos++] = acc;
                nbits = 0;
                acc = 0;
            }
        }
    }
    if (nbits > 0) {
        acc = (unsigned char)(acc << (8 - nbits));
        out[out_pos++] = acc;
    }
    FILE *f = fopen(outname, "wb");
    if (f == NULL) {
        free(out);
        return -1;
    }
    fwrite(out, 1, (size_t)out_pos, f);
    fclose(f);
    free(out);
    return out_pos;
}

void run_fano_encoding(const char *filename, const char *outname) {
    unsigned char *buf = NULL;
    long size = read_whole_file(filename, &buf);
    if (size < 0) {
        printf("Файл %s не прочитан.\n", filename);
        return;
    }
    FanoSymbol *tab = (FanoSymbol *)malloc(sizeof(FanoSymbol) * FANO_MAX_SYMBOLS);
    if (tab == NULL) {
        free(buf);
        return;
    }
    int count = 0;
    fano_count_symbols(buf, size, tab, &count);
    qsort(tab, (size_t)count, sizeof(FanoSymbol), fano_compare);
    fano_assign(tab, 0, count - 1);

    printf("\nКод Фано: %s, %ld байт, уникальных символов: %d\n", filename, size, count);
    fano_print_table(tab, count);

    double kraft = fano_kraft_sum(tab, count);
    double entropy = fano_entropy(tab, count);
    double avg = fano_avg_length(tab, count);
    double redundancy = avg > 0.0 && entropy > 0.0 ? (avg - entropy) / entropy : 0.0;

    printf("\nНеравенство Крафта: сумма 2^-l = %.10f %s\n", kraft,
           kraft <= 1.0000000001 ? "<= 1, выполнено" : "> 1, НЕ ВЫПОЛНЕНО");
    printf("Энтропия исходного файла: H = %.6f бит/символ\n", entropy);
    printf("Средняя длина кодового слова: L = %.6f бит/символ\n", avg);
    printf("Избыточность кода: R = (L - H) / H = %.6f\n", redundancy);

    long packed = fano_encode(buf, size, tab, count, outname);
    if (packed < 0) {
        printf("Файл %s не записан.\n", outname);
    } else {
        long long total_bits = 0;
        int i;
        for (i = 0; i < count; i++) {
            total_bits += tab[i].count * (long long)tab[i].len;
        }
        printf("Закодировано: %lld бит = %ld байт (было %ld байт)\n", total_bits, packed, size);
        printf("Коэффициент сжатия: %.4f\n", (double)size / (double)packed);
        printf("Упакованная база записана в %s\n", outname);
    }
    free(tab);
    free(buf);
}

int main(void) {
    int n;
    Worker *db = load_database(DB_FILE, &n);

    if (db == NULL) {
        printf("Файл %s не найден.\n", DB_FILE);
        return 1;
    }

    printf("Загружено записей: %d\n", n);
    Worker **idx_orig =
        (Worker **)malloc(n * sizeof(Worker *)); // Указатели в исходном порядке базы.
    Worker **idx_sorted =
        (Worker **)malloc(n * sizeof(Worker *)); // Отдельный массив указателей для сортировки.

    int i;
    for (i = 0; i < n; i++) {
        idx_orig[i] = &db[i];
        idx_sorted[i] = &db[i];
    }

    int sorted = 0;
    /* отсортирован ли idx_sorted прямо сейчас */ // Не даёт сортировать
                                                  // массив повторно.

    while (1) {
        printf("\n1 - посмотреть базу до сортировки\n");
        printf("2 - посмотреть базу после сортировки (метод Хоара)\n");
        printf("3 - поиск по дате рождения (год / месяц+год / день+месяц+год)\n");
        printf("4 - поиск по ФИО (или части ФИО)\n");
        printf("5 - поиск по должности (или части должности)\n");
        printf("6 - поиск по номеру отдела\n");
        printf("7 - ДБД: дерево по ФИО из записей поиска по ФИО\n");
        printf("8 - кодирование базы: код Фано (E=2)\n");
        printf("0 - выход\n");
        printf("Выбор: ");

        int choice = getchar();
        flush_stdin();

        if (choice == '0' || choice == EOF)
            break;

        if (choice == '1') {
            view_pages(idx_orig, n, "До сортировки", "");
        } else if (choice == '2') {
            if (!sorted) {
                quick_sort_hoare(idx_sorted, 0, n - 1);
                sorted = 1;
            }
            view_pages(idx_sorted, n, "После сортировки",
                       "Ключ сортировки (по порядку): 1) год рождения -> "
                       "2) месяц рождения -> 3) день рождения -> 4) ФИО "
                       "(если дата рождения совпадает)");
        } else if (choice == '3') {
            if (!sorted) {
                quick_sort_hoare(idx_sorted, 0, n - 1);
                sorted = 1;
            }
            search_by_date(idx_sorted, n);
        } else if (choice == '4') {
            search_by_fio(idx_sorted, n);
        } else if (choice == '5') {
            search_by_position(idx_sorted, n);
        } else if (choice == '6') {
            search_by_dept(idx_sorted, n);
        } else if (choice == '7') {
            build_tree_by_fio(idx_sorted, n);
        } else if (choice == '8') {
            run_fano_encoding(DB_FILE, FANO_PACKED_FILE);
        }
    }

    free(idx_orig);
    free(idx_sorted);
    free(db);

    return 0;
}
