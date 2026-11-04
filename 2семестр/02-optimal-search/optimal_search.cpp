#include <stdio.h>
#include <stdlib.h>

#define MAXN 100

struct Node {
    int key;
    int w;
    struct Node *left;
    struct Node *right;
};

int Aw[MAXN + 1][MAXN + 1];
int Ap[MAXN + 1][MAXN + 1];
int Ar[MAXN + 1][MAXN + 1];

int W[MAXN + 1];

void ComputeAW(int n) {
    for (int i = 0; i <= n; i++) {
        Aw[i][i] = 0;
        for (int j = i + 1; j <= n; j++) {
            Aw[i][j] = Aw[i][j - 1] + W[j];
        }
    }
}

void ComputeAPAR(int n) {
    for (int i = 0; i <= n - 1; i++) {
        Ap[i][i + 1] = Aw[i][i + 1];
        Ar[i][i + 1] = i + 1;
    }
    for (int h = 2; h <= n; h++) {
        for (int i = 0; i <= n - h; i++) {
            int j = i + h;
            int m = Ar[i][j - 1];
            int min = Ap[i][m - 1] + Ap[m][j];
            for (int k = m + 1; k <= Ar[i + 1][j]; k++) {
                int x = Ap[i][k - 1] + Ap[k][j];
                if (x < min) {
                    m = k;
                    min = x;
                }
            }
            Ap[i][j] = min + Aw[i][j];
            Ar[i][j] = m;
        }
    }
}

void PrintMatrix(const char *name, int M[][MAXN + 1], int n) {
    printf("Матрица %s:\n", name);
    printf("     ");
    for (int j = 0; j <= n; j++)
        printf("%6d", j);
    printf("\n");
    for (int i = 0; i <= n; i++) {
        printf("%4d ", i);
        for (int j = 0; j <= n; j++) {
            if (j < i)
                printf("      ");
            else
                printf("%6d", M[i][j]);
        }
        printf("\n");
    }
    printf("\n");
}

void AddToTree(struct Node **root, int key, int w) {
    if (*root == NULL) {
        struct Node *p = (struct Node *)malloc(sizeof(struct Node));
        p->key = key;
        p->w = w;
        p->left = NULL;
        p->right = NULL;
        *root = p;
    } else if (key < (*root)->key) {
        AddToTree(&((*root)->left), key, w);
    } else {
        AddToTree(&((*root)->right), key, w);
    }
}

void CreateTree(int L, int R, struct Node **root) {
    if (L < R) {
        int k = Ar[L][R];
        AddToTree(root, k, W[k]);
        CreateTree(L, k - 1, root);
        CreateTree(k, R, root);
    }
}

void InOrder(struct Node *p) {
    if (p != NULL) {
        InOrder(p->left);
        printf("%d(%d) ", p->key, p->w);
        InOrder(p->right);
    }
}

int TreeSize(struct Node *p) {
    if (p == NULL)
        return 0;
    return 1 + TreeSize(p->left) + TreeSize(p->right);
}

int TreeCheckSum(struct Node *p) {
    if (p == NULL)
        return 0;
    return p->key + TreeCheckSum(p->left) + TreeCheckSum(p->right);
}

int TreeHeight(struct Node *p) {
    if (p == NULL)
        return 0;
    int hl = TreeHeight(p->left);
    int hr = TreeHeight(p->right);
    return 1 + (hl > hr ? hl : hr);
}

int WeightedHeight(struct Node *p, int level) {
    if (p == NULL)
        return 0;
    return p->w * level + WeightedHeight(p->left, level + 1) + WeightedHeight(p->right, level + 1);
}

void FreeTree(struct Node *p) {
    if (p != NULL) {
        FreeTree(p->left);
        FreeTree(p->right);
        free(p);
    }
}

struct Node *BuildOptimalTree(int n, int printMatrices) {
    ComputeAW(n);
    ComputeAPAR(n);
    if (printMatrices) {
        PrintMatrix("весов AW", Aw, n);
        PrintMatrix("взвешенных высот AP", Ap, n);
        PrintMatrix("корней AR", Ar, n);
    }
    struct Node *root = NULL;
    CreateTree(0, n, &root);
    return root;
}

int main() {
    printf("=== Тест 1: пример из пособия ===\n\n");
    int n = 3;
    W[1] = 60;
    W[2] = 30;
    W[3] = 10;
    struct Node *root = BuildOptimalTree(n, 1);
    printf("Обход слева направо: ");
    InOrder(root);
    printf("\n");
    printf("AP[0][n] = %d, AW[0][n] = %d, AP/AW = %.2f\n", Ap[0][n], Aw[0][n],
           (double)Ap[0][n] / Aw[0][n]);
    printf("Средневзвешенная высота дерева = %.2f\n\n", (double)WeightedHeight(root, 1) / Aw[0][n]);
    FreeTree(root);

    printf("=== Задание 3: n = 100, случайные веса от 1 до 100 ===\n\n");
    srand(2024);
    n = 100;
    for (int i = 1; i <= n; i++) {
        W[i] = rand() % 100 + 1;
    }
    printf("Веса вершин:\n");
    for (int i = 1; i <= n; i++)
        printf("%d ", W[i]);
    printf("\n\n");

    root = BuildOptimalTree(n, 0);

    printf("Обход слева направо (ключ(вес)):\n");
    InOrder(root);
    printf("\n\n");

    int P = WeightedHeight(root, 1);
    double avg = (double)P / Aw[0][n];
    printf("Проверка точного алгоритма:\n");
    printf("AP[0][n] = %d, AW[0][n] = %d\n", Ap[0][n], Aw[0][n]);
    printf("AP[0][n] / AW[0][n]               = %.4f\n", (double)Ap[0][n] / Aw[0][n]);
    printf("Средневзвешенная высота по дереву = %.4f\n", avg);
    if (P == Ap[0][n])
        printf("Значения совпадают - алгоритм работает верно\n\n");
    else
        printf("Значения НЕ совпадают - есть ошибка\n\n");

    printf("=== Задание 4: таблица ===\n\n");
    printf("| n=100 | Размер | Контр. сумма | Высота | Средневзвеш. высота |\n");
    printf("| ДОП   | %6d | %12d | %6d | %19.4f |\n", TreeSize(root), TreeCheckSum(root),
           TreeHeight(root), avg);

    FreeTree(root);
    return 0;
}
