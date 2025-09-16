import type { MiddlewareObj } from "@middy/core";
import type { ODataShapeOptions, ODataMiddlewareContext } from "./types";
import { applySelect, projectArray, expandData } from "../core/shape";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";

const DEFAULT_SHAPE_OPTIONS: ODataShapeOptions = {
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
export function odataShape(options: Partial<ODataShapeOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_SHAPE_OPTIONS, options);

  return {
    after: async (request: any) => {
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
          } catch {
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
        } else {
          request.response = {
            statusCode: 200,
            body: JSON.stringify(shapedData),
          };
        }

        // Update context with shaped data
        context.data = shapedData;
        setMiddlewareContext(request, context);

      } catch (error) {
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
async function applyDataShaping(
  data: unknown,
  context: ODataMiddlewareContext,
  options: ODataShapeOptions
): Promise<unknown> {
  const { options: queryOptions } = context;

  // Handle collection responses
  if (Array.isArray(data)) {
    return await shapeCollection(data, queryOptions, options, context);
  }

  // Handle single entity responses
  if (data && typeof data === 'object') {
    return await shapeEntity(data as Record<string, unknown>, queryOptions, options, context);
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
async function shapeCollection(
  entities: unknown[],
  queryOptions: any,
  options: ODataShapeOptions,
  context: ODataMiddlewareContext
): Promise<unknown[]> {
  const shapedEntities: unknown[] = [];

  for (const entity of entities) {
    if (entity && typeof entity === 'object') {
      const shapedEntity = await shapeEntity(
        entity as Record<string, unknown>,
        queryOptions,
        options,
        context
      );
      shapedEntities.push(shapedEntity);
    } else {
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
async function shapeEntity(
  entity: Record<string, unknown>,
  queryOptions: any,
  options: ODataShapeOptions,
  context: ODataMiddlewareContext
): Promise<Record<string, unknown>> {
  let shapedEntity = { ...entity };

  // Apply $select projection
  if (queryOptions.select && queryOptions.select.length > 0) {
    shapedEntity = applySelect(shapedEntity, queryOptions.select) as Record<string, unknown>;
  }

  // Apply $expand navigation properties
  if (queryOptions.expand && queryOptions.expand.length > 0 && options.enableExpand) {
    shapedEntity = await applyExpansion(
      shapedEntity,
      queryOptions.expand,
      options,
      context,
      0 // Start with depth 0
    ) as Record<string, unknown>;
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
async function applyExpansion(
  entity: Record<string, unknown>,
  expandItems: any[],
  options: ODataShapeOptions,
  context: ODataMiddlewareContext,
  depth: number
): Promise<Record<string, unknown>> {
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
            expandedEntity[navigationProperty] = await shapeCollection(
              navigationData,
              expandItem.options,
              options,
              nestedContext
            );
          } else if (navigationData && typeof navigationData === 'object') {
            expandedEntity[navigationProperty] = await shapeEntity(
              navigationData as Record<string, unknown>,
              expandItem.options,
              options,
              nestedContext
            );
          }
        }
      } catch (error) {
        console.error(`[OData Shape] Error resolving navigation property ${navigationProperty}:`, error);
        expandedEntity[navigationProperty] = null;
      }
    } else {
      // No custom resolver - check if property exists in entity
      if (navigationProperty in expandedEntity) {
        const navigationData = expandedEntity[navigationProperty];
        
        // Apply nested query options if present
        if (expandItem.options && navigationData) {
          if (Array.isArray(navigationData)) {
            expandedEntity[navigationProperty] = await shapeCollection(
              navigationData,
              expandItem.options,
              options,
              {
                ...context,
                options: expandItem.options,
              }
            );
          } else if (typeof navigationData === 'object') {
            expandedEntity[navigationProperty] = await shapeEntity(
              navigationData as Record<string, unknown>,
              expandItem.options,
              options,
              {
                ...context,
                options: expandItem.options,
              }
            );
          }
        }
      } else {
        // Property doesn't exist - set to null
        expandedEntity[navigationProperty] = null;
      }
    }
  }

  return expandedEntity;
}

/**
 * Validates expand paths against the EDM model
 * @param expandItems Expand items to validate
 * @param model EDM model
 * @throws Error if validation fails
 */
function validateExpandPaths(expandItems: any[], model: any): void {
  for (const expandItem of expandItems) {
    const navigationProperty = expandItem.path;
    
    if (!navigationProperty) {
      throw new Error('Invalid expand item: missing path');
    }

    // Check if navigation property exists in model
    if (!isValidNavigationProperty(navigationProperty, model)) {
      throw new Error(`Invalid navigation property in $expand: ${navigationProperty}`);
    }
  }
}

/**
 * Checks if a navigation property is valid in the EDM model
 * @param navigationPath Navigation property path to validate
 * @param model EDM model
 * @returns True if valid
 */
function isValidNavigationProperty(navigationPath: string, model: any): boolean {
  if (!model.entityTypes || model.entityTypes.length === 0) {
    return true; // Can't validate without entity types
  }

  // Check if navigation property exists in any entity type
  return model.entityTypes.some((entityType: any) => 
    entityType.navigation?.some((nav: any) => nav.name === navigationPath)
  );
}
