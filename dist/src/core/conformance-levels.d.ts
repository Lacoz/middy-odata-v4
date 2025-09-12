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
export declare function queryWithConformance<T extends ODataEntity>(data: T[], options: ConformanceOptions): any;
export declare function getServiceDocument(options: {
    conformance: ConformanceLevel;
}): any;
export declare function getMetadataDocument(options: {
    conformance: ConformanceLevel;
}): any;
export declare function validateConformanceLevel(level: string): ConformanceLevel;
export declare function getSupportedQueryOptions(conformance: ConformanceLevel): string[];
export declare function checkQueryOptionSupport(queryOption: string, conformance: ConformanceLevel): boolean;
