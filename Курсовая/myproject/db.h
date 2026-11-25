#ifndef DB_H
#define DB_H


#define FIO_LEN 30
#define POS_LEN 22
#define BIRTH_LEN 10

#define DB_FILE "testBase2.dat"

struct Worker {
  char fio[FIO_LEN + 1];      /* Фамилия Имя Отчество (в CP866) */
  short dept;                 /* номер отдела */
  char position[POS_LEN + 1]; /* должность (в CP866) */
  char birth[BIRTH_LEN + 1];  /* дата рождения дд-мм-гг (ASCII) */
};

#endif
