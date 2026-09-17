/** Códigos HTTP usados nas respostas da API. */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
} as const;

export type HttpSuccessStatus =
  (typeof HttpStatus)[keyof typeof HttpStatus];
