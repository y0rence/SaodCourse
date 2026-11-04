#include <iomanip>
#include <iostream>
#include <stdlib.h>
#include <time.h>

using namespace std;

int A[12];

void FillRand() {
    srand(time(NULL));
    int i = 0;
    while (i < 15) {
        int x = rand() % 1000 + 1;
        int fl = 0;
        for (int j = 0; j < i; j++) {
            if (A[j] == x) {
                fl = 1;
            }
        }
        if (fl == 0) {
            A[i] = x;
            i++;
        }
    }
}

struct Vertex {
    int Data;
    Vertex *Left;
    Vertex *Right;
    int Balance;
};

void ObhodLeftToRight(Vertex *p) {
    if (p != NULL) {
        ObhodLeftToRight(p->Left);
        cout << p->Data << " ";
        ObhodLeftToRight(p->Right);
    }
}

void LLTurn(Vertex *&p) {
    Vertex *q = p->Left;
    p->Balance = 0;
    q->Balance = 0;
    p->Left = q->Right;
    q->Right = p;
    p = q;
}

void LL1Turn(Vertex *&p, bool &umen) {
    Vertex *q = p->Left;

    if (q->Balance == 0) {
        q->Balance = 1;
        p->Balance = -1;
        umen = false;
    } else {
        q->Balance = 0;
        p->Balance = 0;
    }

    p->Left = q->Right;
    q->Right = p;
    p = q;
}

void RRTurn(Vertex *&p) {
    Vertex *q = p->Right;
    p->Balance = 0;
    q->Balance = 0;
    p->Right = q->Left;
    q->Left = p;
    p = q;
}

void RR1Turn(Vertex *&p, bool &umen) {
    Vertex *q = p->Right;

    if (q->Balance == 0) {
        q->Balance = -1;
        p->Balance = 1;
        umen = false;
    } else {
        q->Balance = 0;
        p->Balance = 0;
    }

    p->Right = q->Left;
    q->Left = p;
    p = q;
}

void LRTurn(Vertex *&p) {
    Vertex *q = p->Left;
    Vertex *r = q->Right;

    if (r->Balance < 0) {
        p->Balance = 1;
    } else
        p->Balance = 0;

    if (r->Balance > 0) {
        q->Balance = -1;
    } else
        q->Balance = 0;

    r->Balance = 0;
    q->Right = r->Left;
    p->Left = r->Right;
    r->Left = q;
    r->Right = p;
    p = r;
}

void RLTurn(Vertex *&p) {
    Vertex *q = p->Right;
    Vertex *r = q->Left;

    if (r->Balance > 0) {
        p->Balance = -1;
    } else
        p->Balance = 0;

    if (r->Balance < 0) {
        q->Balance = 1;
    } else
        q->Balance = 0;

    r->Balance = 0;
    q->Left = r->Right;
    p->Right = r->Left;
    r->Right = q;
    r->Left = p;
    p = r;
}

void AddAVL(int D, Vertex *&p, bool &rost) {
    if (p == NULL) {
        p = new Vertex;
        p->Data = D;
        p->Left = NULL;
        p->Right = NULL;
        p->Balance = 0;
        rost = true;
    } else if (p->Data > D) {
        AddAVL(D, p->Left, rost);
        if (rost == true) {
            if (p->Balance > 0) {
                p->Balance = 0;
                rost = false;
            } else if (p->Balance == 0) {
                p->Balance = -1;
                rost = true;
            } else {
                if (p->Left->Balance < 0) {
                    LLTurn(p);
                    rost = false;
                } else {
                    LRTurn(p);
                    rost = false;
                }
            }
        }
    } else if (p->Data < D) {
        AddAVL(D, p->Right, rost);
        if (rost == true) {
            if (p->Balance < 0) {
                p->Balance = 0;
                rost = false;
            } else if (p->Balance == 0) {
                p->Balance = 1;
                rost = true;
            } else {
                if (p->Right->Balance > 0) {
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

void BL(Vertex *&p, bool &umen) {
    if (p->Balance == -1)
        p->Balance = 0;
    else if (p->Balance == 0) {
        p->Balance = 1;
        umen = false;
    } else if (p->Balance == 1) {
        if (p->Right->Balance >= 0) {
            RR1Turn(p, umen);
        } else
            RLTurn(p);
    }
}

void BR(Vertex *&p, bool &umen) {
    if (p->Balance == 1)
        p->Balance = 0;
    else if (p->Balance == 0) {
        p->Balance = -1;
        umen = false;
    } else if (p->Balance == -1) {
        if (p->Left->Balance <= 0) {
            LL1Turn(p, umen);
        } else
            LRTurn(p);
    }
}

void del(Vertex *&r, Vertex *&q, bool &umen) {
    if (r->Right != NULL) {
        del(r->Right, q, umen);
        if (umen == true)
            BR(r, umen);
    } else {
        q->Data = r->Data;
        q = r;
        r = r->Left;
        umen = true;
    }
}

void DeleteAVL(int x, Vertex *&p, bool &umen) {
    if (p == NULL)
        return;
    else if (x < p->Data) {
        DeleteAVL(x, p->Left, umen);
        if (umen == true)
            BL(p, umen);
    } else if (x > p->Data) {
        DeleteAVL(x, p->Right, umen);
        if (umen == true)
            BR(p, umen);
    } else {
        Vertex *q = p;
        if (q->Left == NULL) {
            p = q->Right;
            umen = true;
        } else if (q->Right == NULL) {
            p = q->Left;
            umen = true;
        } else {
            del(q->Left, q, umen);
            if (umen == true) {
                BL(p, umen);
            }
        }
        free(q);
    }
}

int Size(Vertex *p) {
    if (p == NULL)
        return 0;
    else {
        return 1 + Size(p->Left) + Size(p->Right);
    }
}

int main() {
    FillRand();
    Vertex *root = NULL;

    bool rost = false;
    bool umen = false;

    cout << "\nАВЛ-дерево:\n";
    for (int i = 0; i < 15; i++) {
        rost = false;
        AddAVL(A[i], root, rost);
    }
    ObhodLeftToRight(root);

    while (Size(root) != 5) {
        int n = 0;
        cout << "\n\nУдаляемая вершина\n";
        cin >> n;

        umen = false;
        DeleteAVL(n, root, umen);

        ObhodLeftToRight(root);
    }
}
