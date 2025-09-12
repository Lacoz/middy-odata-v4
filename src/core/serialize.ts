import type { ODataCollectionResponse } from "./types";

export function serializeCollection<T>(contextUrl: string, value: T[], count?: number, nextLink?: string): ODataCollectionResponse<T> {
  const out: ODataCollectionResponse<T> = {
    "@odata.context": contextUrl,
    value,
  };
  if (typeof count === "number") out["@odata.count"] = count;
  if (nextLink) out["@odata.nextLink"] = nextLink;
  return out;
}
