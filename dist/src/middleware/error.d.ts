import { MiddlewareObj } from '@middy/core';
import { ODataErrorOptions, ODataMiddlewareContext } from './types';
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
export declare function odataError(options?: Partial<ODataErrorOptions>): MiddlewareObj;
/**
 * Helper function to create OData error from various error types
 */
export declare function createODataErrorFromType(errorType: "BadRequest" | "NotFound" | "Unauthorized" | "Forbidden" | "InternalServerError", message: string, details?: any): {
    statusCode: number;
    code: string;
    message: string;
    details: any[] | undefined;
    target: string;
};
/**
 * Helper function to validate OData query options and throw appropriate errors
 */
export declare function validateODataQuery(options: any, context?: ODataMiddlewareContext): void;
