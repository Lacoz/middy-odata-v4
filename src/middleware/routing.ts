import type { MiddlewareObj } from "@middy/core";
import type { EdmModel } from "../core/types";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";
import type { ODataDataProvider, ODataMiddlewareContext } from "./types";

export interface ODataRoutingOptions {
  model: EdmModel;
  dataProviders?: Record<string, ODataDataProvider>;
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
    after: async (request: any) => {
      try {
        const context = getMiddlewareContext(request);

        if (!context) {
          return;
        }

        context.dataProviders = opts.dataProviders;
        context.runtime = context.runtime || { dataCache: new Map() };
        context.metadata = context.metadata || {};
        ensureMiddlewareStack(context, "routing");
        applyDeadlineMetadata(context, request);

        const { event } = request;
        const path = event.path || event.rawPath || "";
        
        console.log('[OData Routing] Processing path:', path);
        
        // Skip if this is already handled by other middleware (metadata, functions, etc.)
        if (path.endsWith('/$metadata') || path.endsWith('/%24metadata') || 
            path === '/' || path.startsWith('/functions/') || path.startsWith('/actions/')) {
          console.log('[OData Routing] Skipping path (handled by other middleware):', path);
          return;
        }

        // Extract entity set name from path
        const entitySetName = extractEntitySetName(path, opts.model as EdmModel);
        console.log('[OData Routing] Extracted entity set name:', entitySetName);
        
        if (entitySetName) {
          // Set entity set in context
          context.entitySet = entitySetName;
          context.entityType = resolveEntityTypeForSet(entitySetName, opts.model as EdmModel);
          
          // Get data from data provider
          const data = await getEntitySetData(entitySetName, opts as ODataRoutingOptions, context);
          console.log('[OData Routing] Got data for', entitySetName, ':', data?.length, 'items');
          
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
            
            console.log('[OData Routing] Set response for', entitySetName);
            console.log('[OData Routing] Response set:', JSON.stringify(request.response, null, 2));
            // Update context with data
            context.data = { value: data };
            setMiddlewareContext(request, context);
            
            // Return early to prevent base handler from being called
            return request.response;
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

        setMiddlewareContext(request, context);
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
async function getEntitySetData(
  entitySetName: string,
  options: ODataRoutingOptions,
  context: ODataMiddlewareContext
): Promise<unknown[] | undefined> {
  const { dataProviders } = options;

  if (dataProviders && dataProviders[entitySetName]) {
    const dataProvider = dataProviders[entitySetName];
    const data = await executeDataProvider(dataProvider, context);
    return normalizeProviderResult(data);
  }

  return undefined;
}

async function executeDataProvider(
  provider: ODataDataProvider,
  context: ODataMiddlewareContext
): Promise<unknown> {
  if (provider.length > 0) {
    const contextualProvider = provider as (ctx: ODataMiddlewareContext) => Promise<unknown> | unknown;
    return contextualProvider(context);
  }

  const noArgProvider = provider as () => Promise<unknown> | unknown;
  return noArgProvider();
}

function normalizeProviderResult(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

function resolveEntityTypeForSet(entitySetName: string, model: EdmModel): string | undefined {
  const entitySet = model.entitySets?.find(set => set.name === entitySetName);
  return entitySet?.entityType;
}

function ensureMiddlewareStack(context: any, name: string): void {
  const stack: string[] = Array.isArray(context.metadata?.middlewareStack)
    ? context.metadata.middlewareStack
    : [];
  if (!stack.includes(name)) {
    stack.push(name);
  }
  context.metadata.middlewareStack = stack;
}

function applyDeadlineMetadata(context: any, request: any): void {
  if (context.metadata?.deadline) {
    return;
  }

  const remaining = request?.context?.getRemainingTimeInMillis?.();
  if (typeof remaining === 'number' && Number.isFinite(remaining)) {
    context.metadata.deadline = Date.now() + Math.max(0, remaining);
  }
}
