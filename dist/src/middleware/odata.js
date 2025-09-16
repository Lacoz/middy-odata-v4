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
const DEFAULT_OPTIONS = {
    model: {},
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
export function odata(options) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    // Build the middleware chain in the correct order
    const middlewares = [];
    // 1. Parse middleware (first - sets up context)
    if (opts.enable?.parse !== false) {
        middlewares.push(odataParse({
            model: opts.model,
            serviceRoot: opts.serviceRoot,
            validateAgainstModel: opts.parse?.validateAgainstModel ?? true,
            strictMode: opts.parse?.strictMode ?? false,
        }));
    }
    // 2. Conformance middleware (early - validates queries)
    if (opts.enable?.conformance !== false) {
        middlewares.push(odataConformance({
            conformanceLevel: opts.conformance?.conformanceLevel ?? "minimal",
            strictMode: opts.conformance?.strictMode ?? false,
            validateQueries: opts.conformance?.validateQueries ?? true,
            customValidationRules: opts.conformance?.customValidationRules ?? {},
        }));
    }
    // 3. Functions middleware (early - handles function/action calls)
    if (opts.enable?.functions !== false) {
        middlewares.push(odataFunctions({
            enableFunctions: opts.functions?.enableFunctions ?? true,
            enableActions: opts.functions?.enableActions ?? true,
            functionResolvers: opts.functions?.functionResolvers ?? {},
            actionResolvers: opts.functions?.actionResolvers ?? {},
            validateParameters: opts.functions?.validateParameters ?? true,
        }));
    }
    // 4. Metadata middleware (early - handles metadata requests)
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
    // 5. Shape middleware (after - transforms response data)
    if (opts.enable?.shape !== false) {
        middlewares.push(odataShape({
            enableExpand: opts.shape?.enableExpand ?? true,
            maxExpandDepth: opts.shape?.maxExpandDepth ?? opts.defaults?.maxExpandDepth ?? 3,
            expandResolvers: (opts.shape?.expandResolvers ?? {}),
        }));
    }
    // 6. Filter middleware (after - filters and sorts data)
    if (opts.enable?.filter !== false) {
        middlewares.push(odataFilter({
            enableFilter: opts.filter?.enableFilter ?? true,
            enableOrderby: opts.filter?.enableOrderby ?? true,
            maxFilterDepth: opts.filter?.maxFilterDepth ?? opts.defaults?.maxFilterDepth ?? 10,
            caseSensitive: opts.filter?.caseSensitive ?? true,
        }));
    }
    // 7. Pagination middleware (after - paginates data)
    if (opts.enable?.pagination !== false) {
        middlewares.push(odataPagination({
            maxTop: opts.pagination?.maxTop ?? opts.defaults?.maxTop ?? 1000,
            defaultTop: opts.pagination?.defaultTop ?? opts.defaults?.defaultTop ?? 50,
            enableCount: opts.pagination?.enableCount ?? true,
        }));
    }
    // 8. Serialize middleware (last - formats response)
    if (opts.enable?.serialize !== false) {
        middlewares.push(odataSerialize({
            format: opts.serialize?.format ?? "json",
            includeMetadata: opts.serialize?.includeMetadata ?? true,
            prettyPrint: opts.serialize?.prettyPrint ?? false,
        }));
    }
    // 9. Error middleware (always last - handles errors)
    if (opts.enable?.error !== false) {
        middlewares.push(odataError({
            includeStackTrace: opts.error?.includeStackTrace ?? false,
            logErrors: opts.error?.logErrors ?? true,
            customErrorHandler: opts.error?.customErrorHandler,
        }));
    }
    // Compose all middlewares into a single middleware
    return composeMiddlewares(...middlewares);
}
/**
 * Create a minimal OData middleware with only essential features
 */
export function odataMinimal(options) {
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
export function odataCore(options) {
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
export function odataFull(options) {
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
