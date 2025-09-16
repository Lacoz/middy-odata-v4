import { MiddlewareObj } from '@middy/core';
import { ODataFilterOptions } from './types';
/**
 * OData Filter Middleware
 *
 * Responsibilities:
 * - Apply $filter expressions to response data
 * - Apply $orderby sorting to response data
 * - Handle filter expression parsing and evaluation
 * - Manage filter depth and prevent infinite recursion
 */
export declare function odataFilter(options?: Partial<ODataFilterOptions>): MiddlewareObj;
