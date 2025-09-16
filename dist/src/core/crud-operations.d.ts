import type { ODataEntity } from "./types";
export interface CrudOptions {
    conformance?: "minimal" | "intermediate" | "advanced";
    ifMatch?: string;
    ifNoneMatch?: string;
}
export declare function createEntity<T extends ODataEntity>(collection: T[], entity: Partial<T>): T;
export declare function readEntity<T extends ODataEntity>(collection: T[], key: string | number): T | null;
export declare function updateEntity<T extends ODataEntity>(collection: T[], key: string | number, updates: Partial<T>): T | null;
export declare function deleteEntity<T extends ODataEntity>(collection: T[], key: string | number): boolean;
export declare function validateEntity<T extends ODataEntity>(entity: Partial<T>, entityType: string): {
    isValid: boolean;
    errors: string[];
};
export declare function generateETag(entity: ODataEntity): string;
export declare function validateETag(entity: ODataEntity, etag: string): boolean;
export declare function handleBatchOperations<T extends ODataEntity>(operations: Array<{
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    body?: unknown;
    headers?: Record<string, string>;
}>, collections: Record<string, T[]>): Array<{
    success: boolean;
    data?: unknown;
    error?: string;
}>;
export declare function createEntityWithValidation<T extends ODataEntity>(collection: T[], entity: Partial<T>, entityType: string): T;
export declare function deepInsert<T extends ODataEntity>(collection: T[], entity: Partial<T>): T;
export declare function deepUpdate<T extends ODataEntity>(collection: T[], key: string | number, updates: Partial<T>): T | null;
export declare function partialUpdate<T extends ODataEntity>(collection: T[], key: string | number, updates: Partial<T>): T | null;
export declare function conditionalRead<T extends ODataEntity>(collection: T[], key: string | number, entityType: string, options?: CrudOptions): T | null;
export declare function conditionalUpdate<T extends ODataEntity>(collection: T[], key: string | number, updates: Partial<T>, entityType: string, options?: CrudOptions): T | null;
export declare function conditionalDelete<T extends ODataEntity>(collection: T[], key: string | number, entityType: string, options?: CrudOptions): boolean;
export declare function cascadeDelete<T extends ODataEntity>(collection: T[], key: string | number): boolean;
export declare function restrictedDelete<T extends ODataEntity>(collection: T[], key: string | number): boolean;
