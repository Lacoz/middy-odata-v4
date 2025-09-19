import type { MiddlewareObj } from "@middy/core";
import type { EdmModel } from "../core/types";
import type { ODataMiddlewareContext, ODataOptions } from "./types";
import { composeMiddlewares } from "./compose";
import { odataParse } from "./parse";
import { odataShape } from "./shape";
import { odataFilter } from "./filter";
import { odataPagination } from "./pagination";
import { odataSerialize } from "./serialize";
import { odataError } from "./error";
import { odataFunctions } from "./functions";
import { odataMetadata } from "./metadata";
import { odataConformance } from "./conformance";
import { odataRouting } from "./routing";


const DEFAULT_OPTIONS: ODataOptions = {
  model: {} as EdmModel,
  serviceRoot: "",
  enable: {
    parse: true,
    shape: true,
    filter: true,
    pagination: true,
    serialize: true,
    error: true,
    functions: true,
    metadata: true,
    conformance: true,
    search: false,
    compute: false,
    apply: false,
  },
  defaults: {
    maxTop: 1000,
    defaultTop: 50,
    maxExpandDepth: 3,
    maxFilterDepth: 10,
  },
};

/**
 * Main OData Middleware
 * 
 * This is the pre-composed middleware that internally chains all individual
 * OData middlewares in the correct order following Middy's onion pattern.
 * 
 * Usage:
 * ```typescript
 * const handler = middy(baseHandler)
 *   .use(odata({
 *     model: EDM_MODEL,
 *     serviceRoot: "https://api.example.com/odata",
 *     enable: { compute: false, apply: false, search: false },
 *     defaults: { maxTop: 1000, defaultTop: 50 },
 *   }));
 * ```
 */
