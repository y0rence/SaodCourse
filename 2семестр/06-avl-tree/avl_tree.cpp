#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define N 100

struct Vertex {
    int Data;
    int Balance;
    Vertex *Left;
    Vertex *Right;
};

bool Rost;

void LL(Vertex *&p) {
    Vertex *q = p->Left;
    q->Balance = 0;
    p->Balance = 0;
    p->Left = q->Right;
    q->Right = p;
    p = q;
}

void LR(Vertex *&p) {
    Vertex *q = p->Left;
    Vertex *r = q->Right;
    if (r->Balance < 0)
        p->Balance = 1;
    else
        p->Balance = 0;
    if (r->Balance > 0)
        q->Balance = -1;
    else
        q->Balance = 0;
    r->Balance = 0;
    p->Left = r->Right;
    q->Right = r->Left;
    r->Left = q;
    r->Right = p;
    p = r;
}

void RR(Vertex *&p) {
    Vertex *q = p->Right;
    q->Balance = 0;
    p->Balance = 0;
    p->Right = q->Left;
    q->Left = p;
    p = q;
}

void RL(Vertex *&p) {
    Vertex *q = p->Right;
    Vertex *r = q->Left;
    if (r->Balance > 0)
        p->Balance = -1;
    else
        p->Balance = 0;
    if (r->Balance < 0)
        q->Balance = 1;
    else
        q->Balance = 0;
    r->Balance = 0;
    p->Right = r->Left;
    q->Left = r->Right;
    r->Left = p;
    r->Right = q;
    p = r;
}

void AddAVL(int D, Vertex *&p) {
    if (p == NULL) {
        p = new Vertex;
        p->Data = D;
        p->Left = NULL;
        p->Right = NULL;
        p->Balance = 0;
        Rost = true;
    } else if (p->Data > D) {
        AddAVL(D, p->Left);
        if (Rost == true) {
            if (p->Balance > 0) {
                p->Balance = 0;
                Rost = false;
            } else if (p->Balance == 0) {
                p->Balance = -1;
            } else {
                if (p->Left->Balance < 0)
                    LL(p);
                else
                    LR(p);
                Rost = false;
            }
        }
    } else if (p->Data < D) {
        AddAVL(D, p->Right);
        if (Rost == true) {
            if (p->Balance < 0) {
                p->Balance = 0;
                Rost = false;
            } else if (p->Balance == 0) {
                p->Balance = 1;
            } else {
                if (p->Right->Balance > 0)
                    RR(p);
                else
                    RL(p);
                Rost = false;
            }
        }
    } else {
        Rost = false;
    }
}

int A[N + 1];

Vertex *ISDP(int L, int R) {
    if (L > R)
        return NULL;
    int m = (L + R) / 2;
    Vertex *p = new Vertex;
    p->Data = A[m];
    p->Balance = 0;
    p->Left = ISDP(L, m - 1);
    p->Right = ISDP(m + 1, R);
    return p;
}

void LeftToRight(Vertex *p) {
    if (p != NULL) {
        LeftToRight(p->Left);
        printf("%d ", p->Data);
        LeftToRight(p->Right);
    }
}

int Size(Vertex *p) {
    if (p == NULL)
        return 0;
    return 1 + Size(p->Left) + Size(p->Right);
}

int Max(int a, int b) {
    if (a > b)
        return a;
    return b;
}

int Height(Vertex *p) {
    if (p == NULL)
        return 0;
    return 1 + Max(Height(p->Left), Height(p->Right));
}

int SDP(Vertex *p, int L) {
    if (p == NULL)
        return 0;
    return L + SDP(p->Left, L + 1) + SDP(p->Right, L + 1);
}

int Sum(Vertex *p) {
    if (p == NULL)
        return 0;
    return p->Data + Sum(p->Left) + Sum(p->Right);
}

void FreeTree(Vertex *p) {
    if (p != NULL) {
        FreeTree(p->Left);
        FreeTree(p->Right);
        delete p;
    }
}

void FillRand(int n) {
    int i = 1;
    while (i <= n) {
        int x = rand() % 1000;
        bool est = false;
        for (int j = 1; j < i; j++)
            if (A[j] == x)
                est = true;
        if (est == false) {
            A[i] = x;
            i++;
        }
    }
}

void SelectSort(int n) {
    for (int i = 1; i < n; i++) {
        int k = i;
        for (int j = i + 1; j <= n; j++)
            if (A[j] < A[k])
                k = j;
        int t = A[i];
        A[i] = A[k];
        A[k] = t;
    }
}

int main() {

    int F[12] = {16, 2, 6, 18, 14, 12, 19, 4, 11, 3, 13, 1};
    Vertex *RootF = NULL;

    for (int i = 0; i < 12; i++)
        AddAVL(F[i], RootF);

    printf("Zadanie 1. Proverka na 12 simvolah FIO\n");
    printf("Posledovatelnost:     ");
    for (int i = 0; i < 12; i++)
        printf("%d ", F[i]);
    printf("\nObhod sleva napravo:  ");
    LeftToRight(RootF);
    printf("\nKoren = %d, Razmer = %d, Vysota = %d\n\n", RootF->Data, Size(RootF), Height(RootF));
    FreeTree(RootF);

    srand(time(NULL));
    FillRand(N);

    Vertex *AVL = NULL;
    for (int i = 1; i <= N; i++)
        AddAVL(A[i], AVL);

    printf("Zadanie 3. AVL-derevo iz %d sluchainyh vershin\n", N);
    printf("Obhod sleva napravo:\n");
    LeftToRight(AVL);
    printf("\n\n");

    SelectSort(N);
    Vertex *Isdp = ISDP(1, N);

    printf("Zadanie 4. Sravnenie ISDP i AVL\n");
    printf("+-------+--------+-------------+--------+-------------+\n");
    printf("| n=%-3d | Razmer | Kontr.summa | Vysota | Sred.vysota |\n", N);
    printf("+-------+--------+-------------+--------+-------------+\n");
    printf("| ISDP  | %6d | %11d | %6d | %11.2f |\n", Size(Isdp), Sum(Isdp), Height(Isdp),
           (double)SDP(Isdp, 1) / Size(Isdp));
    printf("| AVL   | %6d | %11d | %6d | %11.2f |\n", Size(AVL), Sum(AVL), Height(AVL),
           (double)SDP(AVL, 1) / Size(AVL));
    printf("+-------+--------+-------------+--------+-------------+\n");

    FreeTree(AVL);
    FreeTree(Isdp);
    return 0;
}
