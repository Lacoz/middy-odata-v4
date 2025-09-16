import type { MiddlewareObj } from "@middy/core";
import { odataParse } from "./parse";
import { odataShape } from "./shape";
import { odataFilter } from "./filter";
import { odataPagination } from "./pagination";
import { odataSerialize } from "./serialize";
import { odataError } from "./error";
import { odataFunctions } from "./functions";
import { odataMetadata } from "./metadata";
import { odataConformance } from "./conformance";
import type { 
  ODataParseOptions, 
  ODataShapeOptions, 
  ODataFilterOptions, 
  ODataPaginationOptions,
  ODataSerializeOptions,
  ODataErrorOptions,
  ODataFunctionsOptions,
  ODataMetadataOptions,
  ODataConformanceOptions
} from "./types";

/**
 * Convenience middleware arrays for users who prefer explicit chaining
 * These provide pre-configured combinations of middlewares for common use cases
 */

// Core OData functionality (parsing, shaping, filtering, pagination, serialization)
export const odataCore: Array<(options?: any) => MiddlewareObj> = [
  odataParse,
  odataShape,
  odataFilter,
  odataPagination,
  odataSerialize,
];

// Full OData functionality including error handling
export const odataFull: Array<(options?: any) => MiddlewareObj> = [
  odataParse,
  odataShape,
  odataFilter,
  odataPagination,
  odataSerialize,
  odataError,
];

// OData with functions and actions support
export const odataWithFunctions: Array<(options?: any) => MiddlewareObj> = [
  odataParse,
  odataFunctions,
  odataShape,
  odataFilter,
  odataPagination,
  odataSerialize,
  odataError,
];

// OData with metadata service support
export const odataWithMetadata: Array<(options?: any) => MiddlewareObj> = [
  odataParse,
  odataMetadata,
  odataShape,
  odataFilter,
  odataPagination,
  odataSerialize,
  odataError,
];

// Complete OData implementation with all features
export const odataComplete: Array<(options?: any) => MiddlewareObj> = [
  odataParse,
  odataFunctions,
  odataMetadata,
  odataConformance,
  odataShape,
  odataFilter,
  odataPagination,
  odataSerialize,
  odataError,
];

// Lightweight OData (parsing and serialization only)
export const odataLight: Array<(options?: any) => MiddlewareObj> = [
  odataParse,
  odataSerialize,
];

// OData for read-only operations (no functions/actions)
export const odataReadOnly: Array<(options?: any) => MiddlewareObj> = [
  odataParse,
  odataShape,
  odataFilter,
  odataPagination,
  odataSerialize,
  odataError,
];

// OData for write operations (includes functions/actions)
export const odataWrite: Array<(options?: any) => MiddlewareObj> = [
  odataParse,
  odataFunctions,
  odataShape,
  odataFilter,
  odataPagination,
  odataSerialize,
  odataError,
];

/**
 * Helper function to create middleware arrays with custom options
 */
export function createODataMiddlewareArray(
  middlewares: Array<(options?: any) => MiddlewareObj>,
  options: {
    parse?: Partial<ODataParseOptions>;
    shape?: Partial<ODataShapeOptions>;
    filter?: Partial<ODataFilterOptions>;
    pagination?: Partial<ODataPaginationOptions>;
    serialize?: Partial<ODataSerializeOptions>;
    error?: Partial<ODataErrorOptions>;
    functions?: Partial<ODataFunctionsOptions>;
    metadata?: Partial<ODataMetadataOptions>;
    conformance?: Partial<ODataConformanceOptions>;
  } = {}
): Array<MiddlewareObj> {
  return middlewares.map(middleware => {
    if (middleware === odataParse) return middleware(options.parse);
    if (middleware === odataShape) return middleware(options.shape);
    if (middleware === odataFilter) return middleware(options.filter);
    if (middleware === odataPagination) return middleware(options.pagination);
    if (middleware === odataSerialize) return middleware(options.serialize);
    if (middleware === odataError) return middleware(options.error);
    if (middleware === odataFunctions) return middleware(options.functions);
    if (middleware === odataMetadata) return middleware(options.metadata);
    if (middleware === odataConformance) return middleware(options.conformance);
    return middleware();
  });
}

/**
 * Usage examples:
 * 
 * // Use pre-configured middleware arrays
 * const handler = middy(baseHandler)
 *   .use(...odataCore.map(m => m()))
 *   .use(...odataFull.map(m => m()));
 * 
 * // Use with custom options
 * const handler = middy(baseHandler)
 *   .use(...createODataMiddlewareArray(odataCore, {
 *     parse: { strictMode: true },
 *     pagination: { maxTop: 500 }
 *   }));
 * 
 * // Chain individual middlewares
 * const handler = middy(baseHandler)
 *   .use(odataParse({ strictMode: true }))
 *   .use(odataShape({ enableExpand: false }))
 *   .use(odataSerialize({ prettyPrint: true }));
 */
