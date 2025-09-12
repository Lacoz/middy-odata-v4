/* eslint-disable @typescript-eslint/no-explicit-any */
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

// Expand navigation properties
export function expandData<T extends Record<string, any>>(
  data: T | T[],
  options: ODataQueryOptions
): T | T[] {
  if (!options.expand || options.expand.length === 0) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => expandData(item, options) as T);
  }

  const expanded = { ...data } as any;
  
  for (const expandItem of options.expand) {
    const navigationProperty = expandItem.path;
    
    // Simple expansion - in a real implementation, this would resolve navigation properties
    // For now, we'll just ensure the property exists
    if (navigationProperty && !(navigationProperty in expanded)) {
      // Create a placeholder for the expanded property
      expanded[navigationProperty] = null;
    }
    
    // Handle nested query options in expansion
    if (expandItem.options) {
      const nestedData = expanded[navigationProperty];
      if (nestedData) {
        expanded[navigationProperty] = expandData(nestedData, expandItem.options);
      }
    }
  }
  
  return expanded as T;
}
