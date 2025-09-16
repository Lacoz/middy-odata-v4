import type { MiddlewareObj } from "@middy/core";
import type { ODataParseOptions } from "./types";
/**
 * OData Parse Middleware
 *
 * Responsibilities:
 * - Parse query parameters from API Gateway events
 * - Validate query options against EDM model
 * - Set up initial OData context
 * - Handle service root resolution
 */
export declare function odataParse(options?: Partial<ODataParseOptions>): MiddlewareObj;
