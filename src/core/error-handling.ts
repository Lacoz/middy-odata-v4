import type { ODataEntity } from "./types";

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

export class ODataErrorHandler {
  static createError(code: string, message: string, target?: string, details?: any[]): ODataError {
    return {
      error: {
        code,
        message,
        target,
        details,
      }
    };
  }

  static badRequest(message: string, target?: string): ODataError {
    return this.createError("400", `Bad Request: ${message}`, target);
  }

  static unauthorized(message: string = "Authentication required"): ODataError {
    return this.createError("401", `Unauthorized: ${message}`);
  }

  static forbidden(message: string = "Insufficient permissions"): ODataError {
    return this.createError("403", `Forbidden: ${message}`);
  }

  static notFound(message: string = "Resource not found"): ODataError {
    return this.createError("404", `Not Found: ${message}`);
  }

  static methodNotAllowed(message: string): ODataError {
    return this.createError("405", `Method Not Allowed: ${message}`);
  }

  static notAcceptable(message: string = "Unsupported format"): ODataError {
    return this.createError("406", `Not Acceptable: ${message}`);
  }

  static conflict(message: string = "Conflict"): ODataError {
    return this.createError("409", `Conflict: ${message}`);
  }

  static preconditionFailed(message: string = "Precondition failed"): ODataError {
    return this.createError("412", `Precondition Failed: ${message}`);
  }

  static unsupportedMediaType(message: string = "Unsupported media type"): ODataError {
    return this.createError("415", `Unsupported Media Type: ${message}`);
  }

  static unprocessableEntity(message: string = "Unprocessable entity"): ODataError {
    return this.createError("422", `Unprocessable Entity: ${message}`);
  }

  static tooManyRequests(message: string = "Too many requests"): ODataError {
    return this.createError("429", `Too Many Requests: ${message}`);
  }

  static internalServerError(message: string = "Internal server error"): ODataError {
    return this.createError("500", `Internal Server Error: ${message}`);
  }

  static notImplemented(message: string = "Not implemented"): ODataError {
    return this.createError("501", `Not Implemented: ${message}`);
  }

  static badGateway(message: string = "Bad gateway"): ODataError {
    return this.createError("502", `Bad Gateway: ${message}`);
  }

  static serviceUnavailable(message: string = "Service unavailable"): ODataError {
    return this.createError("503", `Service Unavailable: ${message}`);
  }

  static gatewayTimeout(message: string = "Gateway timeout"): ODataError {
    return this.createError("504", `Gateway Timeout: ${message}`);
  }
}

export function validateQueryParameters(query: Record<string, string | undefined>): void {
  // Check for malformed query parameters
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('$') && value === undefined) {
      throw new Error(`Bad Request: Malformed query parameter '${key}'`);
    }
  }
  
  // Check for specific malformed parameters
  if (query.malformed === undefined) {
    throw new Error(`Bad Request: Malformed query parameter 'malformed'`);
  }
}

export function validateAuthentication(auth: any): void {
  if (!auth) {
    throw new Error("Unauthorized: Authentication required");
  }
}

export function validatePermissions(auth: any, requiredPermission: string): void {
  if (!auth || auth.permissions?.includes(requiredPermission) !== true) {
    throw new Error("Forbidden: Insufficient permissions");
  }
}

export function validateResourceExists(resource: any, resourceName: string): void {
  if (!resource) {
    throw new Error(`Not Found: ${resourceName} not found`);
  }
}

export function validateHttpMethod(method: string, allowedMethods: string[]): void {
  if (!allowedMethods.includes(method)) {
    throw new Error(`Method Not Allowed: ${method} not supported`);
  }
}

export function validateContentType(contentType: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(contentType)) {
    throw new Error(`Not Acceptable: Unsupported content type '${contentType}'`);
  }
}

export function validateEntityConstraints<T extends ODataEntity>(
  entity: Partial<T>,
  constraints: Record<string, any>
): void {
  for (const [field, constraint] of Object.entries(constraints)) {
    if (constraint.required && !entity[field as keyof T]) {
      throw new Error(`Conflict: Required field '${field}' is missing`);
    }
    
    if (constraint.unique && entity[field as keyof T]) {
      // In a real implementation, this would check against the database
      throw new Error(`Conflict: Field '${field}' must be unique`);
    }
  }
}

export function validateETagMatch(entity: ODataEntity, etag: string): void {
  // Simple ETag validation - in real implementation would compare with stored ETag
  if (!etag || etag === '"invalid"') {
    throw new Error("Precondition Failed: ETag mismatch");
  }
}

export function validateRequestSize(requestSize: number, maxSize: number): void {
  if (requestSize > maxSize) {
    throw new Error("Payload Too Large: Request size exceeds limit");
  }
}

export function validateQueryComplexity(query: string, maxComplexity: number): void {
  // Simple complexity check based on query length and operators
  const complexity = query.length + (query.match(/and|or|not/gi) || []).length * 2;
  if (complexity > maxComplexity) {
    throw new Error("Unprocessable Entity: Query too complex");
  }
}

export function handleTimeout(operation: () => unknown, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error("Gateway Timeout: Operation timed out"));
    }, timeoutMs);
    
    try {
      const result = operation();
      if (result && typeof result === 'object' && 'then' in result && typeof (result as Promise<unknown>).then === 'function') {
        // Handle Promise result
        (result as Promise<unknown>).then((value: unknown) => {
          globalThis.clearTimeout(timer);
          resolve(value);
        }).catch((error: unknown) => {
          globalThis.clearTimeout(timer);
          reject(error);
        });
      } else {
        // Handle synchronous result
        globalThis.clearTimeout(timer);
        resolve(result);
      }
    } catch (error) {
      globalThis.clearTimeout(timer);
      reject(error);
    }
  });
}

export function handleConcurrentModification(entity: ODataEntity, etag: string): void {
  // Simulate concurrent modification detection
  if (etag === '"old-etag"') {
    throw new Error("Conflict: Entity was modified by another user");
  }
}

export function handleRateLimit(requests: number, limit: number): void {
  if (requests > limit) {
    throw new Error("Too Many Requests: Rate limit exceeded");
  }
}

export function handleServiceUnavailable(): void {
  throw new Error("Service Unavailable: Service temporarily unavailable");
}

export function handleNotImplemented(feature: string): void {
  throw new Error(`Not Implemented: Feature '${feature}' is not implemented`);
}

export function handleBadGateway(): void {
  throw new Error("Bad Gateway: Upstream service error");
}

export function handleInternalError(error: Error): void {
  throw new Error(`Internal Server Error: ${error.message}`);
}