export function odata(options: ODataOptions): MiddlewareObj {
  console.log('[OData] Input options.routing:', JSON.stringify(options.routing, (key, value) => {
    if (typeof value === 'function') {
      return '[Function]';
    }
    return value;
  }, 2));
  
  console.log('[OData] options.routing.dataProviders:', options.routing?.dataProviders);
  console.log('[OData] typeof options.routing.dataProviders.Users:', typeof options.routing?.dataProviders?.Users);
  
  const opts = { 
    ...DEFAULT_OPTIONS, 
    ...options,
    enable: {
      ...DEFAULT_OPTIONS.enable,
      ...options.enable
    },
    routing: options.routing ? {
      enableRouting: true,
      strictMode: false,
      ...options.routing,
      dataProviders: {
        ...options.routing.dataProviders
      }
    } : undefined
  };
  
  console.log('[OData] opts.routing.dataProviders:', opts.routing?.dataProviders);

  console.log('[OData] Options:', JSON.stringify(opts, null, 2));

  // Build the middleware chain in the correct order
  const middlewares: MiddlewareObj[] = [];

  // 1. Parse middleware (first - sets up context)
  if (opts.enable?.parse !== false) {
    middlewares.push(odataParse({
      model: opts.model,
      serviceRoot: opts.serviceRoot,
      validateAgainstModel: opts.parse?.validateAgainstModel ?? true,
      strictMode: opts.parse?.strictMode ?? false,
    }));
  }

  // 2. Routing middleware (early - handles entity set routing and data providers)
  if (opts.routing?.enableRouting !== false) {
    middlewares.push(odataRouting({
      model: opts.model,
      dataProviders: opts.routing?.dataProviders ?? {},
      enableRouting: opts.routing?.enableRouting ?? true,
      strictMode: opts.routing?.strictMode ?? false,
    }));
  }

  // 3. Conformance middleware (early - validates queries)
  if (opts.enable?.conformance !== false) {
    middlewares.push(odataConformance({
      conformanceLevel: opts.conformance?.conformanceLevel ?? "minimal",
      strictMode: opts.conformance?.strictMode ?? false,
      validateQueries: opts.conformance?.validateQueries ?? true,
      customValidationRules: opts.conformance?.customValidationRules ?? {},
    }));
  }

  // 4. Functions middleware (early - handles function/action calls)
  if (opts.enable?.functions !== false) {
    middlewares.push(odataFunctions({
      enableFunctions: opts.functions?.enableFunctions ?? true,
      enableActions: opts.functions?.enableActions ?? true,
      functionResolvers: opts.functions?.functionResolvers ?? {},
      actionResolvers: opts.functions?.actionResolvers ?? {},
      validateParameters: opts.functions?.validateParameters ?? true,
    }));
  }

  // 5. Metadata middleware (early - handles metadata requests)
  if (opts.enable?.metadata !== false) {
    middlewares.push(odataMetadata({
      enableMetadata: opts.metadata?.enableMetadata ?? true,
      enableServiceDocument: opts.metadata?.enableServiceDocument ?? true,
      includeAnnotations: opts.metadata?.includeAnnotations ?? true,
      customAnnotations: opts.metadata?.customAnnotations ?? {},
      metadataPath: opts.metadata?.metadataPath ?? "/$metadata",
      serviceDocumentPath: opts.metadata?.serviceDocumentPath ?? "/",
    }));
  }

  // 6. Shape middleware (after - transforms response data)
  if (opts.enable?.shape !== false) {
    middlewares.push(odataShape({
      enableExpand: opts.shape?.enableExpand ?? true,
      maxExpandDepth: opts.shape?.maxExpandDepth ?? opts.defaults?.maxExpandDepth ?? 3,
      expandResolvers: (opts.shape?.expandResolvers ?? {}) as Record<string, (context: ODataMiddlewareContext) => Promise<unknown>>,
    }));
  }

  // 7. Filter middleware (after - filters and sorts data)
  if (opts.enable?.filter !== false) {
    middlewares.push(odataFilter({
      enableFilter: opts.filter?.enableFilter ?? true,
      enableOrderby: opts.filter?.enableOrderby ?? true,
      maxFilterDepth: opts.filter?.maxFilterDepth ?? opts.defaults?.maxFilterDepth ?? 10,
      caseSensitive: opts.filter?.caseSensitive ?? true,
      enableSearch: opts.filter?.enableSearch ?? opts.enable?.search ?? false,
      enableCompute: opts.filter?.enableCompute ?? opts.enable?.compute ?? false,
      enableApply: opts.filter?.enableApply ?? opts.enable?.apply ?? false,
    }));
  }

  // 8. Pagination middleware (after - paginates data)
  if (opts.enable?.pagination !== false) {
    middlewares.push(odataPagination({
      maxTop: opts.pagination?.maxTop ?? opts.defaults?.maxTop ?? 1000,
      defaultTop: opts.pagination?.defaultTop ?? opts.defaults?.defaultTop ?? 50,
      enableCount: opts.pagination?.enableCount ?? true,
    }));
  }

  // 9. Serialize middleware (last - formats response)
  console.log('[OData] opts.enable?.serialize:', opts.enable?.serialize);
  console.log('[OData] Serialize middleware enabled:', opts.enable?.serialize !== false);
  if (opts.enable?.serialize !== false) {
    console.log('[OData] Adding serialize middleware');
    middlewares.push(odataSerialize({
      format: opts.serialize?.format ?? "json",
      includeMetadata: opts.serialize?.includeMetadata ?? true,
      prettyPrint: opts.serialize?.prettyPrint ?? false,
    }));
  } else {
    console.log('[OData] Serialize middleware disabled');
  }

  // 10. Error middleware (always last - handles errors)
  if (opts.enable?.error !== false) {
    middlewares.push(odataError({
      includeStackTrace: opts.error?.includeStackTrace ?? false,
      logErrors: opts.error?.logErrors ?? true,
      customErrorHandler: opts.error?.customErrorHandler as ((error: Error, context: ODataMiddlewareContext, request: any) => unknown) | undefined,
    }));
  }

  // Compose all middlewares into a single middleware
  return composeMiddlewares(...middlewares);
}

/**
 * Create a minimal OData middleware with only essential features
 */
export function odataMinimal(options: ODataOptions): MiddlewareObj {
  return odata({
    ...options,
    enable: {
      parse: true,
      shape: false,
      filter: false,
      pagination: false,
      serialize: true,
      error: true,
      functions: false,
      metadata: true,
      conformance: false,
      search: false,
      compute: false,
      apply: false,
    },
  });
}

/**
 * Create a core OData middleware with common features
 */
export function odataCore(options: ODataOptions): MiddlewareObj {
  return odata({
    ...options,
    enable: {
      parse: true,
      shape: true,
      filter: true,
      pagination: true,
      serialize: true,
      error: true,
      functions: false,
      metadata: true,
      conformance: true,
      search: false,
      compute: false,
      apply: false,
    },
  });
}

/**
 * Create a full OData middleware with all features enabled
 */
export function odataFull(options: ODataOptions): MiddlewareObj {
  return odata({
    ...options,
    enable: {
      parse: true,
      shape: true,
      filter: true,
      pagination: true,
      serialize: true,
      error: true,
      functions: true,
      metadata: true,
      conformance: true,
      search: true,
      compute: true,
      apply: true,
    },
  });
}
