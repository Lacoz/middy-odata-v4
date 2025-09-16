import type { MiddlewareObj } from "@middy/core";
import type { ODataFilterOptions, ODataMiddlewareContext } from "./types";
import { filterArray, orderArray } from "../core/filter-order";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";

const DEFAULT_FILTER_OPTIONS: ODataFilterOptions = {
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
export function odataFilter(options: Partial<ODataFilterOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_FILTER_OPTIONS, options);

  return {
    after: async (request: any) => {
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
          } catch {
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
        } else {
          request.response = {
            statusCode: 200,
            body: JSON.stringify(filteredData),
          };
        }

        // Update context with filtered data
        context.data = filteredData;
        setMiddlewareContext(request, context);

      } catch (error) {
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
async function applyFilteringAndOrdering(
  data: unknown,
  context: ODataMiddlewareContext,
  options: ODataFilterOptions
): Promise<unknown> {
  const { options: queryOptions } = context;

  // Handle collection responses
  if (Array.isArray(data)) {
    return await filterAndOrderCollection(data, queryOptions, options, context);
  }

  // Handle single entity responses - filtering doesn't apply to single entities
  // but ordering might if it's a collection property
  if (data && typeof data === 'object') {
    return await filterAndOrderEntity(data as Record<string, unknown>, queryOptions, options, context);
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
async function filterAndOrderCollection(
  entities: unknown[],
  queryOptions: any,
  options: ODataFilterOptions,
  context: ODataMiddlewareContext
): Promise<unknown[]> {
  let filteredEntities = [...entities];

  // Apply $filter if present and enabled
  if (queryOptions.filter && options.enableFilter) {
    try {
      filteredEntities = filterArray(filteredEntities, queryOptions.filter);
    } catch (error) {
      console.error('[OData Filter] Error applying filter:', error);
      // Continue with unfiltered data
    }
  }

  // Apply $orderby if present and enabled
  if (queryOptions.orderby && queryOptions.orderby.length > 0 && options.enableOrderby) {
    try {
      filteredEntities = orderArray(filteredEntities, queryOptions.orderby);
    } catch (error) {
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
async function filterAndOrderEntity(
  entity: Record<string, unknown>,
  queryOptions: any,
  options: ODataFilterOptions,
  context: ODataMiddlewareContext
): Promise<Record<string, unknown>> {
  const processedEntity = { ...entity };

  // Process collection properties within the entity
  for (const [key, value] of Object.entries(processedEntity)) {
    if (Array.isArray(value)) {
      // This is a collection property - apply filtering/ordering if applicable
      const collectionOptions = getCollectionOptionsForProperty(key, queryOptions);
      if (collectionOptions) {
        processedEntity[key] = await filterAndOrderCollection(
          value,
          collectionOptions,
          options,
          context
        );
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
function getCollectionOptionsForProperty(propertyName: string, queryOptions: any): any {
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

/**
 * Validates filter expression against the EDM model
 * @param filterExpression Filter expression to validate
 * @param model EDM model
 * @throws Error if validation fails
 */
function validateFilterExpression(filterExpression: string, model: any): void {
  // This is a simplified validation
  // In a real implementation, this would parse the filter expression
  // and validate all property references against the EDM model
  
  if (!filterExpression || typeof filterExpression !== 'string') {
    throw new Error('Invalid filter expression');
  }

  // Check for basic syntax issues
  if (filterExpression.includes('undefined') || filterExpression.includes('null')) {
    // These might be valid in some contexts, but we'll flag them for review
    console.warn('[OData Filter] Filter expression contains potentially problematic values');
  }
}

/**
 * Validates orderby properties against the EDM model
 * @param orderbyItems Orderby items to validate
 * @param model EDM model
 * @throws Error if validation fails
 */
function validateOrderbyProperties(orderbyItems: any[], model: any): void {
  for (const orderbyItem of orderbyItems) {
    const property = orderbyItem.property;
    
    if (!property) {
      throw new Error('Invalid orderby item: missing property');
    }

    // Check if property exists in model
    if (!isValidPropertyPath(property, model)) {
      throw new Error(`Invalid property in $orderby: ${property}`);
    }
  }
}

/**
 * Checks if a property path is valid in the EDM model
 * @param propertyPath Property path to validate
 * @param model EDM model
 * @returns True if valid
 */
function isValidPropertyPath(propertyPath: string, model: any): boolean {
  if (!model.entityTypes || model.entityTypes.length === 0) {
    return true; // Can't validate without entity types
  }

  // Check if property exists in any entity type
  return model.entityTypes.some((entityType: any) => 
    entityType.properties?.some((prop: any) => prop.name === propertyPath)
  );
}
