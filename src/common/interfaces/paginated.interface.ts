export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

const MAX_LIMIT = 1000;

/** Converte o query param `page` em inteiro >= 1 (valores inválidos viram 1). */
export function toPage(value?: string): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Converte o query param `limit` em inteiro entre 1 e 1000 (inválido/ausente = padrão). */
export function toLimit(value?: string, fallback = 20): number {
  const n = parseInt(value ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, MAX_LIMIT);
}
