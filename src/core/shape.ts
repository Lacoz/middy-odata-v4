import type { ODataEntity, ODataQueryOptions } from "./types";

export function applySelect<T extends ODataEntity>(row: T, select?: string[]): Partial<T> {
  if (!select || select.length === 0) return { ...row };
  const out: Record<string, unknown> = {};
  for (const p of select) if (p in row) out[p] = (row as any)[p];
  return out as Partial<T>;
}

export function projectArray<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): Partial<T>[] {
  return rows.map((r) => applySelect(r, options.select));
}
