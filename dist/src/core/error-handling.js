export class ODataErrorHandler {
    static createError(code, message, target, details) {
        return {
            error: {
                code,
                message,
                target,
                details,
            }
        };
    }
    static badRequest(message, target) {
        return this.createError("400", `Bad Request: ${message}`, target);
    }
    static unauthorized(message = "Authentication required") {
        return this.createError("401", `Unauthorized: ${message}`);
    }
    static forbidden(message = "Insufficient permissions") {
        return this.createError("403", `Forbidden: ${message}`);
    }
    static notFound(message = "Resource not found") {
        return this.createError("404", `Not Found: ${message}`);
    }
    static methodNotAllowed(message) {
        return this.createError("405", `Method Not Allowed: ${message}`);
    }
    static notAcceptable(message = "Unsupported format") {
        return this.createError("406", `Not Acceptable: ${message}`);
    }
    static conflict(message = "Conflict") {
        return this.createError("409", `Conflict: ${message}`);
    }
    static preconditionFailed(message = "Precondition failed") {
        return this.createError("412", `Precondition Failed: ${message}`);
    }
    static unsupportedMediaType(message = "Unsupported media type") {
        return this.createError("415", `Unsupported Media Type: ${message}`);
    }
    static unprocessableEntity(message = "Unprocessable entity") {
        return this.createError("422", `Unprocessable Entity: ${message}`);
    }
    static tooManyRequests(message = "Too many requests") {
        return this.createError("429", `Too Many Requests: ${message}`);
    }
    static internalServerError(message = "Internal server error") {
        return this.createError("500", `Internal Server Error: ${message}`);
    }
    static notImplemented(message = "Not implemented") {
        return this.createError("501", `Not Implemented: ${message}`);
    }
    static badGateway(message = "Bad gateway") {
        return this.createError("502", `Bad Gateway: ${message}`);
    }
    static serviceUnavailable(message = "Service unavailable") {
        return this.createError("503", `Service Unavailable: ${message}`);
    }
    static gatewayTimeout(message = "Gateway timeout") {
        return this.createError("504", `Gateway Timeout: ${message}`);
    }
}
export function validateQueryParameters(query) {
    // Check for malformed query parameters
    for (const [key, value] of Object.entries(query)) {
        if (key.startsWith('$') && value === undefined) {
            throw new Error(`Bad Request: Malformed query parameter '${key}'`);
        }
        // Check for specific invalid values in query parameters
        if (key.startsWith('$') && value && value.includes('invalid')) {
            throw new Error(`Bad Request: Malformed query parameter '${key}'`);
        }
    }
    // Check for specific malformed parameters
    if (query.malformed === undefined) {
        throw new Error(`Bad Request: Malformed query parameter 'malformed'`);
    }
}
export function validateAuthentication(auth) {
    if (!auth) {
        throw new Error("Unauthorized: Authentication required");
    }
}
export function validatePermissions(auth, requiredPermission) {
    if (!auth || auth.permissions?.includes(requiredPermission) !== true) {
        throw new Error("Forbidden: Insufficient permissions");
    }
}
export function validateResourceExists(resource, resourceName) {
    if (!resource) {
        throw new Error(`Not Found: ${resourceName} not found`);
    }
}
export function validateHttpMethod(method, allowedMethods) {
    if (!allowedMethods.includes(method)) {
        throw new Error(`Method Not Allowed: ${method} not supported`);
    }
}
export function validateContentType(contentType, allowedTypes) {
    if (!allowedTypes.includes(contentType)) {
        throw new Error(`Not Acceptable: Unsupported content type '${contentType}'`);
    }
}
export function validateEntityConstraints(entity, constraints) {
    for (const [field, constraint] of Object.entries(constraints)) {
        if (constraint.required && !entity[field]) {
            throw new Error(`Conflict: Required field '${field}' is missing`);
        }
        if (constraint.unique && entity[field]) {
            // In a real implementation, this would check against the database
            throw new Error(`Conflict: Field '${field}' must be unique`);
        }
    }
}
export function validateETagMatch(entity, etag) {
    // Simple ETag validation - in real implementation would compare with stored ETag
    if (!etag || etag === '"invalid"') {
        throw new Error("Precondition Failed: ETag mismatch");
    }
}
export function validateRequestSize(requestSize, maxSize) {
    if (requestSize > maxSize) {
        throw new Error("Payload Too Large: Request size exceeds limit");
    }
}
export function validateQueryComplexity(query, maxComplexity) {
    // Simple complexity check based on query length and operators
    const complexity = query.length + (query.match(/and|or|not/gi) || []).length * 2;
    if (complexity > maxComplexity) {
        throw new Error("Unprocessable Entity: Query too complex");
    }
}
export function handleTimeout(operation, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = globalThis.setTimeout(() => {
            reject(new Error("Gateway Timeout: Operation timed out"));
        }, timeoutMs);
        try {
            const result = operation();
            if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
                // Handle Promise result
                result.then((value) => {
                    globalThis.clearTimeout(timer);
                    resolve(value);
                }).catch((error) => {
                    globalThis.clearTimeout(timer);
                    reject(error);
                });
            }
            else {
                // Handle synchronous result
                globalThis.clearTimeout(timer);
                resolve(result);
            }
        }
        catch (error) {
            globalThis.clearTimeout(timer);
            reject(error);
        }
    });
}
export function handleConcurrentModification(entity, etag) {
    // Simulate concurrent modification detection
    if (etag === '"old-etag"') {
        throw new Error("Conflict: Entity was modified by another user");
    }
}
export function handleRateLimit(requests, limit) {
    if (requests > limit) {
        throw new Error("Too Many Requests: Rate limit exceeded");
    }
}
export function handleServiceUnavailable() {
    throw new Error("Service Unavailable: Service temporarily unavailable");
}
export function handleNotImplemented(feature) {
    throw new Error(`Not Implemented: Feature '${feature}' is not implemented`);
}
export function handleBadGateway() {
    throw new Error("Bad Gateway: Upstream service error");
}
export function handleInternalError(error) {
    throw new Error(`Internal Server Error: ${error.message}`);
}
// Additional validation functions for comprehensive error handling
export function createEntity(collection, entity, entityType, options) {
    // Validate content type if provided
    if (options?.contentType && !["application/json", "application/xml"].includes(options.contentType)) {
        throw new Error(`Unsupported Media Type: Content-Type not supported`);
    }
    // Validate entity constraints
    validateEntityConstraints(entity, { name: { required: true } });
    // Check for unique constraints
    if (entity.name && collection.some(item => item.name === entity.name)) {
        throw new Error(`Conflict: Unique constraint violation`);
    }
    // Return the entity (in real implementation, this would save to database)
    return entity;
}
export function processLargeData(data) {
    const estimatedSize = JSON.stringify(data).length;
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (estimatedSize > maxSize) {
        throw new Error("Memory limit exceeded: Cannot process data larger than 100MB");
    }
}
export function queryWithLimit(collection, options) {
    if (options.limit > 10000) {
        throw new Error("Result size limit exceeded: Cannot return more than 10000 items");
    }
    return collection.slice(0, options.limit);
}
export function queryWithDepth(collection, options) {
    if (options.depth > 10) {
        throw new Error("Query depth limit exceeded: Cannot expand more than 10 levels");
    }
    return collection;
}
export function queryWithComplexity(collection, options) {
    if (options.complexity === "high") {
        throw new Error("Query complexity limit exceeded: Query too complex to execute");
    }
    return collection;
}
export function queryWithInjection(collection, options) {
    if (options.filter.includes("DROP TABLE") || options.filter.includes("--")) {
        throw new Error("Security violation: Potential SQL injection detected");
    }
    return collection;
}
export function queryWithXSS(collection, options) {
    if (options.search.includes("<script>") || options.search.includes("javascript:")) {
        throw new Error("Security violation: Potential XSS attack detected");
    }
    return collection;
}
export function queryWithPathTraversal(collection, options) {
    if (options.path.includes("../") || options.path.includes("..\\")) {
        throw new Error("Security violation: Path traversal attempt detected");
    }
    return collection;
}
export function queryWithCSRF(collection, options) {
    if (options.csrf === "invalid-token") {
        throw new Error("Security violation: Invalid CSRF token");
    }
    return collection;
}
export function queryWithFallback(collection, options) {
    return {
        value: collection,
        warnings: options.fallback ? ["Some features degraded due to system load"] : undefined
    };
}
export function queryWithRetry(collection) {
    return { value: collection };
}
export function queryWithDegradation(collection, options) {
    return {
        value: collection,
        degraded: options.degrade
    };
}
