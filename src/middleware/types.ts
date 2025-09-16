import type { MiddlewareObj } from "@middy/core";
import type { EdmModel, ODataQueryOptions, ODataRequestContext } from "../core/types";

// Base middleware context that all OData middlewares will use
export interface ODataMiddlewareContext {
  model: EdmModel;
  serviceRoot: string;
  entitySet?: string;
  options: ODataQueryOptions;
  // Additional context for middleware communication
  data?: unknown;
  response?: unknown;
  error?: Error;
  // Metadata for debugging and logging
  metadata?: {
    executionTime?: number;
    middlewareStack?: string[];
    [key: string]: unknown;
  };
}

// Individual middleware option interfaces
export interface ODataParseOptions {
  model: EdmModel;
  serviceRoot: string | ((event: any) => string);
  validateAgainstModel?: boolean;
  strictMode?: boolean;
}

export interface ODataShapeOptions {
  enableExpand?: boolean;
  maxExpandDepth?: number;
  expandResolvers?: Record<string, (context: ODataMiddlewareContext) => Promise<unknown>>;
}

export interface ODataFilterOptions {
  enableFilter?: boolean;
  enableOrderby?: boolean;
  maxFilterDepth?: number;
  caseSensitive?: boolean;
}

export interface ODataPaginationOptions {
  maxTop?: number;
  defaultTop?: number;
  enableCount?: boolean;
}

export interface ODataSerializeOptions {
  format?: "json" | "xml" | "atom";
  includeMetadata?: boolean;
  prettyPrint?: boolean;
}

export interface ODataErrorOptions {
  includeStackTrace?: boolean;
  redactErrors?: boolean;
  customErrorHandler?: (error: Error, context: ODataMiddlewareContext) => unknown;
}

export interface ODataFunctionsOptions {
  enableFunctions?: boolean;
  enableActions?: boolean;
  functionRegistry?: Record<string, (params: Record<string, unknown>) => unknown>;
  actionRegistry?: Record<string, (params: Record<string, unknown>) => unknown>;
}

export interface ODataMetadataOptions {
  enableMetadata?: boolean;
  metadataVersion?: string;
  customMetadataGenerator?: (model: EdmModel, serviceRoot: string) => unknown;
}

export interface ODataConformanceOptions {
  conformanceLevel?: "minimal" | "intermediate" | "advanced";
  enableCompute?: boolean;
  enableApply?: boolean;
  enableSearch?: boolean;
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
  // Legacy options for backward compatibility
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

// Middleware execution phases
export type MiddlewarePhase = "before" | "after" | "onError";

// Middleware execution order
export const MIDDLEWARE_ORDER = [
  "parse",
  "shape", 
  "filter",
  "pagination",
  "serialize",
  "error",
  "functions",
  "metadata",
  "conformance"
] as const;

export type MiddlewareName = typeof MIDDLEWARE_ORDER[number];

// Helper type for middleware arrays
export type ODataMiddlewareArray = MiddlewareObj[];
