import { MiddlewareObj } from '@middy/core';
import { ODataPaginationOptions } from './types';
/**
 * OData Pagination Middleware
 *
 * Responsibilities:
 * - Apply $top and $skip pagination to response data
 * - Calculate and include $count when requested
 * - Generate @odata.nextLink for pagination
 * - Enforce maximum page size limits
 * - Handle pagination edge cases
 */
export declare function odataPagination(options?: Partial<ODataPaginationOptions>): MiddlewareObj;
