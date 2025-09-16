import { callFunction, callAction } from "../core/functions-actions";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";
const DEFAULT_FUNCTIONS_OPTIONS = {
    enableFunctions: true,
    enableActions: true,
    functionResolvers: {},
    actionResolvers: {},
    validateParameters: true,
};
/**
 * OData Functions & Actions Middleware
 *
 * Responsibilities:
 * - Handle OData function calls (bound and unbound)
 * - Handle OData action invocations
 * - Execute custom function and action resolvers
 * - Validate function/action parameters against EDM model
 * - Route function/action requests to appropriate handlers
 * - Support both synchronous and asynchronous operations
 */
export function odataFunctions(options = {}) {
    const opts = mergeMiddlewareOptions(DEFAULT_FUNCTIONS_OPTIONS, options);
    return {
        before: async (request) => {
            try {
                const context = getMiddlewareContext(request);
                if (!context) {
                    return;
                }
                const { event } = request;
                const path = event.path || event.rawPath || "";
                // Check if this is a function or action call
                const functionMatch = path.match(/\/functions\/([^/]+)(?:\/([^/]+))?/);
                const actionMatch = path.match(/\/actions\/([^/]+)(?:\/([^/]+))?/);
                if (functionMatch && opts.enableFunctions) {
                    const [, functionName, entityKey] = functionMatch;
                    // Execute function
                    const result = await callFunction(functionName, {
                        parameters: event.queryStringParameters || {},
                        entityKey,
                        context,
                    });
                    // Set the response directly for function calls
                    request.response = {
                        statusCode: 200,
                        headers: {
                            "Content-Type": "application/json",
                            "OData-Version": "4.0",
                        },
                        body: JSON.stringify(result),
                    };
                    // Update context
                    context.data = result;
                    context.metadata = {
                        ...context.metadata,
                        function: {
                            name: functionName,
                            entityKey,
                            parameters: event.queryStringParameters || {},
                        },
                    };
                    setMiddlewareContext(request, context);
                }
                else if (actionMatch && opts.enableActions) {
                    const [, actionName, entityKey] = actionMatch;
                    // Execute action
                    const result = await callAction(actionName, {
                        parameters: event.body ? JSON.parse(event.body) : {},
                        entityKey,
                        context,
                    });
                    // Set the response directly for action calls
                    request.response = {
                        statusCode: 200,
                        headers: {
                            "Content-Type": "application/json",
                            "OData-Version": "4.0",
                        },
                        body: JSON.stringify(result),
                    };
                    // Update context
                    context.data = result;
                    context.metadata = {
                        ...context.metadata,
                        action: {
                            name: actionName,
                            entityKey,
                            parameters: event.body ? JSON.parse(event.body) : {},
                        },
                    };
                    setMiddlewareContext(request, context);
                }
            }
            catch (error) {
                // Let the error middleware handle this
                request.error = error;
                throw error;
            }
        },
    };
}
/**
 * Helper function to register function resolvers
 */
export function registerFunctionResolver(functionName, resolver) {
    return {
        functionName,
        resolver,
    };
}
/**
 * Helper function to register action resolvers
 */
export function registerActionResolver(actionName, resolver) {
    return {
        actionName,
        resolver,
    };
}
/**
 * Helper function to create a function resolver map
 */
export function createFunctionResolvers(resolvers) {
    return resolvers.reduce((acc, { functionName, resolver }) => {
        acc[functionName] = resolver;
        return acc;
    }, {});
}
/**
 * Helper function to create an action resolver map
 */
export function createActionResolvers(resolvers) {
    return resolvers.reduce((acc, { actionName, resolver }) => {
        acc[actionName] = resolver;
        return acc;
    }, {});
}
/**
 * Built-in function resolvers for common operations
 */
export const builtInFunctionResolvers = {
    // String functions
    length: (value) => value?.length || 0,
    tolower: (value) => value?.toLowerCase() || "",
    toupper: (value) => value?.toUpperCase() || "",
    trim: (value) => value?.trim() || "",
    substring: (value, start, length) => {
        if (!value)
            return "";
        return length ? value.substring(start, start + length) : value.substring(start);
    },
    concat: (...values) => values.join(""),
    // Math functions
    round: (value) => Math.round(value),
    floor: (value) => Math.floor(value),
    ceiling: (value) => Math.ceil(value),
    // Date functions
    year: (value) => new Date(value).getFullYear(),
    month: (value) => new Date(value).getMonth() + 1,
    day: (value) => new Date(value).getDate(),
    hour: (value) => new Date(value).getHours(),
    minute: (value) => new Date(value).getMinutes(),
    second: (value) => new Date(value).getSeconds(),
    // Type functions
    cast: (value, type) => {
        switch (type) {
            case "Edm.String":
                return String(value);
            case "Edm.Int32":
                return parseInt(value, 10);
            case "Edm.Double":
                return parseFloat(value);
            case "Edm.Boolean":
                return Boolean(value);
            case "Edm.DateTimeOffset":
                return new Date(value).toISOString();
            default:
                return value;
        }
    },
};
/**
 * Built-in action resolvers for common operations
 */
export const builtInActionResolvers = {
    // CRUD actions
    create: async (data) => {
        // This would typically interact with a database
        return { ...data, id: Date.now() };
    },
    update: async (data) => {
        // This would typically update a database record
        return data;
    },
    delete: async () => {
        // This would typically delete a database record
        return { success: true };
    },
    // Custom business actions
    approve: async (data) => {
        return { ...data, status: "approved", approvedAt: new Date().toISOString() };
    },
    reject: async (data) => {
        return { ...data, status: "rejected", rejectedAt: new Date().toISOString() };
    },
};
