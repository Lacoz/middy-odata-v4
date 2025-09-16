import { filterArray, orderArray } from "../core/filter-order";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";
const DEFAULT_FILTER_OPTIONS = {
    enableFilter: true,
    enableOrderby: true,
    maxFilterDepth: 10,
    caseSensitive: true,
};
/**
 * OData Filter Middleware
 *
 * Responsibilities:
 * - Apply $filter expressions to response data
 * - Apply $orderby sorting to response data
 * - Handle filter expression parsing and evaluation
 * - Manage filter depth and prevent infinite recursion
 */
export function odataFilter(options = {}) {
    const opts = mergeMiddlewareOptions(DEFAULT_FILTER_OPTIONS, options);
    return {
        after: async (request) => {
            try {
                const context = getMiddlewareContext(request);
                if (!context || !context.options) {
                    return; // No OData context, skip filtering
                }
                // Get response data
                let responseData = request.response?.body;
                if (typeof responseData === 'string') {
                    try {
                        responseData = JSON.parse(responseData);
                    }
                    catch {
                        // If parsing fails, skip filtering
                        return;
                    }
                }
                if (!responseData) {
                    return; // No data to filter
                }
                // Apply filtering and ordering
                const filteredData = await applyFilteringAndOrdering(responseData, context, opts);
                // Update response
                if (request.response) {
                    request.response.body = JSON.stringify(filteredData);
                }
                else {
                    request.response = {
                        statusCode: 200,
                        body: JSON.stringify(filteredData),
                    };
                }
                // Update context with filtered data
                context.data = filteredData;
                setMiddlewareContext(request, context);
            }
            catch (error) {
                // If filtering fails, log error but don't break the response
                console.error('[OData Filter] Error applying filtering/ordering:', error);
                // Continue with original response
            }
        },
    };
}
/**
 * Applies filtering and ordering to response data
 * @param data Response data to filter/order
 * @param context OData middleware context
 * @param options Filter options
 * @returns Filtered and ordered data
 */
async function applyFilteringAndOrdering(data, context, options) {
    const { options: queryOptions } = context;
    // Handle collection responses
    if (Array.isArray(data)) {
        return await filterAndOrderCollection(data, queryOptions, options);
    }
    // Handle single entity responses - filtering doesn't apply to single entities
    // but ordering might if it's a collection property
    if (data && typeof data === 'object') {
        return await filterAndOrderEntity(data, queryOptions, options, context);
    }
    // Return primitive values as-is
    return data;
}
/**
 * Filters and orders a collection of entities
 * @param entities Array of entities
 * @param queryOptions OData query options
 * @param options Filter options
 * @param context OData middleware context
 * @returns Filtered and ordered collection
 */
async function filterAndOrderCollection(entities, queryOptions, options) {
    let filteredEntities = [...entities];
    // Apply $filter if present and enabled
    if (queryOptions.filter && options.enableFilter) {
        try {
            filteredEntities = filterArray(filteredEntities, queryOptions.filter);
        }
        catch (error) {
            console.error('[OData Filter] Error applying filter:', error);
            // Continue with unfiltered data
        }
    }
    // Apply $orderby if present and enabled
    if (queryOptions.orderby && queryOptions.orderby.length > 0 && options.enableOrderby) {
        try {
            filteredEntities = orderArray(filteredEntities, queryOptions.orderby);
        }
        catch (error) {
            console.error('[OData Filter] Error applying orderby:', error);
            // Continue with unordered data
        }
    }
    return filteredEntities;
}
/**
 * Filters and orders a single entity (for collection properties)
 * @param entity Entity to process
 * @param queryOptions OData query options
 * @param options Filter options
 * @param context OData middleware context
 * @returns Processed entity
 */
async function filterAndOrderEntity(entity, queryOptions, options, context) {
    const processedEntity = { ...entity };
    // Process collection properties within the entity
    for (const [key, value] of Object.entries(processedEntity)) {
        if (Array.isArray(value)) {
            // This is a collection property - apply filtering/ordering if applicable
            const collectionOptions = getCollectionOptionsForProperty(key, queryOptions);
            if (collectionOptions) {
                processedEntity[key] = await filterAndOrderCollection(value, collectionOptions, options);
            }
        }
    }
    return processedEntity;
}
/**
 * Gets query options for a specific collection property
 * @param propertyName Name of the collection property
 * @param queryOptions OData query options
 * @returns Query options for the collection property
 */
function getCollectionOptionsForProperty(propertyName, queryOptions) {
    // This is a simplified implementation
    // In a real scenario, this would look at $expand options to find nested query options
    // for the specific navigation property
    if (queryOptions.expand) {
        for (const expandItem of queryOptions.expand) {
            if (expandItem.path === propertyName && expandItem.options) {
                return expandItem.options;
            }
        }
    }
    return null;
}
