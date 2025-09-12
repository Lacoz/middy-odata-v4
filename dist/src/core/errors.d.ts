import { ODataErrorPayload } from './types';
export declare class ODataBadRequest extends Error {
    statusCode: number;
    code: string;
}
export declare class ODataInternalServerError extends Error {
    statusCode: number;
    code: string;
}
export declare function toODataError(err: unknown, message?: string): ODataErrorPayload;
