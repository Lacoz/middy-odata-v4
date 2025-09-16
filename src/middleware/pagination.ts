import type { MiddlewareObj } from "@middy/core";
import type { ODataPaginationOptions, ODataMiddlewareContext } from "./types";
import { paginateArray } from "../core/filter-order";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";

declare const console: any;

const DEFAULT_PAGINATION_OPTIONS: ODataPaginationOptions = {
  maxTop: 1000,
  defaultTop: 50,
  enableCount: true,
};

/**
 * OData Pagination Middleware
 * 
 * Responsibilities:
 * - Apply $top and $skip pagination to response data
 * - Calculate and include $count when requested
 * - Generate @odata.nextLink for pagination
 * - Enforce maximum page size limits
 * - Handle pagination edge cases
 */
export function odataPagination(options: Partial<ODataPaginationOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_PAGINATION_OPTIONS, options);

  return {
    after: async (request: any) => {
      try {
        const context = getMiddlewareContext(request);
        if (!context || !context.options) {
          return; // No OData context, skip pagination
        }

        // Get response data
        let responseData = request.response?.body;
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
          } catch {
            // If parsing fails, skip pagination
            return;
          }
        }

        if (!responseData) {
          return; // No data to paginate
        }

        // Apply pagination
        const paginatedData = await applyPagination(responseData, context, opts, request);

        // Update response
        if (request.response) {
          request.response.body = JSON.stringify(paginatedData);
        } else {
          request.response = {
            statusCode: 200,
            body: JSON.stringify(paginatedData),
          };
        }

        // Update context with paginated data
        context.data = paginatedData;
        setMiddlewareContext(request, context);

      } catch (error) {
        // If pagination fails, log error but don't break the response
        console.error('[OData Pagination] Error applying pagination:', error);
        // Continue with original response
      }
    },
  };
}

/**
 * Applies pagination to response data
 * @param data Response data to paginate
 * @param context OData middleware context
 * @param options Pagination options
 * @param request Middy request object
 * @returns Paginated data with count and nextLink
 */
async function applyPagination(
  data: unknown,
  context: ODataMiddlewareContext,
  options: ODataPaginationOptions,
  request: any
): Promise<unknown> {
  const { options: queryOptions } = context;

  // Handle collection responses
  if (Array.isArray(data)) {
    return await paginateCollection(data, queryOptions, options, context, request);
  }

  // Handle single entity responses - pagination doesn't apply to single entities
  // but we might need to add count information
  if (data && typeof data === 'object') {
    return await addCountToEntity(data as Record<string, unknown>, queryOptions, options, context);
  }

  // Return primitive values as-is
  return data;
}

/**
 * Paginates a collection of entities
 * @param entities Array of entities
 * @param queryOptions OData query options
 * @param options Pagination options
 * @param context OData middleware context
 * @param request Middy request object
 * @returns Paginated collection with count and nextLink
 */
async function paginateCollection(
  entities: unknown[],
  queryOptions: any,
  options: ODataPaginationOptions,
  context: ODataMiddlewareContext,
  request: any
): Promise<unknown> {
  const totalCount = entities.length;
  let paginatedEntities = [...entities];

  // Apply $top and $skip
  const top = queryOptions.top;
  const skip = queryOptions.skip || 0;

  // Validate and enforce limits
  const validatedTop = validateTopLimit(top, options);
  const validatedSkip = Math.max(0, skip);

  // Apply pagination
  if (validatedTop !== undefined || validatedSkip > 0) {
    paginatedEntities = paginateArray(entities, { top: validatedTop, skip: validatedSkip });
  }

  // Create paginated response
  const result: any = {
    "@odata.context": generateContextUrl(context),
    value: paginatedEntities,
  };

  // Add count if requested
  if (queryOptions.count && options.enableCount) {
    result["@odata.count"] = totalCount;
  }

  // Add nextLink if there are more results
  const hasMoreResults = (validatedSkip + (validatedTop || totalCount)) < totalCount;
  if (hasMoreResults && validatedTop !== undefined) {
    result["@odata.nextLink"] = generateNextLink(context, request, validatedTop, validatedSkip);
  }

  return result;
}

/**
 * Adds count information to a single entity response
 * @param entity Entity to process
 * @param queryOptions OData query options
 * @param options Pagination options
 * @param context OData middleware context
 * @returns Entity with count information
 */
async function addCountToEntity(
  entity: Record<string, unknown>,
  queryOptions: any,
  options: ODataPaginationOptions,
  context: ODataMiddlewareContext
): Promise<Record<string, unknown>> {
  const result = { ...entity };

  // Add @odata.context if not present
  if (!result["@odata.context"]) {
    result["@odata.context"] = generateContextUrl(context);
  }

  // Add count if requested (for single entities, count is always 1)
  if (queryOptions.count && options.enableCount) {
    result["@odata.count"] = 1;
  }

  return result;
}

/**
 * Validates and enforces top limit
 * @param top Requested top value
 * @param options Pagination options
 * @returns Validated top value
 */
function validateTopLimit(top: number | undefined, options: ODataPaginationOptions): number | undefined {
  if (top === undefined) {
    return options.defaultTop;
  }

  if (top < 0) {
    return 0;
  }

  if (top > (options.maxTop || 1000)) {
    console.warn(`[OData Pagination] Top value ${top} exceeds maximum ${options.maxTop}, using maximum`);
    return options.maxTop;
  }

  return top;
}

/**
 * Generates @odata.context URL
 * @param context OData middleware context
 * @returns Context URL
 */
function generateContextUrl(context: ODataMiddlewareContext): string {
  const { serviceRoot, entitySet } = context;
  
  if (entitySet) {
    return `${serviceRoot}/$metadata#${entitySet}`;
  }
  
  return `${serviceRoot}/$metadata`;
}

/**
 * Generates @odata.nextLink URL
 * @param context OData middleware context
 * @param request Middy request object
 * @param top Current top value
 * @param skip Current skip value
 * @returns NextLink URL
 */
function generateNextLink(
  context: ODataMiddlewareContext,
  request: any,
  top: number,
  skip: number
): string {
  const { serviceRoot } = context;
  const event = request.event || {};
  
  // Get current path
  const path = event.path || event.rawPath || '/';
  
  // Get current query parameters
  const currentQuery = event.rawQueryString 
    ? Object.fromEntries(new URLSearchParams(event.rawQueryString))
    : (event.queryStringParameters || {});

  // Update pagination parameters
  const nextQuery = { ...currentQuery };
  nextQuery.$skip = String(skip + top);
  
  // Build query string
  const queryString = new URLSearchParams(nextQuery).toString();
  
  return `${serviceRoot}${path}?${queryString}`;
}

