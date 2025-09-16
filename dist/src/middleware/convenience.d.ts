import { MiddlewareObj } from '@middy/core';
import { ODataParseOptions, ODataShapeOptions, ODataFilterOptions, ODataPaginationOptions, ODataSerializeOptions, ODataErrorOptions, ODataFunctionsOptions, ODataMetadataOptions, ODataConformanceOptions } from './types';
/**
 * Convenience middleware arrays for users who prefer explicit chaining
 * These provide pre-configured combinations of middlewares for common use cases
 */
export declare function odataCore(options: any): MiddlewareObj[];
export declare function odataFull(options: any): MiddlewareObj[];
export declare const odataWithFunctions: Array<(options?: any) => MiddlewareObj>;
export declare const odataWithMetadata: Array<(options?: any) => MiddlewareObj>;
export declare const odataComplete: Array<(options?: any) => MiddlewareObj>;
export declare function odataLight(options: any): MiddlewareObj[];
export declare function odataReadOnly(options: any): MiddlewareObj[];
export declare function odataWrite(options: any): MiddlewareObj[];
/**
 * Helper function to create middleware arrays with custom options
 */
export declare function createMiddlewareArray(options: {
    model: any;
    serviceRoot: string;
    include?: string[];
    exclude?: string[];
}): MiddlewareObj[];
export declare function createODataMiddlewareArray(middlewares: Array<(options?: any) => MiddlewareObj>, options?: {
    parse?: Partial<ODataParseOptions>;
    shape?: Partial<ODataShapeOptions>;
    filter?: Partial<ODataFilterOptions>;
    pagination?: Partial<ODataPaginationOptions>;
    serialize?: Partial<ODataSerializeOptions>;
    error?: Partial<ODataErrorOptions>;
    functions?: Partial<ODataFunctionsOptions>;
    metadata?: Partial<ODataMetadataOptions>;
    conformance?: Partial<ODataConformanceOptions>;
}): Array<MiddlewareObj>;
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
