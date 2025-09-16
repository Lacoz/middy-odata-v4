import type { MiddlewareObj } from "@middy/core";
import type { ODataMetadataOptions } from "./types";
/**
 * OData Metadata Middleware
 *
 * Responsibilities:
 * - Handle OData metadata requests ($metadata endpoint)
 * - Generate service document for service root
 * - Provide EDM model information to clients
 * - Support custom annotations and metadata extensions
 * - Handle metadata versioning and caching
 * - Generate proper OData metadata XML/JSON responses
 */
export declare function odataMetadata(options?: Partial<ODataMetadataOptions>): MiddlewareObj;
/**
 * Helper function to create custom annotations
 */
export declare function createAnnotation(target: string, term: string, value: any, qualifier?: string): {
    target: string;
    term: string;
    value: any;
    qualifier: string | undefined;
};
/**
 * Helper function to create a collection of annotations
 */
export declare function createAnnotations(annotations: Array<{
    target: string;
    term: string;
    value: any;
    qualifier?: string;
}>): Record<string, any>;
/**
 * Common OData annotations for better client experience
 */
export declare const commonAnnotations: {
    entitySetCapabilities: (entitySetName: string) => {
        [x: string]: {
            Readable: boolean;
            Insertable?: undefined;
            Updatable?: undefined;
            Deletable?: undefined;
        } | {
            Insertable: boolean;
            Readable?: undefined;
            Updatable?: undefined;
            Deletable?: undefined;
        } | {
            Updatable: boolean;
            Readable?: undefined;
            Insertable?: undefined;
            Deletable?: undefined;
        } | {
            Deletable: boolean;
            Readable?: undefined;
            Insertable?: undefined;
            Updatable?: undefined;
        };
    };
    propertyDisplayName: (entityTypeName: string, propertyName: string, displayName: string) => {
        [x: string]: string;
    };
    propertyDescription: (entityTypeName: string, propertyName: string, description: string) => {
        [x: string]: string;
    };
    navigationPropertyRestrictions: (entityTypeName: string, navPropertyName: string) => {
        [x: string]: {
            RestrictedProperties: {
                NavigationProperty: string;
                ReadRestrictions: {
                    Readable: boolean;
                };
            }[];
        };
    };
    functionCapabilities: (functionName: string) => {
        [x: string]: boolean;
    };
    actionCapabilities: (actionName: string) => {
        [x: string]: boolean;
    };
};
/**
 * Helper function to merge multiple annotation objects
 */
export declare function mergeAnnotations(...annotationObjects: Record<string, any>[]): Record<string, any>;
/**
 * Helper function to create metadata options with common annotations
 */
export declare function createMetadataOptions(baseOptions?: Partial<ODataMetadataOptions>, customAnnotations?: Record<string, any>): ODataMetadataOptions;
