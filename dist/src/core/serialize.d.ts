import { ODataCollectionResponse } from './types';
export declare function serializeCollection<T>(contextUrl: string, value: T[], count?: number, nextLink?: string): ODataCollectionResponse<T>;
