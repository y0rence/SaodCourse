#include <algorithm>
#include <cstdlib>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <limits>

using namespace std;

struct Item {
    int data;
    int weight;
};

struct Vertex {
    int data;
    int weight;
    Vertex *left;
    Vertex *right;
    int bal;
};

void AddRec(int D, int W, Vertex *&p) {
    if (p == nullptr) {
        p = new Vertex;
        p->data = D;
        p->weight = W;
        p->left = nullptr;
        p->right = nullptr;
        p->bal = 0;
    } else if (D < p->data) {
        AddRec(D, W, p->left);
    } else if (D > p->data) {
        AddRec(D, W, p->right);
    }
}

Vertex *BuildA1(Item arr[], int n) {
    sort(arr, arr + n, [](const Item &a, const Item &b) { return a.weight > b.weight; });

    Vertex *root = nullptr;
    for (int i = 0; i < n; i++) {
        AddRec(arr[i].data, arr[i].weight, root);
    }
    return root;
}

void A2(Item arr[], int L, int R, Vertex *&root) {
    if (L > R)
        return;

    int wes = 0;
    for (int i = L; i <= R; i++) {
        wes += arr[i].weight;
    }

    int sum = 0;
    int idx = L;
    for (; idx <= R; idx++) {
        if (sum < wes / 2 && sum + arr[idx].weight >= wes / 2) {
            break;
        }
        sum += arr[idx].weight;
    }
    if (idx > R) {
        idx = R;
    }

    AddRec(arr[idx].data, arr[idx].weight, root);
    A2(arr, L, idx - 1, root);
    A2(arr, idx + 1, R, root);
}

Vertex *BuildA2(Item arr[], int n) {
    sort(arr, arr + n, [](const Item &a, const Item &b) { return a.data < b.data; });

    Vertex *root = nullptr;
    A2(arr, 0, n - 1, root);
    return root;
}

const int MAX_N = 100;
int AW[MAX_N][MAX_N];
int AP[MAX_N][MAX_N];
int AR[MAX_N][MAX_N];

void ComputeAW(const Item arr[], int n) {
    for (int i = 0; i < n; i++) {
        AW[i][i] = arr[i].weight;
        for (int j = i + 1; j < n; j++) {
            AW[i][j] = AW[i][j - 1] + arr[j].weight;
        }
    }
}

void ComputeAP_AR(const Item arr[], int n) {
    for (int i = 0; i < n; i++) {
        AR[i][i] = i;
        AP[i][i] = arr[i].weight;
    }

    for (int h = 2; h <= n; h++) {
        for (int i = 0; i <= n - h; i++) {
            int j = i + h - 1;

            int start_k = AR[i][j - 1];
            int end_k = (i + 1 <= j) ? AR[i + 1][j] : j;
            if (start_k > end_k) {
                swap(start_k, end_k);
            }

            int min_cost = numeric_limits<int>::max();
            int best_k = start_k;

            for (int k = start_k; k <= end_k; k++) {
                int left_cost = (k > i) ? AP[i][k - 1] : 0;
                int right_cost = (k < j) ? AP[k + 1][j] : 0;
                int current_cost = left_cost + right_cost;

                if (current_cost < min_cost) {
                    min_cost = current_cost;
                    best_k = k;
                }
            }

            AP[i][j] = min_cost + AW[i][j];
            AR[i][j] = best_k;
        }
    }
}

void CreateTree(const Item arr[], int L, int R, Vertex *&root) {
    if (L <= R) {
        int k = AR[L][R];
        AddRec(arr[k].data, arr[k].weight, root);

        if (k > L)
            CreateTree(arr, L, k - 1, root);
        if (k < R)
            CreateTree(arr, k + 1, R, root);
    }
}

Vertex *BuildDOP(Item arr[], int n) {
    sort(arr, arr + n, [](const Item &a, const Item &b) { return a.data < b.data; });

    ComputeAW(arr, n);
    ComputeAP_AR(arr, n);

    Vertex *root = nullptr;
    CreateTree(arr, 0, n - 1, root);
    return root;
}

int Size(Vertex *p) {
    if (p == nullptr)
        return 0;
    return 1 + Size(p->left) + Size(p->right);
}

int Sum(Vertex *p) {
    if (p == nullptr)
        return 0;
    return p->data + Sum(p->left) + Sum(p->right);
}

int Height(Vertex *p) {
    if (p == nullptr)
        return 0;
    return 1 + max(Height(p->left), Height(p->right));
}

int SummWeights(Vertex *p);

