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

export function serializeEntityWithContext<T>(contextUrl: string, value: T): { "@odata.context": string } & T {
  return {
    "@odata.context": contextUrl,
    ...value,
  };
}

export function buildEntitySetContext(serviceRoot: string, entitySet: string): string {
  return `${trimTrailingSlash(serviceRoot)}/$metadata#${entitySet}`;
}

export function buildSingleEntityContext(serviceRoot: string, entitySet: string): string {
  return `${trimTrailingSlash(serviceRoot)}/$metadata#${entitySet}/$entity`;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
