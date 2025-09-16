import { MiddlewareObj } from '@middy/core';
import { EdmModel } from '../core/types';
import { ODataMiddlewareContext } from './types';
export interface ODataOptions {
    model: EdmModel;
    serviceRoot: string | ((event: any) => string);
    enable?: {
        parse?: boolean;
        shape?: boolean;
        filter?: boolean;
        pagination?: boolean;
        serialize?: boolean;
        error?: boolean;
        functions?: boolean;
        metadata?: boolean;
        conformance?: boolean;
        search?: boolean;
        compute?: boolean;
        apply?: boolean;
    };
    defaults?: {
        maxTop?: number;
        defaultTop?: number;
        maxExpandDepth?: number;
        maxFilterDepth?: number;
    };
    parse?: {
        validateAgainstModel?: boolean;
        strictMode?: boolean;
    };
    shape?: {
        enableExpand?: boolean;
        maxExpandDepth?: number;
        expandResolvers?: Record<string, (...args: unknown[]) => unknown>;
    };
    filter?: {
        enableFilter?: boolean;
        enableOrderby?: boolean;
        maxFilterDepth?: number;
        caseSensitive?: boolean;
    };
    pagination?: {
        maxTop?: number;
        defaultTop?: number;
        enableCount?: boolean;
    };
    serialize?: {
        format?: "json" | "xml" | "atom";
        includeMetadata?: boolean;
        prettyPrint?: boolean;
    };
    error?: {
        includeStackTrace?: boolean;
        logErrors?: boolean;
        customErrorHandler?: (error: Error, context: ODataMiddlewareContext) => void;
    };
    functions?: {
        enableFunctions?: boolean;
        enableActions?: boolean;
        functionResolvers?: Record<string, (...args: unknown[]) => unknown>;
        actionResolvers?: Record<string, (...args: unknown[]) => unknown>;
        validateParameters?: boolean;
    };
    metadata?: {
        enableMetadata?: boolean;
        enableServiceDocument?: boolean;
        includeAnnotations?: boolean;
        customAnnotations?: Record<string, any>;
        metadataPath?: string;
        serviceDocumentPath?: string;
    };
    conformance?: {
        conformanceLevel?: "minimal" | "intermediate" | "advanced";
        strictMode?: boolean;
        validateQueries?: boolean;
        customValidationRules?: Record<string, (...args: unknown[]) => unknown>;
    };
}
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
export declare function odata(options: ODataOptions): MiddlewareObj;
/**
 * Create a minimal OData middleware with only essential features
 */
export declare function odataMinimal(options: ODataOptions): MiddlewareObj;
/**
 * Create a core OData middleware with common features
 */
export declare function odataCore(options: ODataOptions): MiddlewareObj;
/**
 * Create a full OData middleware with all features enabled
 */
export declare function odataFull(options: ODataOptions): MiddlewareObj;
