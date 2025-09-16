import type { MiddlewareObj } from "@middy/core";
import type { ODataSerializeOptions, ODataMiddlewareContext } from "./types";
import { serializeCollection } from "../core/serialize";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";

const DEFAULT_SERIALIZE_OPTIONS: ODataSerializeOptions = {
  format: "json",
  includeMetadata: true,
  prettyPrint: false,
};

/**
 * OData Serialize Middleware
 * 
 * Responsibilities:
 * - Format response data according to OData standards
 * - Add @odata.context and other metadata annotations
 * - Handle different response formats (JSON, XML, ATOM)
 * - Ensure proper OData response structure
 * - Add ETags and other HTTP headers
 */
export function odataSerialize(options: Partial<ODataSerializeOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_SERIALIZE_OPTIONS, options);

  return {
    after: async (request: any) => {
      try {
        const context = getMiddlewareContext(request);
        if (!context) {
          return; // No OData context, skip serialization
        }

        // Get response data
        let responseData = request.response?.body;
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
          } catch {
            // If parsing fails, skip serialization
            return;
          }
        }

        if (!responseData) {
          return; // No data to serialize
        }

        // Apply OData serialization
        const serializedData = await applySerialization(responseData, context, opts, request);

        // Update response
        if (request.response) {
          request.response.body = JSON.stringify(serializedData);
          
          // Add OData-specific headers
          addODataHeaders(request.response, context, opts);
        } else {
          request.response = {
            statusCode: 200,
            body: JSON.stringify(serializedData),
            headers: {},
          };
          
          // Add OData-specific headers
          addODataHeaders(request.response, context, opts);
        }

        // Update context with serialized data
        context.data = serializedData;
        setMiddlewareContext(request, context);

      } catch (error) {
        // If serialization fails, log error but don't break the response
        console.error('[OData Serialize] Error applying serialization:', error);
        // Continue with original response
      }
    },
  };
}

/**
 * Applies OData serialization to response data
 * @param data Response data to serialize
 * @param context OData middleware context
 * @param options Serialize options
 * @param request Middy request object
 * @returns Serialized data
 */
async function applySerialization(
  data: unknown,
  context: ODataMiddlewareContext,
  options: ODataSerializeOptions,
  request: any
): Promise<unknown> {
  const { options: queryOptions } = context;

  // Handle collection responses
  if (Array.isArray(data)) {
    return await serializeCollectionResponse(data, queryOptions, options, context, request);
  }

  // Handle single entity responses
  if (data && typeof data === 'object') {
    return await serializeEntityResponse(data as Record<string, unknown>, queryOptions, options, context, request);
  }

  // Handle primitive responses
  return await serializePrimitiveResponse(data, options, context, request);
}

/**
 * Serializes a collection response
 * @param entities Array of entities
 * @param queryOptions OData query options
 * @param options Serialize options
 * @param context OData middleware context
 * @param request Middy request object
 * @returns Serialized collection response
 */
async function serializeCollectionResponse(
  entities: unknown[],
  queryOptions: any,
  options: ODataSerializeOptions,
  context: ODataMiddlewareContext,
  request: any
): Promise<unknown> {
  const contextUrl = generateContextUrl(context);
  const count = queryOptions.count ? entities.length : undefined;
  const nextLink = generateNextLink(context, request, queryOptions);

  // Use the existing serializeCollection function if available
  if (typeof serializeCollection === 'function') {
    return serializeCollection(contextUrl, entities, count, nextLink);
  }

  // Fallback implementation
  const result: any = {
    "@odata.context": contextUrl,
    value: entities,
  };

  if (count !== undefined) {
    result["@odata.count"] = count;
  }

  if (nextLink) {
    result["@odata.nextLink"] = nextLink;
  }

  return result;
}

/**
 * Serializes a single entity response
 * @param entity Entity to serialize
 * @param queryOptions OData query options
 * @param options Serialize options
 * @param context OData middleware context
 * @param request Middy request object
 * @returns Serialized entity response
 */
async function serializeEntityResponse(
  entity: Record<string, unknown>,
  queryOptions: any,
  options: ODataSerializeOptions,
  context: ODataMiddlewareContext,
  request: any
): Promise<Record<string, unknown>> {
  const result = { ...entity };

  // Add @odata.context if not present
  if (!result["@odata.context"]) {
    result["@odata.context"] = generateContextUrl(context);
  }

  // Add @odata.etag if entity has a version property
  if (entity.version && !result["@odata.etag"]) {
    result["@odata.etag"] = `"${entity.version}"`;
  }

  // Add @odata.id if entity has an id property
  if (entity.id && !result["@odata.id"]) {
    result["@odata.id"] = generateEntityId(context, entity.id);
  }

  return result;
}

