import type { MiddlewareObj } from "@middy/core";
import type { ODataSerializeOptions } from "./types";
/**
 * OData Serialize Middleware
 *
 * Responsibilities:
 * - Format response data according to OData standards
 * - Add @odata.context and other metadata annotations
 * - Handle different response formats (JSON, XML, ATOM)
 * - Ensure proper OData response structure
 * - Add ETags and other HTTP headers
 */
export declare function odataSerialize(options?: Partial<ODataSerializeOptions>): MiddlewareObj;
