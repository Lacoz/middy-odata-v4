import { filterArray, orderArray, paginateArray } from "./filter-order";
import { expandData, projectArray } from "./shape";
import type { ODataEntity, ODataQueryOptions } from "./types";

export interface ApplyODataQuerySettings {
  includeCount?: boolean;
}

export interface ApplyODataQueryResult<T extends ODataEntity> {
  value: Partial<T>[];
  count?: number;
}

export function applyODataQuery<T extends ODataEntity>(
  data: T[],
  options: ODataQueryOptions,
  settings: ApplyODataQuerySettings = {},
): ApplyODataQueryResult<T> {
  const includeCount = settings.includeCount ?? Boolean(options.count);

  let workingSet = Array.isArray(data) ? [...data] : [];
  workingSet = filterArray(workingSet, options);

  let totalCount: number | undefined;
  if (includeCount) {
    totalCount = workingSet.length;
  }

  workingSet = orderArray(workingSet, options);
  workingSet = paginateArray(workingSet, options);

  const expanded = expandData(workingSet, options);
  const projected = Array.isArray(expanded)
    ? projectArray(expanded as T[], options)
    : projectArray([expanded as T], options);

  return {
    value: projected,
    count: includeCount ? totalCount ?? projected.length : undefined,
  };
}
