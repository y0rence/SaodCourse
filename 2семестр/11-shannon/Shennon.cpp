

#include <cmath>
#include <cstdio>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <string>

using namespace std;

const int MAX_SYM = 512;
const int MAX_TEXT = 100000;
const int MAX_LEN = 64;

struct Sym {
    char32_t code;
    char ch[3];
    int count;
};

bool read_utf8(FILE *f, char32_t &cp, char ch[3]) {
    int c0;
    while ((c0 = fgetc(f)) != EOF) {
        unsigned char b0 = (unsigned char)c0;

        if (b0 == 0xD0 || b0 == 0xD1) {
            int c1 = fgetc(f);
            if (c1 == EOF)
                return false;

            unsigned char b1 = (unsigned char)c1;
            ch[0] = (char)b0;
            ch[1] = (char)b1;
            ch[2] = '\0';

            cp = ((char32_t)(b0 & 0x1F) << 6) | (b1 & 0x3F);
            return true;
        }
    }
    return false;
}

void printCell(ostream &os, const string &s, int wide) {
    os << s;
    int len = 0;
    for (unsigned char c : s) {
        if ((c & 0xC0) != 0x80)
            len++;
    }
    for (int i = len; i < wide; i++) {
        os << ' ';
    }
}

int main(int argc, char **argv) {

    const char *path = (argc > 1) ? argv[1] : "proizvedenie_11kb.txt";

    FILE *f = fopen(path, "rb");
    if (!f) {
        cout << "Ошибка открытия файла\n";
        return 1;
    }
    cout << "Файл: " << path << "\n";

    Sym alpha[MAX_SYM];
    int n_alpha = 0;

    char32_t text[MAX_TEXT];
    int total = 0;

    char32_t cp;
    char ch[3];

    while (read_utf8(f, cp, ch)) {
        if (total < MAX_TEXT) {
            text[total] = cp;
        }
        total++;

        int idx = -1;
        for (int i = 0; i < n_alpha; i++) {
            if (alpha[i].code == cp) {
                idx = i;
                break;
            }
        }

        if (idx != -1) {
            alpha[idx].count++;
        } else if (n_alpha < MAX_SYM) {
            alpha[n_alpha].code = cp;
            strcpy(alpha[n_alpha].ch, ch);
            alpha[n_alpha].count = 1;
            n_alpha++;
        }
    }
    fclose(f);

    int n = n_alpha;
    double P[MAX_SYM + 1];
    double Q[MAX_SYM + 1];
    int L[MAX_SYM + 1];
    int C[MAX_SYM + 1][MAX_LEN + 1];

    for (int i = 0; i < n; i++) {
        P[i + 1] = (double)alpha[i].count / total;
    }

    for (int i = 1; i <= n - 1; i++) {
        for (int j = 1; j <= n - i; j++) {
            if (P[j] < P[j + 1]) {
                double tp = P[j];
                P[j] = P[j + 1];
                P[j + 1] = tp;

                Sym tsym = alpha[j - 1];
                alpha[j - 1] = alpha[j];
                alpha[j] = tsym;
            }
        }
    }

    P[0] = 0.0;
    Q[0] = 0.0;

    for (int i = 1; i <= n; i++) {
        Q[i] = Q[i - 1] + P[i];

        int len_i = 1;
        while (P[i] < pow(2.0, -len_i)) {
            len_i++;
        }
        if (len_i > MAX_LEN)
            len_i = MAX_LEN;
        L[i] = len_i;
    }

    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= L[i]; j++) {
            Q[i - 1] = Q[i - 1] * 2.0;
            C[i][j] = (int)floor(Q[i - 1]);
            if (Q[i - 1] > 1.0) {
                Q[i - 1] = Q[i - 1] - 1.0;
            }
        }
    }

    string codes[MAX_SYM + 1];
    for (int i = 1; i <= n; i++) {
        codes[i] = "";
        for (int j = 1; j <= L[i]; j++) {
            codes[i] += (C[i][j] ? '1' : '0');
        }
    }

    cout << "\nВсего символов N = " << total << ", различных букв: " << n << "\n";
    cout << "Повторения букв:\n";
    for (int i = 1; i <= n; i++) {
        cout << "  " << left << setw(6) << alpha[i - 1].ch << ": " << setw(5) << alpha[i - 1].count
             << " из " << total << "\n";
    }

    cout << "\nЗадание 2: Код Шеннона\n";
    const int W_SYM = 8, W_CNT = 11, W_PROB = 13, W_CODE = 16;
    printCell(cout, "Символ", W_SYM);
    printCell(cout, "Повторений", W_CNT);
    printCell(cout, "Вероятность", W_PROB);
    printCell(cout, "Код", W_CODE);
    cout << "Длина\n";
    for (int i = 1; i <= n; i++) {
        char prob[32];
        snprintf(prob, sizeof(prob), "%g", P[i]);
        printCell(cout, alpha[i - 1].ch, W_SYM);
        printCell(cout, to_string(alpha[i - 1].count), W_CNT);
        printCell(cout, prob, W_PROB);
        printCell(cout, codes[i], W_CODE);
        cout << L[i] << "\n";
    }

    double sumP = 0, kraft = 0, H = 0, L_avg = 0;
    for (int i = 1; i <= n; i++) {
        sumP += P[i];
        kraft += pow(2.0, -L[i]);
        H += -P[i] * log2(P[i]);
        L_avg += P[i] * L[i];
    }
    double R = L_avg - H;

    cout << "\nЗадание 3\n";
    cout << "Сумма вероятностей: " << sumP
         << (fabs(sumP - 1.0) < 1e-9 ? " (равна 1)\n" : " (НЕ равна 1!)\n");
    cout << "Неравенство Крафта: " << kraft
         << ((kraft <= 1.0 + 1e-9) ? " (выполняется <= 1)\n" : " (не выполняется)\n");
    cout << "Энтропия: " << H << "\n";
    cout << "Средняя длина: " << L_avg << "\n";
    cout << "Избыточность: " << R << "\n";

    int n100 = (total < 100) ? total : 100;
    if (n100 > MAX_TEXT)
        n100 = MAX_TEXT;

    string encoded = "";
    for (int k = 0; k < n100; k++) {
        for (int i = 1; i <= n; i++) {
            if (alpha[i - 1].code == text[k]) {
                encoded += codes[i];
                break;
            }
        }
    }

    int fixed_bits = (n > 1) ? (int)ceil(log2((double)n)) : 1;
    int orig_bits = n100 * fixed_bits;
    double ratio = (double)orig_bits / encoded.size();

    cout << "\nЗадание 4 (первые " << n100 << " символов)\n";
    cout << "Закодированная строка:\n" << encoded << "\n";
    cout << "Длина закодированной строки: " << encoded.size() << " бит\n";
    cout << "Длина при равномерном коде (" << fixed_bits << " бит/символ): " << orig_bits
         << " бит\n";
    cout << "Коэффициент сжатия: " << ratio << "\n";

    return 0;
}
