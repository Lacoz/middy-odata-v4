import { MiddlewareObj } from '@middy/core';
import { EdmModel, ODataQueryOptions } from '../core/types';
export interface ODataMiddlewareContext {
    model: EdmModel;
    serviceRoot: string;
    entitySet?: string;
    options: ODataQueryOptions;
    data?: unknown;
    response?: unknown;
    error?: Error;
    metadata?: {
        executionTime?: number;
        middlewareStack?: string[];
        [key: string]: unknown;
    };
}
export interface ODataParseOptions {
    model: EdmModel;
    serviceRoot: string | ((event: any) => string);
    validateAgainstModel?: boolean;
    strictMode?: boolean;
    [key: string]: unknown;
}
export interface ODataShapeOptions {
    enableExpand?: boolean;
    maxExpandDepth?: number;
    expandResolvers?: Record<string, (context: ODataMiddlewareContext) => Promise<unknown>>;
    [key: string]: unknown;
}
export interface ODataFilterOptions {
    enableFilter?: boolean;
    enableOrderby?: boolean;
    maxFilterDepth?: number;
    caseSensitive?: boolean;
    [key: string]: unknown;
}
export interface ODataPaginationOptions {
    maxTop?: number;
    defaultTop?: number;
    enableCount?: boolean;
    [key: string]: unknown;
}
export interface ODataSerializeOptions {
    format?: "json" | "xml" | "atom";
    includeMetadata?: boolean;
    prettyPrint?: boolean;
    [key: string]: unknown;
}
export interface ODataErrorOptions {
    includeStackTrace?: boolean;
    redactErrors?: boolean;
    logErrors?: boolean;
    customErrorHandler?: (error: Error, context: ODataMiddlewareContext, request: any) => unknown;
    [key: string]: unknown;
}
export interface ODataFunctionsOptions {
    enableFunctions?: boolean;
    enableActions?: boolean;
    functionRegistry?: Record<string, (params: Record<string, unknown>) => unknown>;
    actionRegistry?: Record<string, (params: Record<string, unknown>) => unknown>;
    functionResolvers?: Record<string, (...args: unknown[]) => unknown>;
    actionResolvers?: Record<string, (...args: unknown[]) => unknown>;
    validateParameters?: boolean;
    [key: string]: unknown;
}
export interface ODataMetadataOptions {
    enableMetadata?: boolean;
    enableServiceDocument?: boolean;
    metadataVersion?: string;
    includeAnnotations?: boolean;
    customAnnotations?: Record<string, unknown>;
    metadataPath?: string;
    serviceDocumentPath?: string;
    customMetadataGenerator?: (model: EdmModel, serviceRoot: string) => unknown;
    [key: string]: unknown;
}
export interface ODataConformanceOptions {
    conformanceLevel?: "minimal" | "intermediate" | "advanced";
    enableCompute?: boolean;
    enableApply?: boolean;
    enableSearch?: boolean;
    strictMode?: boolean;
    validateQueries?: boolean;
    customValidationRules?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface ODataOptions {
    model: EdmModel;
    serviceRoot: string | ((event: any) => string);
    parse?: Partial<ODataParseOptions>;
    shape?: Partial<ODataShapeOptions>;
    filter?: Partial<ODataFilterOptions>;
    pagination?: Partial<ODataPaginationOptions>;
    serialize?: Partial<ODataSerializeOptions>;
    error?: Partial<ODataErrorOptions>;
    functions?: Partial<ODataFunctionsOptions>;
    metadata?: Partial<ODataMetadataOptions>;
    conformance?: Partial<ODataConformanceOptions>;
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
export type MiddlewarePhase = "before" | "after" | "onError";
export declare const MIDDLEWARE_ORDER: readonly ["parse", "shape", "filter", "pagination", "serialize", "error", "functions", "metadata", "conformance"];
export type MiddlewareName = typeof MIDDLEWARE_ORDER[number];
export type ODataMiddlewareArray = MiddlewareObj[];
