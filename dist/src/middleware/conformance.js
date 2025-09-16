import { validateConformanceLevel } from "../core/conformance-levels";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";
const DEFAULT_CONFORMANCE_OPTIONS = {
    conformanceLevel: "minimal",
    strictMode: false,
    validateQueries: true,
    customValidationRules: {},
};
/**
 * OData Conformance Middleware
 *
 * Responsibilities:
 * - Validate OData query options against conformance levels
 * - Enforce OData v4.01 specification compliance
 * - Handle conformance level negotiation
 * - Provide conformance level information in responses
 * - Support custom validation rules and strict mode
 * - Manage feature availability based on conformance level
 */
export function odataConformance(options = {}) {
    const opts = mergeMiddlewareOptions(DEFAULT_CONFORMANCE_OPTIONS, options);
    return {
        before: async (request) => {
            try {
                const context = getMiddlewareContext(request);
                if (!context) {
                    return;
                }
                const { event } = request;
                const queryParams = event.queryStringParameters || {};
                // Determine conformance level from request or use default
                const requestedLevel = queryParams.$conformance || opts.conformanceLevel;
                const conformanceLevel = validateConformanceLevel(requestedLevel);
                // Validate query options against conformance level
                if (opts.validateQueries) {
                    // For now, just validate the conformance level itself
                    // TODO: Add proper query validation against conformance level
                    validateConformanceLevel(conformanceLevel);
                }
                // Update context with conformance information
                context.metadata = {
                    ...context.metadata,
                    conformance: {
                        level: conformanceLevel,
                        requestedLevel,
                        strictMode: opts.strictMode,
                        validationPassed: true,
                    },
                };
                setMiddlewareContext(request, context);
            }
            catch (error) {
                // Let the error middleware handle this
                request.error = error;
                throw error;
            }
        },
        after: async (request) => {
            try {
                const context = getMiddlewareContext(request);
                if (!context || !request.response) {
                    return;
                }
                // Add conformance level information to response headers
                if (context.metadata?.conformance) {
                    const headers = request.response.headers || {};
                    // Add OData conformance header
                    headers["OData-Conformance"] = context.metadata.conformance.level;
                    // Add supported conformance levels
                    headers["OData-Supported-Conformance"] = "minimal,intermediate,advanced";
                    // Add feature availability based on conformance level
                    const features = getAvailableFeatures(context.metadata.conformance.level);
                    if (features.length > 0) {
                        headers["OData-Features"] = features.join(",");
                    }
                    request.response.headers = headers;
                }
            }
            catch (error) {
                // Log error but don't fail the request
                console.warn("Error in conformance middleware after hook:", error);
            }
        },
    };
}
/**
 * Get available features based on conformance level
 */
function getAvailableFeatures(conformanceLevel) {
    const features = [];
    switch (conformanceLevel) {
        case "advanced":
            features.push("search", "compute", "apply", "batch", "async", "streaming", "delta", "references", "crossjoin", "all", "any", "cast", "isof");
        // Fall through to intermediate features
        case "intermediate":
            features.push("filter", "orderby", "top", "skip", "count", "expand", "select", "format", "inlinecount", "search", "compute", "apply");
        // Fall through to minimal features
        case "minimal":
            features.push("read", "metadata", "service-document");
            break;
    }
    return features;
}
/**
 * Helper function to create custom validation rules
 */
export function createValidationRule(name, validator) {
    return {
        name,
        validator,
    };
}
/**
 * Common validation rules for different conformance levels
 */
export const commonValidationRules = {
    // Minimal conformance rules
    minimal: {
        noAdvancedQueries: (options) => ({
            valid: !options.search && !options.compute && !options.apply,
            error: "Search, compute, and apply queries are not supported in minimal conformance level",
        }),
        basicQueriesOnly: (options) => ({
            valid: !options.filter || !options.filter.includes("("),
            error: "Complex filter expressions are not supported in minimal conformance level",
        }),
    },
    // Intermediate conformance rules
    intermediate: {
        noAdvancedFunctions: (options) => ({
            valid: !options.filter || !options.filter.includes("cast(") && !options.filter.includes("isof("),
            error: "Cast and isof functions are not supported in intermediate conformance level",
        }),
        limitedSearch: (options) => ({
            valid: !options.search || !options.search.includes("~"),
            error: "Fuzzy search is not supported in intermediate conformance level",
        }),
    },
    // Advanced conformance rules
    advanced: {
        // Advanced level supports all features, so no restrictions
        allFeaturesSupported: () => ({ valid: true }),
    },
};
/**
 * Helper function to create conformance options with validation rules
 */
export function createConformanceOptions(level = "minimal", strictMode = false, customRules = {}) {
    const rules = { ...commonValidationRules[level], ...customRules };
    return {
        conformanceLevel: level,
        strictMode,
        validateQueries: true,
        customValidationRules: rules,
    };
}
/**
 * Helper function to negotiate conformance level from request
 */
export function negotiateConformanceLevel(requestedLevel, supportedLevels = ["minimal", "intermediate", "advanced"], defaultLevel = "minimal") {
    if (!requestedLevel) {
        return defaultLevel;
    }
    // Check if requested level is supported
    if (supportedLevels.includes(requestedLevel)) {
        return requestedLevel;
    }
    // Find the highest supported level that's lower than or equal to requested
    const levelHierarchy = ["minimal", "intermediate", "advanced"];
    const requestedIndex = levelHierarchy.indexOf(requestedLevel);
    if (requestedIndex === -1) {
        return defaultLevel;
    }
    // Find the highest supported level that's <= requested level
    for (let i = requestedIndex; i >= 0; i--) {
        if (supportedLevels.includes(levelHierarchy[i])) {
            return levelHierarchy[i];
        }
    }
    return defaultLevel;
}
/**
 * Helper function to check if a feature is supported at a conformance level
 */
export function isFeatureSupported(feature, conformanceLevel) {
    const features = getAvailableFeatures(conformanceLevel);
    return features.includes(feature);
}
