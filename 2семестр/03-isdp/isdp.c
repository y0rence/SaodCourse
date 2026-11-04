#include <stdio.h>
#include <stdlib.h>
#include <time.h>

struct Vertex {
    int data;
    struct Vertex *left;
    struct Vertex *right;
};

void sortArray(int A[], int n) {
    int i, j, x;

    for (i = 2; i <= n; i++) {
        x = A[i];
        j = i - 1;
        while (j >= 1 && A[j] > x) {
            A[j + 1] = A[j];
            j--;
        }
        A[j + 1] = x;
    }
}

struct Vertex *buildISDP(int A[], int L, int R) {
    int m;
    struct Vertex *p;

    if (L > R)
        return NULL;

    m = (L + R) / 2;

    p = (struct Vertex *)malloc(sizeof(struct Vertex));
    p->data = A[m];
    p->left = buildISDP(A, L, m - 1);
    p->right = buildISDP(A, m + 1, R);

    return p;
}

void leftRight(struct Vertex *p) {
    if (p != NULL) {
        leftRight(p->left);
        printf("%d ", p->data);
        leftRight(p->right);
    }
}

void leftRightChar(struct Vertex *p) {
    if (p != NULL) {
        leftRightChar(p->left);
        printf("%c ", p->data);
        leftRightChar(p->right);
    }
}

int treeSize(struct Vertex *p) {
    if (p == NULL)
        return 0;
    return 1 + treeSize(p->left) + treeSize(p->right);
}

int checkSum(struct Vertex *p) {
    if (p == NULL)
        return 0;
    return p->data + checkSum(p->left) + checkSum(p->right);
}

int treeHeight(struct Vertex *p) {
    int hLeft, hRight;

    if (p == NULL)
        return 0;

    hLeft = treeHeight(p->left);
    hRight = treeHeight(p->right);

    if (hLeft > hRight)
        return 1 + hLeft;
    else
        return 1 + hRight;
}

int sumOfPaths(struct Vertex *p, int L) {
    if (p == NULL)
        return 0;
    return L + sumOfPaths(p->left, L + 1) + sumOfPaths(p->right, L + 1);
}

double averageHeight(struct Vertex *root) {
    return (double)sumOfPaths(root, 1) / treeSize(root);
}

void printStats(struct Vertex *root) {
    printf("Размер дерева:         %d\n", treeSize(root));
    printf("Контрольная сумма:     %d\n", checkSum(root));
    printf("Высота дерева:         %d\n", treeHeight(root));
    printf("Средняя высота дерева: %.2f\n", averageHeight(root));
}

void deleteTree(struct Vertex *p) {
    if (p != NULL) {
        deleteTree(p->left);
        deleteTree(p->right);
        free(p);
    }
}

void task1(void) {
    int A[] = {0, 'O', 'B', 'E', 'R', 'M', 'K', 'S', 'G', 'Y', 'V', 'L', 'A'};
    int n = 12;
    int i;
    struct Vertex *root;

    printf("===== Задание 1: ИСДП из 12 неповторяющихся символов ФИО =====\n");

    printf("Исходный массив A:   ");
    for (i = 1; i <= n; i++)
        printf("%c ", A[i]);
    printf("\n");

    sortArray(A, n);

    printf("Упорядоченный Aупор: ");
    for (i = 1; i <= n; i++)
        printf("%c ", A[i]);
    printf("\n");

    root = buildISDP(A, 1, n);

    printf("Обход слева направо: ");
    leftRightChar(root);
    printf("\n\n");

    printStats(root);
    printf("\n");

    deleteTree(root);
}

void task2(void) {
    int A[101];
    int n = 100;
    int i;
    struct Vertex *root;

    printf("===== Задания 2-3: ИСДП из 100 вершин =====\n");

    for (i = 1; i <= n; i++)
        A[i] = rand() % 999 + 1;

    sortArray(A, n);

    root = buildISDP(A, 1, n);

    printf("Обход дерева слева направо:\n");
    leftRight(root);
    printf("\n\n");

    printStats(root);

    deleteTree(root);
}

int main(void) {
    srand(time(NULL));

    task1();
    task2();

    return 0;
}
