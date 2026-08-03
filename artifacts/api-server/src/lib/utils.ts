import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

export function paginate(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  return {
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}

export function totalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}
