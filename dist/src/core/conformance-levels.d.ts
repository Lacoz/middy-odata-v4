import { ODataEntity } from './types';
export type ConformanceLevel = "minimal" | "intermediate" | "advanced";
export interface ConformanceOptions {
    conformance: ConformanceLevel;
    key?: string | number;
    select?: string[];
    expand?: string[];
    filter?: string;
    orderby?: string;
    top?: number;
    skip?: number;
    count?: boolean;
    search?: string;
    compute?: string[];
    apply?: string;
}
export interface ConformanceResponse<T> {
    value: T | T[];
    "@odata.context"?: string;
    "@odata.count"?: number;
}
export declare function queryWithConformance<T extends ODataEntity>(data: T[], options: ConformanceOptions): ConformanceResponse<T> | null;
export declare function getServiceDocument(options: {
    conformance: ConformanceLevel;
}): Record<string, unknown>;
export declare function getMetadataDocument(options: {
    conformance: ConformanceLevel;
}): Record<string, unknown>;
export declare function validateConformanceLevel(level: string): ConformanceLevel;
export declare function getSupportedQueryOptions(conformance: ConformanceLevel): string[];
export declare function checkQueryOptionSupport(queryOption: string, conformance: ConformanceLevel): boolean;
export declare function callFunction(functionName: string, parameters: Record<string, unknown>, options: {
    conformance: ConformanceLevel;
}): {
    value: unknown;
};
export declare function callAction(actionName: string, parameters: Record<string, unknown>, options: {
    conformance: ConformanceLevel;
}): {
    value: unknown;
};
export declare function callFunctionImport(functionName: string, parameters: Record<string, unknown>, options: {
    conformance: ConformanceLevel;
}): {
    value: unknown;
};
export declare function callActionImport(actionName: string, parameters: Record<string, unknown>, options: {
    conformance: ConformanceLevel;
}): {
    value: unknown;
};
export declare function executeBatch(batch: Array<{
    method: string;
    url: string;
    body?: unknown;
}>, options: {
    conformance: ConformanceLevel;
}): unknown[];
export declare function validateConformance(level: ConformanceLevel): {
    isValid: boolean;
    missingFeatures: string[];
};
