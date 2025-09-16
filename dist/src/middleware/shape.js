import { applySelect } from "../core/shape";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";
const DEFAULT_SHAPE_OPTIONS = {
    enableExpand: true,
    maxExpandDepth: 3,
    expandResolvers: {},
};
/**
 * OData Shape Middleware
 *
 * Responsibilities:
 * - Apply $select projection to response data
 * - Handle $expand navigation property resolution
 * - Transform response data according to OData query options
 * - Manage expand depth and prevent infinite loops
 */
export function odataShape(options = {}) {
    const opts = mergeMiddlewareOptions(DEFAULT_SHAPE_OPTIONS, options);
    return {
        after: async (request) => {
            try {
                const context = getMiddlewareContext(request);
                if (!context || !context.options) {
                    return; // No OData context, skip shaping
                }
                // Get response data
                let responseData = request.response?.body;
                if (typeof responseData === 'string') {
                    try {
                        responseData = JSON.parse(responseData);
                    }
                    catch {
                        // If parsing fails, skip shaping
                        return;
                    }
                }
                if (!responseData) {
                    return; // No data to shape
                }
                // Apply data shaping
                const shapedData = await applyDataShaping(responseData, context, opts);
                // Update response
                if (request.response) {
                    request.response.body = JSON.stringify(shapedData);
                }
                else {
                    request.response = {
                        statusCode: 200,
                        body: JSON.stringify(shapedData),
                    };
                }
                // Update context with shaped data
                context.data = shapedData;
                setMiddlewareContext(request, context);
            }
            catch (error) {
                // If shaping fails, log error but don't break the response
                console.error('[OData Shape] Error applying data shaping:', error);
                // Continue with original response
            }
        },
    };
}
/**
 * Applies data shaping based on OData query options
 * @param data Response data to shape
 * @param context OData middleware context
 * @param options Shape options
 * @returns Shaped data
 */
async function applyDataShaping(data, context, options) {
    const { options: queryOptions } = context;
    // Handle collection responses
    if (Array.isArray(data)) {
        return await shapeCollection(data, queryOptions, options, context);
    }
    // Handle single entity responses
    if (data && typeof data === 'object') {
        return await shapeEntity(data, queryOptions, options, context);
    }
    // Return primitive values as-is
    return data;
}
/**
 * Shapes a collection of entities
 * @param entities Array of entities
 * @param queryOptions OData query options
 * @param options Shape options
 * @param context OData middleware context
 * @returns Shaped collection
 */
async function shapeCollection(entities, queryOptions, options, context) {
    const shapedEntities = [];
    for (const entity of entities) {
        if (entity && typeof entity === 'object') {
            const shapedEntity = await shapeEntity(entity, queryOptions, options, context);
            shapedEntities.push(shapedEntity);
        }
        else {
            shapedEntities.push(entity);
        }
    }
    return shapedEntities;
}
/**
 * Shapes a single entity
 * @param entity Entity to shape
 * @param queryOptions OData query options
 * @param options Shape options
 * @param context OData middleware context
 * @returns Shaped entity
 */
async function shapeEntity(entity, queryOptions, options, context) {
    let shapedEntity = { ...entity };
    // Apply $select projection
    if (queryOptions.select && queryOptions.select.length > 0) {
        shapedEntity = applySelect(shapedEntity, queryOptions.select);
    }
    // Apply $expand navigation properties
    if (queryOptions.expand && queryOptions.expand.length > 0 && options.enableExpand) {
        shapedEntity = await applyExpansion(shapedEntity, queryOptions.expand, options, context, 0 // Start with depth 0
        );
    }
    return shapedEntity;
}
/**
 * Applies navigation property expansion
 * @param entity Entity to expand
 * @param expandItems Expand items from query options
 * @param options Shape options
 * @param context OData middleware context
 * @param depth Current expansion depth
 * @returns Entity with expanded navigation properties
 */
async function applyExpansion(entity, expandItems, options, context, depth) {
    // Check expansion depth limit
    if (depth >= (options.maxExpandDepth || 3)) {
        console.warn(`[OData Shape] Maximum expansion depth (${options.maxExpandDepth}) reached`);
        return entity;
    }
    const expandedEntity = { ...entity };
    for (const expandItem of expandItems) {
        const navigationProperty = expandItem.path;
        if (!navigationProperty) {
            continue;
        }
        // Check if we have a custom resolver for this navigation property
        const resolver = options.expandResolvers?.[navigationProperty];
        if (resolver) {
            try {
                // Use custom resolver to get navigation data
                const navigationData = await resolver(context);
                expandedEntity[navigationProperty] = navigationData;
                // Apply nested query options if present
                if (expandItem.options) {
                    const nestedContext = {
                        ...context,
                        options: expandItem.options,
                    };
                    if (Array.isArray(navigationData)) {
                        expandedEntity[navigationProperty] = await shapeCollection(navigationData, expandItem.options, options, nestedContext);
                    }
                    else if (navigationData && typeof navigationData === 'object') {
                        expandedEntity[navigationProperty] = await shapeEntity(navigationData, expandItem.options, options, nestedContext);
                    }
                }
            }
            catch (error) {
                console.error(`[OData Shape] Error resolving navigation property ${navigationProperty}:`, error);
                expandedEntity[navigationProperty] = null;
            }
        }
        else {
            // No custom resolver - check if property exists in entity
            if (navigationProperty in expandedEntity) {
                const navigationData = expandedEntity[navigationProperty];
                // Apply nested query options if present
                if (expandItem.options && navigationData) {
                    if (Array.isArray(navigationData)) {
                        expandedEntity[navigationProperty] = await shapeCollection(navigationData, expandItem.options, options, {
                            ...context,
                            options: expandItem.options,
                        });
                    }
                    else if (typeof navigationData === 'object') {
                        expandedEntity[navigationProperty] = await shapeEntity(navigationData, expandItem.options, options, {
                            ...context,
                            options: expandItem.options,
                        });
                    }
                }
            }
            else {
                // Property doesn't exist - set to null
                expandedEntity[navigationProperty] = null;
            }
        }
    }
    return expandedEntity;
}
