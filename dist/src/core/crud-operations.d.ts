import { ODataEntity } from './types';
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
