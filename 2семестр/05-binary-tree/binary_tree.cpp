

#include <iomanip>
#include <iostream>
#include <stdlib.h>
#include <time.h>

using namespace std;

struct Vertex {
    int data;
    struct Vertex *left;
    struct Vertex *right;
};

struct Vertex *createVertex() {
    struct Vertex *p = new Vertex;
    p->data = rand() % 20 + 1;
    p->left = NULL;
    p->right = NULL;
    return p;
}

struct Vertex *buildTree20() {
    struct Vertex *a = createVertex();
    struct Vertex *b = createVertex();
    struct Vertex *c = createVertex();
    struct Vertex *d = createVertex();
    struct Vertex *e = createVertex();
    struct Vertex *f = createVertex();

    a->left = b;
    a->right = c;

    b->left = d;

    d->left = e;
    d->right = f;

    return a;
}

void topDown(struct Vertex *p) {
    if (p != NULL) {
        cout << p->data << " ";
        topDown(p->left);
        topDown(p->right);
    }
}

void leftRight(struct Vertex *p) {
    if (p != NULL) {
        leftRight(p->left);
        cout << p->data << " ";
        leftRight(p->right);
    }
}

void bottomUp(struct Vertex *p) {
    if (p != NULL) {
        bottomUp(p->left);
        bottomUp(p->right);
        cout << p->data << " ";
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
    if (p == NULL)
        return 0;

    int hLeft = treeHeight(p->left);
    int hRight = treeHeight(p->right);

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

int main() {
    srand(time(NULL));

    struct Vertex *root = buildTree20();

    cout << "Обход сверху вниз:   ";
    topDown(root);
    cout << endl;

    cout << "Обход слева направо: ";
    leftRight(root);
    cout << endl;

    cout << "Обход снизу вверх:   ";
    bottomUp(root);
    cout << endl << endl;

    cout << "Размер дерева:         " << treeSize(root) << endl;
    cout << "Контрольная сумма:     " << checkSum(root) << endl;
    cout << "Высота дерева:         " << treeHeight(root) << endl;
    cout << "Средняя высота дерева: " << fixed << setprecision(2) << averageHeight(root) << endl;

    return 0;
}
