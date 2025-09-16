import { MiddlewareObj } from '@middy/core';
import { ODataFunctionsOptions, ODataMiddlewareContext } from './types';
/**
 * OData Functions & Actions Middleware
 *
 * Responsibilities:
 * - Handle OData function calls (bound and unbound)
 * - Handle OData action invocations
 * - Execute custom function and action resolvers
 * - Validate function/action parameters against EDM model
 * - Route function/action requests to appropriate handlers
 * - Support both synchronous and asynchronous operations
 */
export declare function odataFunctions(options?: Partial<ODataFunctionsOptions>): MiddlewareObj;
/**
 * Helper function to register function resolvers
 */
export declare function registerFunctionResolver(functionName: string, resolver: (parameters: any, context: ODataMiddlewareContext) => Promise<any> | any): {
    functionName: string;
    resolver: (parameters: any, context: ODataMiddlewareContext) => Promise<any> | any;
};
/**
 * Helper function to register action resolvers
 */
export declare function registerActionResolver(actionName: string, resolver: (parameters: any, context: ODataMiddlewareContext) => Promise<any> | any): {
    actionName: string;
    resolver: (parameters: any, context: ODataMiddlewareContext) => Promise<any> | any;
};
/**
 * Helper function to create a function resolver map
 */
export declare function createFunctionResolvers(resolvers: Array<{
    functionName: string;
    resolver: (...args: unknown[]) => unknown;
}>): Record<string, (...args: unknown[]) => unknown>;
/**
 * Helper function to create an action resolver map
 */
export declare function createActionResolvers(resolvers: Array<{
    actionName: string;
    resolver: (...args: unknown[]) => unknown;
}>): Record<string, (...args: unknown[]) => unknown>;
/**
 * Built-in function resolvers for common operations
 */
export declare const builtInFunctionResolvers: {
    length: (value: string) => number;
    tolower: (value: string) => string;
    toupper: (value: string) => string;
    trim: (value: string) => string;
    substring: (value: string, start: number, length?: number) => string;
    concat: (...values: string[]) => string;
    round: (value: number) => number;
    floor: (value: number) => number;
    ceiling: (value: number) => number;
    year: (value: Date | string) => number;
    month: (value: Date | string) => number;
    day: (value: Date | string) => number;
    hour: (value: Date | string) => number;
    minute: (value: Date | string) => number;
    second: (value: Date | string) => number;
    cast: (value: any, type: string) => any;
};
/**
 * Built-in action resolvers for common operations
 */
export declare const builtInActionResolvers: {
    create: (data: any) => Promise<any>;
    update: (data: any) => Promise<any>;
    delete: () => Promise<{
        success: boolean;
    }>;
    approve: (data: any) => Promise<any>;
    reject: (data: any) => Promise<any>;
};
