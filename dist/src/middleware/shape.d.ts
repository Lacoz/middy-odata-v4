import type { MiddlewareObj } from "@middy/core";
import type { ODataShapeOptions } from "./types";
/**
 * OData Shape Middleware
 *
 * Responsibilities:
 * - Apply $select projection to response data
 * - Handle $expand navigation property resolution
 * - Transform response data according to OData query options
 * - Manage expand depth and prevent infinite loops
 */
export declare function odataShape(options?: Partial<ODataShapeOptions>): MiddlewareObj;