int SummWeightedDepth(Vertex *p, int depth) {
    if (p == nullptr)
        return 0;
    return depth * p->weight + SummWeightedDepth(p->left, depth + 1) +
           SummWeightedDepth(p->right, depth + 1);
}

double AvgWeightedDepth(Vertex *p) {
    int totalWeight = SummWeights(p);
    if (totalWeight == 0)
        return 0.0;
    return static_cast<double>(SummWeightedDepth(p, 1)) / totalWeight;
}

int SummWeights(Vertex *p) {
    if (p == nullptr)
        return 0;
    return p->weight + SummWeights(p->left) + SummWeights(p->right);
}

void LeftRight(Vertex *p) {
    if (p != nullptr) {
        LeftRight(p->left);
        cout << "{" << p->data << ", " << p->weight << "}; ";
        LeftRight(p->right);
    }
}

void DeleteTree(Vertex *p) {
    if (p != nullptr) {
        DeleteTree(p->left);
        DeleteTree(p->right);
        delete p;
    }
}

int main() {
    srand(static_cast<unsigned int>(time(nullptr)));

    const int n = MAX_N;
    Item dataA1[n], dataA2[n], dataDOP[n];
    Item original[n];

    Vertex *rootA1 = nullptr;
    Vertex *rootA2 = nullptr;
    Vertex *rootDOP = nullptr;

    int heightA1 = 0, heightA2 = 0, heightDOP = 0;

    for (int attempt = 0; attempt < 200; attempt++) {
        DeleteTree(rootDOP);
        DeleteTree(rootA1);
        DeleteTree(rootA2);
        rootDOP = rootA1 = rootA2 = nullptr;

        int randArr[n];
        for (int i = 0; i < n; i++) {
            randArr[i] = rand() % 1000 + 1;
            bool dubl = false;

            for (int j = 0; j < i; j++) {
                if (randArr[i] == randArr[j]) {
                    dubl = true;
                    break;
                }
            }
            if (dubl) {
                i--;
            }
        }

        for (int i = 0; i < n; i++) {
            int w = rand() % 100 + 1;
            original[i] = {randArr[i], w};
            dataA1[i] = original[i];
            dataA2[i] = original[i];
            dataDOP[i] = original[i];
        }

        rootA1 = BuildA1(dataA1, n);
        rootA2 = BuildA2(dataA2, n);
        rootDOP = BuildDOP(dataDOP, n);

        heightA1 = Height(rootA1);
        heightA2 = Height(rootA2);
        heightDOP = Height(rootDOP);

        if (heightDOP < heightA1 && heightDOP < heightA2) {
            break;
        }
    }

    cout << "Вывод данных, которые запишем в дерево А1, в формате 'Значение, "
            "Вес':\n\n";
    for (int i = 0; i < n; i++) {
        cout << i + 1 << ". " << original[i].data << ", " << original[i].weight << "; ";
    }

    cout << "\n\nОбход слева направо дерева А1:\n\n";
    LeftRight(rootA1);

    cout << "\n\nОбход слева направо дерева A2:\n\n";
    LeftRight(rootA2);

    int sizeA1 = Size(rootA1), sizeA2 = Size(rootA2), sizeDOP = Size(rootDOP);
    int sumA1 = Sum(rootA1), sumA2 = Sum(rootA2), sumDOP = Sum(rootDOP);

    double avgA1 = AvgWeightedDepth(rootA1);
    double avgA2 = AvgWeightedDepth(rootA2);
    double avgDOP = AvgWeightedDepth(rootDOP);

    cout << "\n\n|n=100   |Size    |Sum     |Height  |AvWeigh Height |\n";
    cout << "|A1      |" << setw(8) << sizeA1 << "|" << setw(8) << sumA1 << "|" << setw(8)
         << Height(rootA1) << "|" << setw(15) << fixed << setprecision(5) << avgA1 << "|\n";
    cout << "|A2      |" << setw(8) << sizeA2 << "|" << setw(8) << sumA2 << "|" << setw(8)
         << Height(rootA2) << "|" << setw(15) << fixed << setprecision(5) << avgA2 << "|\n";
    cout << "|DOP     |" << setw(8) << sizeDOP << "|" << setw(8) << sumDOP << "|" << setw(8)
         << Height(rootDOP) << "|" << setw(15) << fixed << setprecision(5) << avgDOP << "|\n";

    DeleteTree(rootDOP);
    DeleteTree(rootA1);
    DeleteTree(rootA2);

    return 0;
}
