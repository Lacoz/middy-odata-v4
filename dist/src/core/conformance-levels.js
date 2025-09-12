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
