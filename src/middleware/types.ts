import type { MiddlewareObj } from "@middy/core";
import type { EdmModel, ODataQueryOptions } from "../core/types";

export type ODataDataProviderResult = unknown | unknown[];
export type ODataDataProvider =
  | ((context: ODataMiddlewareContext) => Promise<ODataDataProviderResult> | ODataDataProviderResult)
  | (() => Promise<ODataDataProviderResult> | ODataDataProviderResult);

// Base middleware context that all OData middlewares will use
export interface ODataMiddlewareContext {
  model: EdmModel;
  serviceRoot: string;
  entitySet?: string;
  entityType?: string;
  options: ODataQueryOptions;
  dataProviders?: Record<string, ODataDataProvider>;
  // Additional context for middleware communication
  data?: unknown;
  response?: unknown;
  error?: Error;
  runtime?: {
    dataCache?: Map<string, unknown[]>;
  };
  // Metadata for debugging and logging
  metadata?: {
    executionTime?: number;
    middlewareStack?: string[];
    deadline?: number;
    [key: string]: unknown;
  };
}

// Individual middleware option interfaces
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
  autoResolveNavigation?: boolean;
  [key: string]: unknown;
}

export interface ODataFilterOptions {
  enableFilter?: boolean;
  enableOrderby?: boolean;
  maxFilterDepth?: number;
  caseSensitive?: boolean;
  enableSearch?: boolean;
  enableCompute?: boolean;
  enableApply?: boolean;
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

export interface ODataRoutingOptions {
  model: EdmModel;
  dataProviders?: Record<string, ODataDataProvider>;
  enableRouting?: boolean;
  strictMode?: boolean;
  [key: string]: unknown;
}

// Main OData options that combines all individual options
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
  routing?: Partial<ODataRoutingOptions>;
  // Legacy options for backward compatibility
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
    compute?: boolean;
    apply?: boolean;
    search?: boolean;
  };
  defaults?: {
    maxTop?: number;
    defaultTop?: number;
    maxExpandDepth?: number;
    maxFilterDepth?: number;
  };
}

// Middleware execution phases
export type MiddlewarePhase = "before" | "after" | "onError";

// Middleware execution order
export const MIDDLEWARE_ORDER = [
  "parse",
  "routing",
  "conformance",
  "functions",
  "metadata",
  "shape", 
  "filter",
  "pagination",
  "serialize",
  "error"
] as const;

export type MiddlewareName = typeof MIDDLEWARE_ORDER[number];

// Helper type for middleware arrays
export type ODataMiddlewareArray = MiddlewareObj[];
