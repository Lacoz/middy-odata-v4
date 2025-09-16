import type { MiddlewareObj } from "@middy/core";
import type { ODataErrorOptions, ODataMiddlewareContext } from "./types";
import { toODataError } from "../core/errors";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";

const DEFAULT_ERROR_OPTIONS: ODataErrorOptions = {
  includeStackTrace: false,
  logErrors: true,
  customErrorHandler: undefined,
};

/**
 * OData Error Middleware
 * 
 * Responsibilities:
 * - Catch and format errors according to OData standards
 * - Convert application errors to OData error responses
 * - Add proper HTTP status codes and error details
 * - Log errors for debugging and monitoring
 * - Handle different error types (validation, not found, server errors)
 */
export function odataError(options: Partial<ODataErrorOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_ERROR_OPTIONS, options);

  return {
    onError: async (request: any) => {
      try {
        const context = getMiddlewareContext(request);
        const error = request.error;

        if (!error) {
          return;
        }

        // Log the error if enabled
        if (opts.logErrors) {
          console.error("OData Error:", {
            message: error.message,
            stack: error.stack,
            context: {
              entitySet: context?.entitySet,
              serviceRoot: context?.serviceRoot,
              options: context?.options,
            },
          });
        }

        // Use custom error handler if provided
        if (opts.customErrorHandler) {
          const customResult = await opts.customErrorHandler(error, context, request);
          if (customResult) {
            request.response = customResult;
            return;
          }
        }

        // Create OData-compliant error response
        const odataError = toODataError(error, error.message);

        // Set the response
        request.response = {
          statusCode: (error as any).statusCode || 500,
          headers: {
            "Content-Type": "application/json",
            "OData-Version": "4.0",
          },
          body: JSON.stringify(odataError),
        };

        // Update context with error information
        if (context) {
          context.error = error;
          context.metadata = {
            ...context.metadata,
            error: {
              code: odataError.code,
              message: odataError.message,
              statusCode: odataError.statusCode,
            },
          };
          setMiddlewareContext(request, context);
        }

      } catch (errorHandlingError) {
        // If error handling itself fails, create a basic error response
        console.error("Error in error handling middleware:", errorHandlingError);
        
        request.response = {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "OData-Version": "4.0",
          },
          body: JSON.stringify({
            error: {
              code: "InternalServerError",
              message: "An error occurred while processing the request",
              target: "error-handling",
            },
          }),
        };
      }
    },
  };
}

/**
 * Helper function to create OData error from various error types
 */
export function createODataErrorFromType(
  errorType: "BadRequest" | "NotFound" | "Unauthorized" | "Forbidden" | "InternalServerError",
  message: string,
  details?: any
) {
  const errorMap = {
    BadRequest: { statusCode: 400, code: "BadRequest" },
    NotFound: { statusCode: 404, code: "NotFound" },
    Unauthorized: { statusCode: 401, code: "Unauthorized" },
    Forbidden: { statusCode: 403, code: "Forbidden" },
    InternalServerError: { statusCode: 500, code: "InternalServerError" },
  };

  const errorInfo = errorMap[errorType];
  
  return {
    statusCode: errorInfo.statusCode,
    code: errorInfo.code,
    message,
    details: details ? [details] : undefined,
    target: "odata-middleware",
  };
}

/**
 * Helper function to validate OData query options and throw appropriate errors
 */
export function validateODataQuery(options: any, context?: ODataMiddlewareContext) {
  const errors: string[] = [];

  // Validate $top
  if (options.top !== undefined) {
    if (typeof options.top !== "number" || options.top < 0) {
      errors.push("$top must be a non-negative integer");
    }
    if (context?.metadata?.maxTop && options.top > context.metadata.maxTop) {
      errors.push(`$top cannot exceed ${context.metadata.maxTop}`);
    }
  }

  // Validate $skip
  if (options.skip !== undefined) {
    if (typeof options.skip !== "number" || options.skip < 0) {
      errors.push("$skip must be a non-negative integer");
    }
  }

  // Validate $orderby
  if (options.orderby && typeof options.orderby !== "string") {
    errors.push("$orderby must be a string");
  }

  // Validate $filter
  if (options.filter && typeof options.filter !== "string") {
    errors.push("$filter must be a string");
  }

  // Validate $select
  if (options.select && typeof options.select !== "string") {
    errors.push("$select must be a string");
  }

  // Validate $expand
  if (options.expand && typeof options.expand !== "string") {
    errors.push("$expand must be a string");
  }

  if (errors.length > 0) {
    const error = new Error(`Invalid OData query options: ${errors.join(", ")}`);
    (error as any).statusCode = 400;
    (error as any).code = "BadRequest";
    throw error;
  }
}
