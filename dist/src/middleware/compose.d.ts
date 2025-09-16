import { MiddlewareObj } from '@middy/core';
/**
 * Composes multiple middlewares into a single middleware following Middy's onion pattern
 * @param middlewares Array of middlewares to compose
 * @returns Single middleware that executes all middlewares in proper order
 */
export declare function composeMiddlewares(...middlewares: MiddlewareObj[]): MiddlewareObj;
/**
 * Validates middleware execution order and dependencies
 * @param middlewares Array of middlewares to validate
 * @throws Error if middleware order is invalid
 */
export declare function validateMiddlewareOrder(middlewares: MiddlewareObj[]): void;
/**
 * Creates a middleware that logs execution for debugging
 * @param name Name of the middleware for logging
 * @returns Middleware with logging
 */
export declare function createLoggingMiddleware(name: string): MiddlewareObj;
/**
 * Helper to merge middleware options with defaults
 * @param defaults Default options
 * @param overrides Override options
 * @returns Merged options
 */
export declare function mergeMiddlewareOptions<T extends Record<string, unknown>>(defaults: T, overrides?: Partial<T>): T;
/**
 * Helper to create middleware context from request
 * @param request Middy request object
 * @returns OData middleware context
 */
export declare function getMiddlewareContext(request: any): any;
/**
 * Helper to set middleware context on request
 * @param request Middy request object
 * @param context OData middleware context
 */
export declare function setMiddlewareContext(request: any, context: any): void;
