#include <iconv.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "db.h"

#define PAGE_SIZE 20 /* сколько записей показывать на одной странице */
#define FIO_COL 32   /* ширина колонки ФИО в выводе */
#define POS_COL 25   /* ширина колонки Должность в выводе */
//удалить  пробелы в конце строки
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

int get_day(const char *birth) {
  return (birth[0] - '0') * 10 + (birth[1] - '0');
}
int get_month(const char *birth) {
  return (birth[3] - '0') * 10 + (birth[4] - '0');
}
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

// Показывает записи постранично с навигацией.
void view_pages(Worker **idx, int n, const char *title, const char *key_info) {
  int pages = (n + PAGE_SIZE - 1) / PAGE_SIZE;
  int page = 0;

  while (1) {
    int start = page * PAGE_SIZE;
    int end = start + PAGE_SIZE;
    if (end > n)
      end = n;

    printf("\n%s\n", title);
    if (key_info[0] != '\0')
      printf("%s\n", key_info);
    print_header();

    int i;
    for (i = start; i < end; i++)
      print_worker(i + 1, idx[i]);

    printf("\nn - вперёд, p - назад, q - выход: ");

    int cmd = getchar();
    flush_stdin();

    if (cmd == 'q' || cmd == 'Q' || cmd == EOF)
      break;
    if ((cmd == 'n' || cmd == 'N') && page + 1 < pages)
      page++;
    if ((cmd == 'p' || cmd == 'P') && page > 0)
      page--;
  }
}

struct QueueNode {
  Worker *rec;
  QueueNode *next;
};

