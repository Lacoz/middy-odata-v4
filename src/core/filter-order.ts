import type { ODataEntity, ODataQueryOptions } from "./types";

export function filterArray<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  if (!options.filter) return rows;
  // Placeholder: filtering to be implemented via tests.
  return rows;
}

export function orderArray<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  if (!options.orderby || options.orderby.length === 0) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    for (const term of options.orderby!) {
      const av = (a as any)[term.property];
      const bv = (b as any)[term.property];
      if (av == null && bv == null) continue;
      if (av == null) return term.direction === "asc" ? -1 : 1;
      if (bv == null) return term.direction === "asc" ? 1 : -1;
      if (av < bv) return term.direction === "asc" ? -1 : 1;
      if (av > bv) return term.direction === "asc" ? 1 : -1;
    }
    return 0;
  });
  return copy;
}

export function paginateArray<T>(rows: T[], options: ODataQueryOptions): T[] {
  const skip = options.skip ?? 0;
  const top = options.top ?? rows.length;
  return rows.slice(skip, skip + top);
}
