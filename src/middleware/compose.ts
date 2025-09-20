import type { MiddlewareObj, Request } from "@middy/core";
import type { ODataMiddlewareContext } from "./types";


/**
 * Composes multiple middlewares into a single middleware following Middy's onion pattern
 * @param middlewares Array of middlewares to compose
 * @returns Single middleware that executes all middlewares in proper order
 */
export function composeMiddlewares(...middlewares: MiddlewareObj[]): MiddlewareObj {
  return {
    before: async (handler) => {
      // Execute before phases in order
      for (const middleware of middlewares) {
        if (middleware.before) {
          await middleware.before(handler);
        }
      }
    },
    after: async (handler) => {
      // Execute after phases in reverse order
      for (const middleware of middlewares.slice().reverse()) {
        if (middleware.after) {
          await middleware.after(handler);
        }
      }
    },
    onError: async (handler) => {
      // Execute error handlers in reverse order
      for (const middleware of middlewares.slice().reverse()) {
        if (middleware.onError) {
          await middleware.onError(handler);
        }
      }
    },
  };
}

/**
 * Validates middleware execution order and dependencies
 * @param middlewares Array of middlewares to validate
 * @throws Error if middleware order is invalid
 */
export function validateMiddlewareOrder(middlewares: MiddlewareObj[]): void {
  // This could be expanded to check for specific middleware dependencies
  // For now, we'll just ensure we have at least one middleware
  if (middlewares.length === 0) {
    throw new Error("At least one middleware is required");
  }
}

/**
 * Creates a middleware that logs execution for debugging
 * @param name Name of the middleware for logging
 * @returns Middleware with logging
 */
export function createLoggingMiddleware(name: string): MiddlewareObj {
  return {
    before: async (handler) => {
      const startTime = Date.now();
      handler.internal = handler.internal || {};
      (handler.internal as any)[`${name}_start`] = startTime;
    },
    after: async (handler) => {
      const startTime = (handler.internal as any)?.[`${name}_start`] || Date.now();
      const duration = Date.now() - startTime;
      // Duration could be used for logging in the future
      void duration;
    },
    onError: async (handler) => {
      const startTime = (handler.internal as any)?.[`${name}_start`] || Date.now();
      const duration = Date.now() - startTime;
      console.error(`[OData] ${name} middleware: error phase in ${duration}ms`, handler.error);
    },
  };
}

/**
 * Helper to merge middleware options with defaults
 * @param defaults Default options
 * @param overrides Override options
 * @returns Merged options
 */
export function mergeMiddlewareOptions<T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T> = {}
): T {
  return { ...defaults, ...overrides };
}

/**
 * Helper to create middleware context from request
 * @param request Middy request object
 * @returns OData middleware context
 */
export function getMiddlewareContext(
  request: Request & { odata?: ODataMiddlewareContext },
): ODataMiddlewareContext {
  const internal = request.internal as (Record<string, unknown> & {
    odata?: ODataMiddlewareContext;
  }) | undefined;

  return request.odata ?? internal?.odata ?? ({} as ODataMiddlewareContext);
}

/**
 * Helper to set middleware context on request
 * @param request Middy request object
 * @param context OData middleware context
 */
export function setMiddlewareContext(
  request: Request & { odata?: ODataMiddlewareContext },
  context: ODataMiddlewareContext,
): void {
  const internal = (request.internal || {}) as Record<string, unknown> & {
    odata?: ODataMiddlewareContext;
  };
  internal.odata = context;
  request.internal = internal;
  request.odata = context;
}
