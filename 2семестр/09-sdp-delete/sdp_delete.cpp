#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define N 10

struct Vertex {
    int Data;
    Vertex *Left;
    Vertex *Right;
};

void AddSDP(int D, Vertex **Root) {
    Vertex **p = Root;
    while (*p != NULL) {
        if (D < (*p)->Data)
            p = &((*p)->Left);
        else if (D > (*p)->Data)
            p = &((*p)->Right);
        else
            break;
    }
    if (*p == NULL) {
        *p = (Vertex *)malloc(sizeof(Vertex));
        (*p)->Data = D;
        (*p)->Left = NULL;
        (*p)->Right = NULL;
    }
}

int DeleteSDP(int X, Vertex **Root) {
    Vertex **p, *q, *r, *s;

    p = Root;
    while (*p != NULL) {
        if ((*p)->Data < X)
            p = &((*p)->Right);
        else if ((*p)->Data > X)
            p = &((*p)->Left);
        else
            break;
    }

    if (*p != NULL) {
        q = *p;
        if (q->Left == NULL)
            *p = q->Right;
        else if (q->Right == NULL)
            *p = q->Left;
        else {
            r = q->Left;
            s = q;
            while (r->Right != NULL) {
                s = r;
                r = r->Right;
            }
            if (s != q) {
                s->Right = r->Left;
                r->Left = q->Left;
            }
            r->Right = q->Right;
            *p = r;
        }
        free(q);
        return 1;
    }
    return 0;
}

void ObhodBukvy(Vertex *p) {
    if (p != NULL) {
        ObhodBukvy(p->Left);
        printf("%c ", p->Data);
        ObhodBukvy(p->Right);
    }
}

void Obhod(Vertex *p) {
    if (p != NULL) {
        Obhod(p->Left);
        Obhod(p->Right);
        printf("%d ", p->Data);
    }
}

int main() {
    Vertex *Root = NULL;
    int i, vybor;

    srand(time(NULL));
    printf("1 - буквы ФИО\n");
    printf("2 - случайные числа\n");
    printf("Ваш выбор: ");
    scanf("%d", &vybor);

    if (vybor == 1) {
        int FIO[12] = {'O', 'B', 'E', 'R', 'M', 'K', 'S', 'G', 'Y', 'V', 'L', 'A'};
        for (i = 0; i < 12; i++)
            AddSDP(FIO[i], &Root);

        printf("Обход слева направо: ");
        ObhodBukvy(Root);
        printf("\n");

        for (i = 0; i < N; i++) {
            char x;
            printf("Введите вершину для удаления (%d из %d): ", i + 1, N);
            scanf(" %c", &x);
            if (DeleteSDP(x, &Root) == 0)
                printf("Вершины %c нет в дереве\n", x);
            printf("Обход: ");
            ObhodBukvy(Root);
            printf("\n");
        }
    } else {
        int n;
        printf("Сколько чисел сгенерировать (1..100): ");
        scanf("%d", &n);
        if (n < 1 || n > 100) {
            printf("Неверное количество\n");
            return 0;
        }

        int *A = (int *)malloc(n * sizeof(int));
        i = 0;
        while (i < n) {
            int x = rand() % 100 + 1;
            int povtor = 0;
            for (int j = 0; j < i; j++)
                if (A[j] == x)
                    povtor = 1;
            if (povtor == 0) {
                A[i] = x;
                i++;
            }
        }

        printf("Сгенерированные числа: ");
        for (i = 0; i < n; i++) {
            printf("%d ", A[i]);
            AddSDP(A[i], &Root);
        }
        printf("\nОбход слева направо: ");
        Obhod(Root);
        printf("\n");
        free(A);

        for (i = 0; i < N && Root != NULL; i++) {
            int x;
            printf("Введите вершину для удаления (%d из %d): ", i + 1, N);
            scanf("%d", &x);
            if (DeleteSDP(x, &Root) == 0)
                printf("Вершины %d нет в дереве\n", x);
            printf("Обход: ");
            Obhod(Root);
            printf("\n");
        }
        if (Root == NULL)
            printf("Дерево пустое\n");
    }

    return 0;
}
