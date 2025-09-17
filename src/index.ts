// Main OData middleware - pre-composed for easy use
export { odata } from "./middleware/odata";

// Individual middlewares for advanced users
export { odataParse } from "./middleware/parse";
export { odataRouting } from "./middleware/routing";
export { odataShape } from "./middleware/shape";
export { odataFilter } from "./middleware/filter";
export { odataPagination } from "./middleware/pagination";
export { odataSerialize } from "./middleware/serialize";
export { odataError } from "./middleware/error";
export { odataFunctions } from "./middleware/functions";
export { odataMetadata } from "./middleware/metadata";
export { odataConformance } from "./middleware/conformance";

// Convenience middleware arrays
export { 
  odataCore, 
  odataFull, 
  odataLight, 
  odataReadOnly, 
  odataWrite,
  createMiddlewareArray 
} from "./middleware/convenience";

// Composition utilities
export { composeMiddlewares } from "./middleware/compose";

// Middleware types and interfaces
export type {
  ODataOptions,
  ODataMiddlewareContext,
  ODataParseOptions,
  ODataRoutingOptions,
  ODataShapeOptions,
  ODataFilterOptions,
  ODataPaginationOptions,
  ODataSerializeOptions,
  ODataErrorOptions,
  ODataFunctionsOptions,
  ODataMetadataOptions,
  ODataConformanceOptions,
  MiddlewarePhase,
  ODataMiddlewareArray
} from "./middleware/types";

// Core types and utilities (for advanced users)
export * from "./core/types";
export * from "./core/errors";
export * from "./core/parse";
export * from "./core/shape";
export * from "./core/filter-order";
export * from "./core/serialize";
export * from "./core/error-handling";
export * from "./core/functions-actions";
export * from "./core/metadata";
// Export conformance-levels with renamed functions to avoid conflicts
export { 
  queryWithConformance,
  getServiceDocument,
  getMetadataDocument,
  validateConformanceLevel as validateConformanceLevelType,
  getSupportedQueryOptions,
  checkQueryOptionSupport,
  callFunction as callConformanceFunction,
  callAction as callConformanceAction,
  callFunctionImport as callConformanceFunctionImport,
  callActionImport as callConformanceActionImport,
  executeBatch,
  validateConformance,
  type ConformanceLevel,
  type ConformanceOptions,
  type ConformanceResponse
} from "./core/conformance-levels";
export * from "./core/format-serialization";
export * from "./core/search-compute-apply";
