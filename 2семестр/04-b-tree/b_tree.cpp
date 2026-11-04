#include <stdio.h>
#include <stdlib.h>
#include <time.h>

struct Vertex {
    int data;
    Vertex *left;
    Vertex *right;
    int balance;
};

bool VR, HR;

void addDBD(int D, Vertex *&p) {
    if (p == NULL) {
        p = new Vertex;
        p->data = D;
        p->left = NULL;
        p->right = NULL;
        p->balance = 0;
        VR = true;
    } else {
        if (p->data > D) {
            addDBD(D, p->left);
            if (VR) {
                if (p->balance == 0) {
                    Vertex *q = p->left;
                    p->left = q->right;
                    q->right = p;
                    p = q;
                    q->balance = 1;
                    VR = false;
                    HR = true;
                } else {
                    p->balance = 0;
                    HR = true;
                }
            } else {
                HR = false;
            }
        } else if (p->data < D) {
            addDBD(D, p->right);
            if (VR) {
                p->balance = 1;
                VR = false;
                HR = true;
            } else if (HR) {
                if (p->balance > 0) {
                    Vertex *q = p->right;
                    p->right = q->left;
                    p->balance = 0;
                    q->balance = 0;
                    q->left = p;
                    p = q;
                    VR = true;
                    HR = false;
                } else {
                    HR = false;
                }
            }
        }
    }
}

void LLTurn(Vertex *&p) {
    Vertex *q = p->left;
    p->balance = 0;
    q->balance = 0;
    p->left = q->right;
    q->right = p;
    p = q;
}

void LRTurn(Vertex *&p) {
    Vertex *q = p->left;
    Vertex *r = q->right;
    if (r->balance < 0)
        p->balance = 1;
    else
        p->balance = 0;
    if (r->balance > 0)
        q->balance = -1;
    else
        q->balance = 0;
    r->balance = 0;
    q->right = r->left;
    p->left = r->right;
    r->left = q;
    r->right = p;
    p = r;
}

void RRTurn(Vertex *&p) {
    Vertex *q = p->right;
    p->balance = 0;
    q->balance = 0;
    p->right = q->left;
    q->left = p;
    p = q;
}

void RLTurn(Vertex *&p) {
    Vertex *q = p->right;
    Vertex *r = q->left;
    if (r->balance > 0)
        p->balance = -1;
    else
        p->balance = 0;
    if (r->balance < 0)
        q->balance = 1;
    else
        q->balance = 0;
    r->balance = 0;
    q->left = r->right;
    p->right = r->left;
    r->right = q;
    r->left = p;
    p = r;
}

void AddAVL(int D, Vertex *&p, bool &rost) {
    if (p == NULL) {
        p = new Vertex;
        p->data = D;
        p->left = NULL;
        p->right = NULL;
        p->balance = 0;
        rost = true;
    } else if (p->data > D) {
        AddAVL(D, p->left, rost);
        if (rost) {
            if (p->balance > 0) {
                p->balance = 0;
                rost = false;
            } else if (p->balance == 0) {
                p->balance = -1;
                rost = true;
            } else {
                if (p->left->balance < 0) {
                    LLTurn(p);
                    rost = false;
                } else {
                    LRTurn(p);
                    rost = false;
                }
            }
        }
    } else if (p->data < D) {
        AddAVL(D, p->right, rost);
        if (rost) {
            if (p->balance < 0) {
                p->balance = 0;
                rost = false;
            } else if (p->balance == 0) {
                p->balance = 1;
                rost = true;
            } else {
                if (p->right->balance > 0) {
                    RRTurn(p);
                    rost = false;
                } else {
                    RLTurn(p);
                    rost = false;
                }
            }
        }
    } else {
        rost = false;
    }
}

void printLeftToRight(Vertex *p) {
    if (p != NULL) {
        printLeftToRight(p->left);
        printf("%d ", p->data);
        printLeftToRight(p->right);
    }
}

int treeSize(Vertex *p) {
    if (p == NULL)
        return 0;
    return 1 + treeSize(p->left) + treeSize(p->right);
}

int treeHeight(Vertex *p) {
    if (p == NULL)
        return 0;
    int leftHeight = treeHeight(p->left);
    int rightHeight = treeHeight(p->right);
    if (leftHeight > rightHeight)
        return 1 + leftHeight;
    return 1 + rightHeight;
}

int pathSum(Vertex *p, int level) {
    if (p == NULL)
        return 0;
    return level + pathSum(p->left, level + 1) + pathSum(p->right, level + 1);
}

int treeSum(Vertex *p) {
    if (p == NULL)
        return 0;
    return p->data + treeSum(p->left) + treeSum(p->right);
}

double averageHeight(Vertex *root) {
    return (double)pathSum(root, 1) / treeSize(root);
}

void deleteTree(Vertex *&p) {
    if (p != NULL) {
        deleteTree(p->left);
        deleteTree(p->right);
        delete p;
        p = NULL;
    }
}

int main() {
    const int n = 100;
    int numbers[n];
    Vertex *dbdRoot = NULL;
    Vertex *avlRoot = NULL;

    srand((unsigned int)time(NULL));

    for (int i = 0; i < n; i++) {
        numbers[i] = i + 1;
    }

    for (int i = n - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        int temp = numbers[i];
        numbers[i] = numbers[j];
        numbers[j] = temp;
    }

    printf("Случайная последовательность:\n");
    for (int i = 0; i < n; i++) {
        printf("%d ", numbers[i]);

        VR = false;
        HR = false;
        addDBD(numbers[i], dbdRoot);

        bool rost = false;
        AddAVL(numbers[i], avlRoot, rost);
    }

    printf("\n\nОбход ДБД слева направо:\n");
    printLeftToRight(dbdRoot);

    printf("\n\n---------------------------------------------------------------\n");
    printf("n=100 | Размер | Контр. сумма | Высота | Средняя высота\n");
    printf("---------------------------------------------------------------\n");
    printf("АВЛ   | %6d | %12d | %6d | %14.2f\n", treeSize(avlRoot), treeSum(avlRoot),
           treeHeight(avlRoot), averageHeight(avlRoot));
    printf("ДБД   | %6d | %12d | %6d | %14.2f\n", treeSize(dbdRoot), treeSum(dbdRoot),
           treeHeight(dbdRoot), averageHeight(dbdRoot));
    printf("---------------------------------------------------------------\n");

    deleteTree(dbdRoot);
    deleteTree(avlRoot);
    return 0;
}
