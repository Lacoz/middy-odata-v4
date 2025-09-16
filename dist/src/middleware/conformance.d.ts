import { MiddlewareObj } from '@middy/core';
import { ODataConformanceOptions, ODataMiddlewareContext } from './types';
/**
 * OData Conformance Middleware
 *
 * Responsibilities:
 * - Validate OData query options against conformance levels
 * - Enforce OData v4.01 specification compliance
 * - Handle conformance level negotiation
 * - Provide conformance level information in responses
 * - Support custom validation rules and strict mode
 * - Manage feature availability based on conformance level
 */
export declare function odataConformance(options?: Partial<ODataConformanceOptions>): MiddlewareObj;
/**
 * Helper function to create custom validation rules
 */
export declare function createValidationRule(name: string, validator: (options: any, context: ODataMiddlewareContext) => {
    valid: boolean;
    error?: string;
}): {
    name: string;
    validator: (options: any, context: ODataMiddlewareContext) => {
        valid: boolean;
        error?: string;
    };
};
/**
 * Common validation rules for different conformance levels
 */
export declare const commonValidationRules: {
    minimal: {
        noAdvancedQueries: (options: any) => {
            valid: boolean;
            error: string;
        };
        basicQueriesOnly: (options: any) => {
            valid: boolean;
            error: string;
        };
    };
    intermediate: {
        noAdvancedFunctions: (options: any) => {
            valid: boolean;
            error: string;
        };
        limitedSearch: (options: any) => {
            valid: boolean;
            error: string;
        };
    };
    advanced: {
        allFeaturesSupported: () => {
            valid: boolean;
        };
    };
};
/**
 * Helper function to create conformance options with validation rules
 */
export declare function createConformanceOptions(level?: "minimal" | "intermediate" | "advanced", strictMode?: boolean, customRules?: Record<string, (...args: unknown[]) => unknown>): ODataConformanceOptions;
/**
 * Helper function to negotiate conformance level from request
 */
export declare function negotiateConformanceLevel(requestedLevel: string | undefined, supportedLevels?: string[], defaultLevel?: string): string;
/**
 * Helper function to check if a feature is supported at a conformance level
 */
export declare function isFeatureSupported(feature: string, conformanceLevel: string): boolean;
