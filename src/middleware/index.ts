import type { MiddlewareObj } from "@middy/core";
import type { ODataRequestContext, ODataQueryOptions, EdmModel } from "../core/types";
import { parseODataQuery } from "../core/parse";

export interface ODataMiddlewareOptions {
  model: EdmModel;
  serviceRoot: string | ((event: any) => string);
  enable?: {
    compute?: boolean;
    apply?: boolean;
    search?: boolean;
  };
  defaults?: {
    maxTop?: number;
    defaultTop?: number;
  };
}

export function odata(options: ODataMiddlewareOptions): MiddlewareObj {
  return {
    before: async (request: any) => {
      const event = request.event ?? {};
      const query = event.rawQueryString
        ? Object.fromEntries(new URLSearchParams(event.rawQueryString))
        : (event.queryStringParameters || {});
      const opts: ODataQueryOptions = parseODataQuery(query);
      const serviceRoot = typeof options.serviceRoot === "function" ? options.serviceRoot(event) : options.serviceRoot;
      const ctx: ODataRequestContext = {
        model: options.model,
        serviceRoot,
        entitySet: undefined,
        options: opts,
      };
      request.internal = request.internal || {};
      request.internal.odata = ctx;
    },
  };
}