struct Queue {
  QueueNode *head;
  QueueNode *tail;
};

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
void show_queue_result(Queue *q, const char *title, const char *not_found_msg) {
  int count = queue_count(q);

  if (count == 0) {
    printf("%s\n", not_found_msg);
    queue_free(q);
    return;
  }

  printf("Найдено записей: %d\n", count);

  Worker **q_idx = (Worker **)malloc(count * sizeof(Worker *));
  QueueNode *node = q->head;
  int i = 0;
  while (node != NULL) {
    q_idx[i] = node->rec;
    i++;
    node = node->next;
  }

  view_pages(q_idx, count, title, "");

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
Worker **binary_search_year(Worker **idx, int n, int year) {
  Worker **lo = idx;
  Worker **hi = idx + n - 1;

  while (lo <= hi) {
    Worker **mid = lo + (hi - lo) / 2;
    int y = get_year((*mid)->birth);

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
void search_by_date(Worker **idx, int n) {
  char line[64];

  printf("\nПример: год (46), месяц и год (08 46) или день, месяц "
         "и год (08 03 46)\n");
  printf("Введите дату рождения для поиска: ");

  fgets(line, sizeof(line), stdin);

  int v1 = -1, v2 = -1, v3 = -1;
  int parts = sscanf(line, "%d %d %d", &v1, &v2, &v3);

  int year, month, day;

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

  Worker **first = pos;
  while (first > idx && get_year((*(first - 1))->birth) == year)
    first--;

  Worker **last = pos;
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
    snprintf(title, sizeof(title), "Очередь: месяц %02d, год %02d", month,
             year);
  else
    snprintf(title, sizeof(title), "Очередь: дата рождения %02d-%02d-%02d", day,
             month, year);

  show_queue_result(&q, title, "Записей с такой датой рождения не найдено.");
}

void search_by_fio(Worker **idx, int n) {
  char line[128];
  char query_cp866[128];

  printf("\nПример: Иванов Иван Иванович (можно и часть ФИО, "
         "например просто \"Иванов\")\n");
  printf("Введите ФИО для поиска: ");

  fgets(line, sizeof(line), stdin);

  int len = (int)strlen(line);
  if (len > 0 && line[len - 1] == '\n')
    line[len - 1] = '\0';

  utf8_to_cp866(line, query_cp866, sizeof(query_cp866));
  Queue q;
  queue_init(&q);

  int i;
  for (i = 0; i < n; i++)
    if (my_strstr(idx[i]->fio, query_cp866) != -1)
      queue_push(&q, idx[i]);

  char title[192];
  snprintf(title, sizeof(title), "Очередь: записи с ФИО \"%s\"", line);

  char not_found[192];
  snprintf(not_found, sizeof(not_found), "Записей с ФИО \"%s\" не найдено.",
           line);

  show_queue_result(&q, title, not_found);
}

void search_by_position(Worker **idx, int n) {
  char line[128];
  char query_cp866[128];

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
  snprintf(not_found, sizeof(not_found),
           "Записей с должностью \"%s\" не найдено.", line);

  show_queue_result(&q, title, not_found);
}

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
  snprintf(not_found, sizeof(not_found), "Записей с отделом %d не найдено.",
           dept);

  show_queue_result(&q, title, not_found);
}

/* ДБД - двоичное Б-дерево 	 */
struct TNode {
  Worker *rec;
  TNode *Left;
  TNode *Right;
  int Balance; /* 1 - правая ссылка горизонтальная (на той же странице), 0 - вертикальная */
};

struct TStats {
  int size;
  long sum;
  int height;
  long depth_sum;
};

#define TREE_RANDOM_COUNT 100

// VR - рост дерева по вертикали, HR - по горизонтали
int VR, HR;
TNode *TRoot = NULL;

void tree_add(Worker *rec, TNode **p) {
  if (*p == NULL) {
    *p = (TNode *)malloc(sizeof(TNode));
    (*p)->rec = rec;
    (*p)->Left = NULL;
    (*p)->Right = NULL;
    (*p)->Balance = 0;
    VR = 1;
  } else if (get_year(rec->birth) < get_year((*p)->rec->birth)) {
    tree_add(rec, &(*p)->Left);
    if (VR) {
      if ((*p)->Balance == 0) {
        TNode *q = (*p)->Left;
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
        TNode *q = (*p)->Right;
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

void tree_insert(Worker *rec) {
  VR = 1;
  HR = 1;
  tree_add(rec, &TRoot);
}

int tree_count(TNode *p) {
  if (p == NULL)
    return 0;
  return 1 + tree_count(p->Left) + tree_count(p->Right);
}

void tree_collect(TNode *p, Worker **out, int *k) {
  if (p == NULL)
    return;
  tree_collect(p->Left, out, k);
  out[*k] = p->rec;
  (*k)++;
  tree_collect(p->Right, out, k);
}

void tree_find_year(TNode *p, int year, Queue *q) {
  if (p == NULL)
    return;
  int y = get_year(p->rec->birth);
  if (y > year) {
    tree_find_year(p->Left, year, q);
    return;
  }
  if (y < year) {
    tree_find_year(p->Right, year, q);
    return;
  }
  tree_find_year(p->Left, year, q);
  queue_push(q, p->rec);
  tree_find_year(p->Right, year, q);
}

void tree_stats(TNode *p, int depth, TStats *st) {
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

void tree_print_report(TNode *root) {
  TStats st = {0, 0, 0, 0};
  tree_stats(root, 1, &st);

  printf("размер:            %d\n", st.size);
  printf("контрольная сумма: %ld\n", st.sum);
  printf("высота:            %d\n", st.height);
  printf("средняя высота:    %.2f\n", (double)st.depth_sum / st.size);
}

void tree_free(TNode *p) {
  if (p == NULL)
    return;
  tree_free(p->Left);
  tree_free(p->Right);
  free(p);
}

void build_tree_by_fio(Worker **idx, int n) {
  char line[128];
  char query_cp866[128];

  printf("\nПример: Иванов (часть ФИО - по найденным записям построим ДБД "
         "по году рождения)\n");
  printf("Введите ФИО для поиска: ");

  fgets(line, sizeof(line), stdin);

  int len = (int)strlen(line);
  if (len > 0 && line[len - 1] == '\n')
    line[len - 1] = '\0';

  utf8_to_cp866(line, query_cp866, sizeof(query_cp866));

  Queue q;
  queue_init(&q);

  int i;
  for (i = 0; i < n; i++)
    if (my_strstr(idx[i]->fio, query_cp866) != -1)
      queue_push(&q, idx[i]);

  if (queue_count(&q) == 0) {
    printf("Записей с ФИО \"%s\" не найдено.\n", line);
    queue_free(&q);
    return;
  }

  TRoot = NULL;
  QueueNode *node = q.head;
  while (node != NULL) {
    tree_insert(node->rec);
    node = node->next;
  }
  queue_free(&q);

  int count = tree_count(TRoot);
  Worker **arr = (Worker **)malloc(count * sizeof(Worker *));
  int k = 0;
  tree_collect(TRoot, arr, &k);

  printf("В дереве записей: %d\n", count);
  view_pages(arr, count, "ДБД: обход слева направо (ключ - год рождения)", "");
  free(arr);
  tree_print_report(TRoot);

  printf("\nПример: 46 (год рождения)\n");
  printf("Введите год для поиска в дереве: ");
  fgets(line, sizeof(line), stdin);

  int year;
  if (sscanf(line, "%d", &year) != 1) {
    printf("Не понял ввод - нужно ввести число.\n");
  } else {
    Queue r;
    queue_init(&r);
    tree_find_year(TRoot, year, &r);

    char title[64];
    snprintf(title, sizeof(title), "ДБД: поиск по году %02d", year);
    show_queue_result(&r, title, "В дереве нет записей с таким годом.");
  }

  tree_free(TRoot);
  TRoot = NULL;
}

void build_tree_random(Worker **idx, int n) {
  int *pick = (int *)malloc(n * sizeof(int));
  int i;
  for (i = 0; i < n; i++)
    pick[i] = i;

  for (i = 0; i < TREE_RANDOM_COUNT; i++) {
    int j = i + rand() % (n - i);
    int t = pick[i];
    pick[i] = pick[j];
    pick[j] = t;
  }

  TRoot = NULL;
  for (i = 0; i < TREE_RANDOM_COUNT; i++)
    tree_insert(idx[pick[i]]);
  free(pick);

  int count = tree_count(TRoot);
  Worker **arr = (Worker **)malloc(count * sizeof(Worker *));
  int k = 0;
  tree_collect(TRoot, arr, &k);

  view_pages(arr, count, "ДБД из 100 случайных записей: обход слева направо", "");
  free(arr);
  tree_print_report(TRoot);

  tree_free(TRoot);
  TRoot = NULL;
}

int main(void) {
  srand((unsigned)time(NULL));
  int n;
  Worker *db = load_database(DB_FILE, &n);

  if (db == NULL) {
    printf("Файл %s не найден.\n", DB_FILE);
    return 1;
  }

  printf("Загружено записей: %d\n", n);
  Worker **idx_orig = (Worker **)malloc(n * sizeof(Worker *));
  Worker **idx_sorted = (Worker **)malloc(n * sizeof(Worker *));

  int i;
  for (i = 0; i < n; i++) {
    idx_orig[i] = &db[i];
    idx_sorted[i] = &db[i];
  }

  int sorted = 0; /* отсортирован ли idx_sorted прямо сейчас */

  while (1) {
    printf("\n1 - посмотреть базу до сортировки\n");
    printf("2 - посмотреть базу после сортировки (метод Хоара)\n");
    printf("3 - поиск по дате рождения (год / месяц+год / день+месяц+год)\n");
    printf("4 - поиск по ФИО (или части ФИО)\n");
    printf("5 - поиск по должности (или части должности)\n");
    printf("6 - поиск по номеру отдела\n");
    printf("7 - ДБД: дерево по году рождения из записей поиска по ФИО\n");
    printf("8 - ДБД из 100 случайных записей (задание 3.7)\n");
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
      build_tree_random(idx_sorted, n);
    }
  }

  free(idx_orig);
  free(idx_sorted);
  free(db);

  return 0;
}
