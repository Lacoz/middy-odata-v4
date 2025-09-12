import { ODataEntity, ODataQueryOptions } from './types';
export declare function filterArray<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[];
export declare function orderArray<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[];
export declare function paginateArray<T>(rows: T[], options: ODataQueryOptions): T[];
