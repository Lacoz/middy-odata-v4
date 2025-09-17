import type { MiddlewareObj } from "@middy/core";
import type { EdmModel } from "../core/types";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";

export interface ODataRoutingOptions {
  model: EdmModel;
  dataProviders?: Record<string, () => Promise<unknown[]> | unknown[]>;
  enableRouting?: boolean;
  strictMode?: boolean;
  [key: string]: unknown;
}

const DEFAULT_ROUTING_OPTIONS: ODataRoutingOptions = {
  model: {} as EdmModel,
  dataProviders: {},
  enableRouting: true,
  strictMode: false,
};

/**
 * OData Routing Middleware
 * 
 * Responsibilities:
 * - Automatically route entity set requests based on EDM model
 * - Set entity set context for other middleware
 * - Provide data from configured data providers
 * - Handle entity set discovery and validation
 */
export function odataRouting(options: Partial<ODataRoutingOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_ROUTING_OPTIONS, options);

  return {
    before: async (request: any) => {
      try {
        const context = getMiddlewareContext(request);
        
        if (!context) {
          return;
        }

        const { event } = request;
        const path = event.path || event.rawPath || "";
        
        // Skip if this is already handled by other middleware (metadata, functions, etc.)
        if (path.endsWith('/$metadata') || path.endsWith('/%24metadata') || 
            path === '/' || path.startsWith('/functions/') || path.startsWith('/actions/')) {
          return;
        }

        // Extract entity set name from path
        const entitySetName = extractEntitySetName(path, opts.model as EdmModel);
        
        if (entitySetName) {
          // Set entity set in context
          context.entitySet = entitySetName;
          
          // Get data from data provider
          const data = await getEntitySetData(entitySetName, opts as ODataRoutingOptions);
          
          if (data !== undefined) {
            // Set the response with entity set data
            request.response = {
              statusCode: 200,
              headers: {
                "Content-Type": "application/json",
                "OData-Version": "4.01"
              },
              body: JSON.stringify({ value: data })
            };
            
            // Update context with data
            context.data = { value: data };
            setMiddlewareContext(request, context);
          } else if (opts.strictMode) {
            // In strict mode, return 404 if no data provider is configured
            request.response = {
              statusCode: 404,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                error: { 
                  code: "NotFound", 
                  message: `Entity set '${entitySetName}' not found or no data provider configured` 
                } 
              })
            };
          }
        } else if (opts.strictMode) {
          // In strict mode, return 404 for unknown paths
          request.response = {
            statusCode: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              error: { 
                code: "NotFound", 
                message: "Entity set not found" 
              } 
            })
          };
        }

      } catch (error) {
        console.error('[OData Routing] Error in routing middleware:', error);
        // Continue to next middleware
      }
    },
  };
}

/**
 * Extract entity set name from the request path
 */
function extractEntitySetName(path: string, model: EdmModel): string | null {
  // Remove leading slash and any trailing slashes
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  
  // Check if this matches an entity set name
  if (model.entitySets) {
    for (const entitySet of model.entitySets) {
      if (entitySet.name === cleanPath) {
        return entitySet.name;
      }
    }
  }
  
  return null;
}

/**
 * Get data for an entity set from configured data providers
 */
async function getEntitySetData(entitySetName: string, options: ODataRoutingOptions): Promise<unknown[] | undefined> {
  const { dataProviders } = options;
  
  if (dataProviders && dataProviders[entitySetName]) {
    const dataProvider = dataProviders[entitySetName];
    const data = await dataProvider();
    return Array.isArray(data) ? data : [data];
  }
  
  return undefined;
}
