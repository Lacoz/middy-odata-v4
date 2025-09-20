import type { ODataMiddlewareContext } from "./types";
import type { ApplyODataQueryResult } from "../core/apply-query";
import type { ODataEntity } from "../core/types";

export interface CreateODataResponseOptions {
  statusCode?: number;
  headers?: Record<string, string>;
  includeContext?: boolean;
  includeCount?: boolean;
  contextUrl?: string;
  nextLink?: string;
  additionalProperties?: Record<string, unknown>;
}

interface NormalizedResult<T extends ODataEntity> {
  value: Partial<T>[];
  count?: number;
}

export function createODataResponse<T extends ODataEntity>(
  context: ODataMiddlewareContext,
  result: ApplyODataQueryResult<T> | Partial<T>[] | T[],
  options: CreateODataResponseOptions = {},
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  const {
    statusCode = 200,
    headers = {},
    includeContext = true,
    includeCount = true,
    contextUrl,
    nextLink,
    additionalProperties = {},
  } = options;

  const normalized = normalizeResult(result);

  const payload: Record<string, unknown> = {
    value: normalized.value,
    ...additionalProperties,
  };

  if (includeContext) {
    payload["@odata.context"] = contextUrl ?? buildContextUrl(context);
  }

  const shouldIncludeCount = includeCount && (context.options?.count || normalized.count !== undefined);
  if (shouldIncludeCount) {
    payload["@odata.count"] = normalized.count ?? normalized.value.length;
  }

  if (nextLink) {
    payload["@odata.nextLink"] = nextLink;
  }

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "OData-Version": "4.01",
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

function normalizeResult<T extends ODataEntity>(
  result: ApplyODataQueryResult<T> | Partial<T>[] | T[],
): NormalizedResult<T> {
  if (Array.isArray(result)) {
    return { value: result as Partial<T>[] };
  }

  return {
    value: result.value,
    count: result.count,
  };
}

function buildContextUrl(context: ODataMiddlewareContext): string {
  const serviceRoot = (context.serviceRoot ?? "").replace(/\/+$/u, "");
  const entitySet = context.entitySet?.replace(/^\/+/, "");

  if (entitySet) {
    return `${serviceRoot}/$metadata#${entitySet}`;
  }

  return `${serviceRoot}/$metadata`;
}
