import { ODataEntity } from './types';
export declare function createEntity<T extends ODataEntity>(collection: T[], entity: Partial<T>, entityType: string): T;
export declare function readEntity<T extends ODataEntity>(collection: T[], key: string | number, entityType: string): T | null;
export declare function updateEntity<T extends ODataEntity>(collection: T[], key: string | number, updates: Partial<T>, entityType: string): T | null;
export declare function deleteEntity<T extends ODataEntity>(collection: T[], key: string | number, entityType: string): boolean;
export declare function validateEntity<T extends ODataEntity>(entity: Partial<T>, entityType: string): {
    isValid: boolean;
    errors: string[];
};
export declare function generateETag(entity: ODataEntity): string;
export declare function validateETag(entity: ODataEntity, etag: string): boolean;
export declare function handleBatchOperations<T extends ODataEntity>(operations: Array<{
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    body?: any;
    headers?: Record<string, string>;
}>, collections: Record<string, T[]>): Array<{
    success: boolean;
    data?: any;
    error?: string;
}>;
