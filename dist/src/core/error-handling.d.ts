import { ODataEntity } from './types';
export interface ODataError {
    error: {
        code: string;
        message: string;
        target?: string;
        details?: Array<{
            code: string;
            message: string;
            target?: string;
        }>;
        innererror?: {
            message: string;
            type: string;
            stacktrace?: string;
        };
    };
}
export declare class ODataErrorHandler {
    static createError(code: string, message: string, target?: string, details?: any[]): ODataError;
    static badRequest(message: string, target?: string): ODataError;
    static unauthorized(message?: string): ODataError;
    static forbidden(message?: string): ODataError;
    static notFound(message?: string): ODataError;
    static methodNotAllowed(message: string): ODataError;
    static notAcceptable(message?: string): ODataError;
    static conflict(message?: string): ODataError;
    static preconditionFailed(message?: string): ODataError;
    static unsupportedMediaType(message?: string): ODataError;
    static unprocessableEntity(message?: string): ODataError;
    static tooManyRequests(message?: string): ODataError;
    static internalServerError(message?: string): ODataError;
    static notImplemented(message?: string): ODataError;
    static badGateway(message?: string): ODataError;
    static serviceUnavailable(message?: string): ODataError;
    static gatewayTimeout(message?: string): ODataError;
}
export declare function validateQueryParameters(query: Record<string, string | undefined>): void;
export declare function validateAuthentication(auth: any): void;
export declare function validatePermissions(auth: any, requiredPermission: string): void;
export declare function validateResourceExists(resource: any, resourceName: string): void;
export declare function validateHttpMethod(method: string, allowedMethods: string[]): void;
export declare function validateContentType(contentType: string, allowedTypes: string[]): void;
export declare function validateEntityConstraints<T extends ODataEntity>(entity: Partial<T>, constraints: Record<string, any>): void;
export declare function validateETagMatch(entity: ODataEntity, etag: string): void;
export declare function validateRequestSize(requestSize: number, maxSize: number): void;
export declare function validateQueryComplexity(query: string, maxComplexity: number): void;
export declare function handleTimeout(operation: () => unknown, timeoutMs: number): Promise<unknown>;
export declare function handleConcurrentModification(entity: ODataEntity, etag: string): void;
export declare function handleRateLimit(requests: number, limit: number): void;
export declare function handleServiceUnavailable(): void;
export declare function handleNotImplemented(feature: string): void;
export declare function handleBadGateway(): void;
export declare function handleInternalError(error: Error): void;
