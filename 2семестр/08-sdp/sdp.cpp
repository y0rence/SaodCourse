#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define N 100

struct Vertex {
    int Data;
    Vertex *Left;
    Vertex *Right;
};

int A[N];
int B[N];

const char *Alf[34] = {"",  "А", "Б", "В", "Г", "Д", "Е", "Ё", "Ж", "З", "И", "Й",
                       "К", "Л", "М", "Н", "О", "П", "Р", "С", "Т", "У", "Ф", "Х",
                       "Ц", "Ч", "Ш", "Щ", "Ъ", "Ы", "Ь", "Э", "Ю", "Я"};

void Obhod(Vertex *p) {
    if (p != NULL) {
        Obhod(p->Left);
        printf("%d ", p->Data);
        Obhod(p->Right);
    }
}

void ObhodBukvy(Vertex *p) {
    if (p != NULL) {
        ObhodBukvy(p->Left);
        printf("%s ", Alf[p->Data]);
        ObhodBukvy(p->Right);
    }
}

int Size(Vertex *p) {
    if (p == NULL)
        return 0;
    else
        return 1 + Size(p->Left) + Size(p->Right);
}

int Sum(Vertex *p) {
    if (p == NULL)
        return 0;
    else
        return p->Data + Sum(p->Left) + Sum(p->Right);
}

int Max(int a, int b) {
    if (a > b)
        return a;
    else
        return b;
}

int Height(Vertex *p) {
    if (p == NULL)
        return 0;
    else
        return 1 + Max(Height(p->Left), Height(p->Right));
}

int SumPath(Vertex *p, int L) {
    if (p == NULL)
        return 0;
    else
        return L + SumPath(p->Left, L + 1) + SumPath(p->Right, L + 1);
}

double AvgHeight(Vertex *p) {
    return (double)SumPath(p, 1) / Size(p);
}

Vertex *ISDP(int L, int R) {
    if (L > R)
        return NULL;
    int m = (L + R + 1) / 2;
    Vertex *p = (Vertex *)malloc(sizeof(Vertex));
    p->Data = B[m];
    p->Left = ISDP(L, m - 1);
    p->Right = ISDP(m + 1, R);
    return p;
}

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

void AddSDPRec(int D, Vertex *&p) {
    if (p == NULL) {
        p = (Vertex *)malloc(sizeof(Vertex));
        p->Data = D;
        p->Left = NULL;
        p->Right = NULL;
    } else if (D < p->Data)
        AddSDPRec(D, p->Left);
    else if (D > p->Data)
        AddSDPRec(D, p->Right);
}

void FillRand() {
    int i = 0;
    while (i < N) {
        int x = rand() % 1000 + 1;
        int povtor = 0;
        for (int j = 0; j < i; j++) {
            if (A[j] == x)
                povtor = 1;
        }
        if (povtor == 0) {
            A[i] = x;
            i++;
        }
    }
}

void SortB() {
    for (int i = 0; i < N - 1; i++) {
        for (int j = 0; j < N - 1 - i; j++) {
            if (B[j] > B[j + 1]) {
                int t = B[j];
                B[j] = B[j + 1];
                B[j + 1] = t;
            }
        }
    }
}

void PrintLine() {
    printf("+-------+--------+-------------+--------+--------------+\n");
}

void PrintRow(const char *name, Vertex *Root) {
    printf("| %s | %6d | %11d | %6d | %12.2f |\n", name, Size(Root), Sum(Root), Height(Root),
           AvgHeight(Root));
}

int main() {
    srand(time(NULL));

    int FIO[12] = {16, 2, 6, 18, 14, 12, 19, 4, 11, 3, 13, 1};
    Vertex *RootF1 = NULL;
    Vertex *RootF2 = NULL;
    for (int i = 0; i < 12; i++) {
        AddSDP(FIO[i], &RootF1);
        AddSDPRec(FIO[i], RootF2);
    }
    printf("Задание 1. СДП из букв ФИО: О Б Е Р М К С Г Й В Л А\n");
    printf("Обход слева направо (СДП1): ");
    ObhodBukvy(RootF1);
    printf("\nОбход слева направо (СДП2): ");
    ObhodBukvy(RootF2);
    printf("\nРазмер = %d, Контр.сумма = %d, Высота = %d, Средн.высота = %.2f\n\n", Size(RootF1),
           Sum(RootF1), Height(RootF1), AvgHeight(RootF1));

    FillRand();
    for (int i = 0; i < N; i++)
        B[i] = A[i];
    SortB();

    Vertex *Root1 = NULL;
    Vertex *Root2 = NULL;
    for (int i = 0; i < N; i++) {
        AddSDP(A[i], &Root1);
        AddSDPRec(A[i], Root2);
    }
    Vertex *RootI = ISDP(0, N - 1);

    printf("Исходная последовательность:\n");
    for (int i = 0; i < N; i++) {
        printf("%4d", A[i]);
        if ((i + 1) % 20 == 0)
            printf("\n");
    }

    printf("\nОбход слева направо СДП1 (двойная косвенность):\n");
    Obhod(Root1);
    printf("\n\nОбход слева направо СДП2 (рекурсия):\n");
    Obhod(Root2);
    printf("\n\nОбход слева направо ИСДП:\n");
    Obhod(RootI);
    printf("\n\n");

    PrintLine();
    printf("| n=100 | Размер | Контр.сумма | Высота | Средн.высота |\n");
    PrintLine();
    PrintRow("ИСДП ", RootI);
    PrintRow("СДП1 ", Root1);
    PrintRow("СДП2 ", Root2);
    PrintLine();
    printf("СДП1 - двойная косвенность, СДП2 - рекурсия\n");

    return 0;
}
