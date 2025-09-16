import { ODataEntity, ODataQueryOptions } from './types';
export declare function searchData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[];
export declare function computeData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[];
export declare function applyData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[];
