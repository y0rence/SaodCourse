#include <iostream>
#include <string.h>
using namespace std;

int n = 0;
int m = 0;
int c = 0;
int M = 101;

int bruteForce(char *haystack, char *needle) {
    for (int i = 0; i <= n - m; i++) {
        int j = 0;
        while (j < m) {
            c++;
            if (haystack[i + j] != needle[j]) {
                break;
            }
            j++;
        }
        if (j == m)
            return i;
    }
    return -1;
}

int hashFunc(char *str, int len) {
    int h = 0;
    for (int i = 0; i < len; i++) {
        h = (h * 256 + (unsigned char)str[i]) % M;
    }
    return h;
}

int rabinKarp(char *haystack, char *needle) {
    int hashNeedle = hashFunc(needle, m);
    int hashHaystack = hashFunc(haystack, m);
    for (int i = 0; i <= n - m; i++) {
        if (hashHaystack == hashNeedle) {
            int j = 0;
            while (j < m) {
                c++;
                if (haystack[i + j] != needle[j]) {
                    break;
                }
                j++;
            }
            if (j == m) {
                return i;
            }
        }
        hashHaystack = hashFunc(haystack + i + 1, m);
    }
    return -1;
}

int main(int argc, char *argv[]) {
    char path[1000];
    strcpy(path, argv[0]);
    char *slash = strrchr(path, '/');
    if (slash != NULL) {
        strcpy(slash + 1, "text.txt");
    } else {
        strcpy(path, "text.txt");
    }

    FILE *f = fopen(path, "r");
    if (f == NULL) {
        cout << "Не удалось открыть файл " << path << endl;
        return 1;
    }

    char T[10000];
    size_t read = fread(T, 1, sizeof(T) - 1, f);
    T[read] = '\0';
    fclose(f);

    cout << "Текст из файла text.txt:\n\n" << T << "\n\n";

    char W[100];
    cout << "Введите слово для поиска: ";
    cin.getline(W, sizeof(W));

    n = strlen(T);
    m = strlen(W);

    if (m == 0) {
        cout << "Пустое слово, искать нечего." << endl;
        return 1;
    }
    if (m > n) {
        cout << "Слово длиннее текста, искать нечего." << endl;
        return 1;
    }

    cout << "\nИскомое слово: " << W;

    int resBrute = bruteForce(T, W);
    cout << "\n\nпрямой перебор: индекс: " << resBrute << ", сравнения: " << c;

    c = 0;
    int resRabin = rabinKarp(T, W);
    cout << "\n\nметод рабина-карпа: индекс: " << resRabin << ", сравнения: " << c << endl;

    return 0;
}
