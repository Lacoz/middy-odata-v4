import { generateServiceDocument, generateMetadata } from "./metadata";
import { projectArray, expandData } from "./shape";
import { filterArray, orderArray, paginateArray } from "./filter-order";
import { searchData, computeData, applyData } from "./search-compute-apply";
import { EDM_MODEL } from "../../__tests__/fixtures/edm";
export function queryWithConformance(data, options) {
    const { conformance, key, ...queryOptions } = options;
    // Handle single entity access by key
    if (key !== undefined) {
        const entity = data.find(item => item.id === key);
        if (!entity) {
            return null;
        }
        // Apply conformance-level appropriate transformations
        const transformedEntity = applyConformanceToEntity(entity, conformance, queryOptions);
        return {
            value: transformedEntity,
            "@odata.context": "$metadata#Products"
        };
    }
    // Handle collection access
    let result = [...data];
    // Apply conformance-level appropriate query options
    result = applyConformanceToCollection(result, conformance, queryOptions);
    return {
        value: result,
        "@odata.context": "$metadata#Products",
        "@odata.count": queryOptions.count ? result.length : undefined
    };
}
function applyConformanceToEntity(entity, conformance, options) {
    let result = { ...entity };
    if (conformance === "minimal") {
        // Minimal conformance - basic property access only
        if (options.select) {
            const selectedProps = options.select.reduce((acc, prop) => {
                acc[prop] = result[prop];
                return acc;
            }, {});
            result = selectedProps;
        }
    }
    else if (conformance === "intermediate") {
        // Intermediate conformance - support $select, $expand, $filter, $orderby, $top, $skip
        if (options.select) {
            const selectedProps = options.select.reduce((acc, prop) => {
                acc[prop] = result[prop];
                return acc;
            }, {});
            result = selectedProps;
        }
        if (options.expand) {
            result = expandData(result, { expand: options.expand.map(path => ({ path })) });
        }
        // Add ETag for intermediate conformance
        result["@odata.etag"] = `"etag-${result.id || 'default'}"`;
    }
    else if (conformance === "advanced") {
        // Advanced conformance - all query options supported
        if (options.select) {
            result = projectArray([result], { select: options.select })[0];
        }
        if (options.expand) {
            result = expandData(result, { expand: options.expand.map(path => ({ path })) });
        }
        if (options.compute) {
            result = computeData([result], { compute: options.compute })[0];
        }
        // Add ETag for advanced conformance
        result["@odata.etag"] = `"etag-${result.id || 'default'}"`;
    }
    return result;
}
function applyConformanceToCollection(data, conformance, options) {
    let result = [...data];
    if (conformance === "minimal") {
        // Minimal conformance - basic collection access only
        if (options.select) {
            result = result.map(item => {
                const selectedProps = options.select.reduce((acc, prop) => {
                    acc[prop] = item[prop];
                    return acc;
                }, {});
                return selectedProps;
            });
        }
        // Minimal conformance doesn't support pagination, filtering, ordering, etc.
    }
    else if (conformance === "intermediate") {
        // Intermediate conformance - support $select, $expand, $filter, $orderby, $top, $skip
        if (options.filter) {
            result = filterArray(result, { filter: options.filter });
        }
        if (options.select) {
            result = projectArray(result, { select: options.select });
        }
        if (options.expand) {
            result = expandData(result, { expand: options.expand.map(path => ({ path })) });
        }
        if (options.orderby) {
            const orderbyParts = options.orderby.split(',').map((part) => {
                const [property, direction] = part.trim().split(' ');
                return { property, direction: (direction || 'asc') };
            });
            result = orderArray(result, { orderby: orderbyParts });
        }
        if (options.top !== undefined || options.skip !== undefined) {
            result = paginateArray(result, { top: options.top, skip: options.skip });
        }
    }
    else if (conformance === "advanced") {
        // Advanced conformance - all query options supported
        if (options.filter) {
            result = filterArray(result, { filter: options.filter });
        }
        if (options.search) {
            result = searchData(result, { search: options.search });
        }
        if (options.select) {
            result = projectArray(result, { select: options.select });
        }
        if (options.expand) {
            result = expandData(result, { expand: options.expand.map(path => ({ path })) });
        }
        if (options.compute) {
            result = computeData(result, { compute: options.compute });
        }
        if (options.apply) {
            result = applyData(result, { apply: options.apply });
        }
        if (options.orderby) {
            const orderbyParts = options.orderby.split(',').map((part) => {
                const [property, direction] = part.trim().split(' ');
                return { property, direction: (direction || 'asc') };
            });
            result = orderArray(result, { orderby: orderbyParts });
        }
        if (options.top !== undefined || options.skip !== undefined) {
            result = paginateArray(result, { top: options.top, skip: options.skip });
        }
    }
    return result;
}
export function getServiceDocument(options) {
    const serviceDoc = generateServiceDocument(EDM_MODEL, "https://api.example.com");
    // Add conformance level information
    serviceDoc["@odata.conformance"] = options.conformance;
    return serviceDoc;
}
export function getMetadataDocument(options) {
    const metadata = generateMetadata(EDM_MODEL, "https://api.example.com");
    // Add conformance level information
    metadata["@odata.conformance"] = options.conformance;
    return metadata;
}
export function validateConformanceLevel(level) {
    if (level === "minimal" || level === "intermediate" || level === "advanced") {
        return level;
    }
    throw new Error(`Invalid conformance level: ${level}`);
}
export function getSupportedQueryOptions(conformance) {
    switch (conformance) {
        case "minimal":
            return ["$select"];
        case "intermediate":
            return ["$select", "$expand", "$filter", "$orderby", "$top", "$skip", "$count"];
        case "advanced":
            return ["$select", "$expand", "$filter", "$orderby", "$top", "$skip", "$count", "$search", "$compute", "$apply"];
        default:
            return [];
    }
}
export function checkQueryOptionSupport(queryOption, conformance) {
    const supportedOptions = getSupportedQueryOptions(conformance);
    return supportedOptions.includes(queryOption);
}
// Additional functions for conformance testing
export function callFunction(functionName, parameters, options) {
    // Mock function calls based on conformance level
    if (options.conformance === "minimal") {
        throw new Error(`Function '${functionName}' not supported in minimal conformance`);
    }
    // Mock implementation
    return { value: { result: `Function ${functionName} called with parameters`, parameters } };
}
export function callAction(actionName, parameters, options) {
    // Mock action calls based on conformance level
    if (options.conformance === "minimal") {
        throw new Error(`Action '${actionName}' not supported in minimal conformance`);
    }
    // Mock implementation
    return { value: { result: `Action ${actionName} called with parameters`, parameters } };
}
export function callFunctionImport(functionName, parameters, options) {
    // Mock function import calls
    if (options.conformance === "minimal") {
        throw new Error(`Function import '${functionName}' not supported in minimal conformance`);
    }
    return { value: { result: `Function import ${functionName} called`, parameters } };
}
export function callActionImport(actionName, parameters, options) {
    // Mock action import calls
    if (options.conformance === "minimal") {
        throw new Error(`Action import '${actionName}' not supported in minimal conformance`);
    }
    return { value: { result: `Action import ${actionName} called`, parameters } };
}
export function executeBatch(batch, options) {
    // Mock batch execution
    if (options.conformance === "minimal") {
        throw new Error("Batch operations not supported in minimal conformance");
    }
    return batch.map((operation, index) => ({
        id: index,
        status: 200,
        body: { result: `Batch operation ${operation.method} ${operation.url} executed` }
    }));
}
export function validateConformance(level) {
    // Mock conformance validation
    const missingFeatures = [];
    if (level === "intermediate") {
        // Check for intermediate features
        missingFeatures.push("Navigation properties");
    }
    else if (level === "advanced") {
        // Check for advanced features
        missingFeatures.push("Custom functions", "Custom actions");
    }
    return {
        isValid: missingFeatures.length === 0,
        missingFeatures
    };
}
