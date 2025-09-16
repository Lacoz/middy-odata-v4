import { ODataEntity, ODataQueryOptions } from './types';
export declare function applySelect<T extends ODataEntity>(row: T, select?: string[]): Partial<T>;
export declare function projectArray<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): Partial<T>[];
export declare function expandData<T extends Record<string, any>>(data: T | T[], options: ODataQueryOptions): T | T[];
