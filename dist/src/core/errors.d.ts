import { ODataErrorPayload, EdmModel } from './types';
export declare class ODataBadRequest extends Error {
    statusCode: number;
    code: string;
}
export declare class ODataInternalServerError extends Error {
    statusCode: number;
    code: string;
}
export declare function toODataError(err: unknown, message?: string): ODataErrorPayload;
export declare function validateSelectParameters(select: string[] | undefined, entityType: string, edmModel: EdmModel): void;
export declare function validateFilterExpression(filter: string | undefined, entityType: string, edmModel: EdmModel): void;
export declare function validateOrderByProperties(orderby: string[] | undefined, entityType: string, edmModel: EdmModel): void;
export declare function validateExpandNavigationProperties(expand: string[] | undefined, entityType: string, edmModel: EdmModel): void;
export declare function validateEdmModelConstraints(entity: any, entityType: string, edmModel: EdmModel): void;
export declare function getHttpStatusCode(error: Error): number;
export declare function isValidationError(error: Error): boolean;
export declare function isServerError(error: Error): boolean;