/**
 * Serializes a primitive response
 * @param data Primitive data to serialize
 * @param options Serialize options
 * @param context OData middleware context
 * @param request Middy request object
 * @returns Serialized primitive response
 */
async function serializePrimitiveResponse(
  data: unknown,
  options: ODataSerializeOptions,
  context: ODataMiddlewareContext,
  request: any
): Promise<unknown> {
  // For primitive responses, wrap in OData format
  const result: any = {
    "@odata.context": generateContextUrl(context),
    value: data,
  };

  return result;
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
 * Generates @odata.id URL for an entity
 * @param context OData middleware context
 * @param entityId Entity ID
 * @returns Entity ID URL
 */
function generateEntityId(context: ODataMiddlewareContext, entityId: string | number): string {
  const { serviceRoot, entitySet } = context;
  
  if (entitySet) {
    return `${serviceRoot}/${entitySet}(${entityId})`;
  }
  
  return `${serviceRoot}(${entityId})`;
}

/**
 * Generates @odata.nextLink URL
 * @param context OData middleware context
 * @param request Middy request object
 * @param queryOptions OData query options
 * @returns NextLink URL
 */
function generateNextLink(
  context: ODataMiddlewareContext,
  request: any,
  queryOptions: any
): string | undefined {
  // This is a simplified implementation
  // In a real scenario, this would check if there are more results
  // and generate the appropriate nextLink URL
  
  const { serviceRoot } = context;
  const event = request.event || {};
  
  // Get current path
  const path = event.path || event.rawPath || '/';
  
  // Get current query parameters
  const currentQuery = event.rawQueryString 
    ? Object.fromEntries(new URLSearchParams(event.rawQueryString))
    : (event.queryStringParameters || {});

  // Update pagination parameters for next page
  const nextQuery = { ...currentQuery };
  const currentSkip = parseInt(nextQuery.$skip || '0', 10);
  const currentTop = parseInt(nextQuery.$top || '50', 10);
  
  nextQuery.$skip = String(currentSkip + currentTop);
  
  // Build query string
  const queryString = new URLSearchParams(nextQuery).toString();
  
  return `${serviceRoot}${path}?${queryString}`;
}

/**
 * Adds OData-specific HTTP headers
 * @param response HTTP response object
 * @param context OData middleware context
 * @param options Serialize options
 */
function addODataHeaders(response: any, context: ODataMiddlewareContext, options: ODataSerializeOptions): void {
  if (!response.headers) {
    response.headers = {};
  }

  // Set content type based on format
  switch (options.format) {
    case 'json':
      response.headers['Content-Type'] = 'application/json';
      break;
    case 'xml':
      response.headers['Content-Type'] = 'application/xml';
      break;
    case 'atom':
      response.headers['Content-Type'] = 'application/atom+xml';
      break;
    default:
      response.headers['Content-Type'] = 'application/json';
  }

  // Add OData version header
  response.headers['OData-Version'] = '4.01';

  // Add ETag if available
  if (context.data && typeof context.data === 'object') {
    const data = context.data as Record<string, unknown>;
    if (data['@odata.etag']) {
      response.headers['ETag'] = data['@odata.etag'] as string;
    }
  }

  // Add CORS headers if needed
  if (!response.headers['Access-Control-Allow-Origin']) {
    response.headers['Access-Control-Allow-Origin'] = '*';
  }

  if (!response.headers['Access-Control-Allow-Methods']) {
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  }

  if (!response.headers['Access-Control-Allow-Headers']) {
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, OData-MaxVersion, OData-Version';
  }
}

/**
 * Validates serialization options
 * @param options Serialize options
 * @throws Error if validation fails
 */
function validateSerializeOptions(options: ODataSerializeOptions): void {
  if (options.format && !['json', 'xml', 'atom'].includes(options.format)) {
    throw new Error(`Unsupported format: ${options.format}. Supported formats are: json, xml, atom`);
  }
}

/**
 * Formats response data based on the specified format
 * @param data Data to format
 * @param format Output format
 * @param prettyPrint Whether to pretty print
 * @returns Formatted data
 */
function formatResponseData(data: unknown, format: string, prettyPrint: boolean): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, prettyPrint ? 2 : 0);
    case 'xml':
      // XML formatting would be implemented here
      return JSON.stringify(data); // Fallback to JSON for now
    case 'atom':
      // ATOM formatting would be implemented here
      return JSON.stringify(data); // Fallback to JSON for now
    default:
      return JSON.stringify(data, null, prettyPrint ? 2 : 0);
  }
}
