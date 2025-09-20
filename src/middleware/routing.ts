import type { MiddlewareObj } from "@middy/core";
import type { EdmModel } from "../core/types";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";
import { createODataLogger, deriveLogger } from "./logger";
import type { ODataLogger } from "./logger";

export interface ODataRoutingOptions {
  model: EdmModel;
  dataProviders?: Record<string, () => Promise<unknown[]> | unknown[]>;
  enableRouting?: boolean;
  strictMode?: boolean;
  logger?: ODataLogger;
  [key: string]: unknown;
}

const DEFAULT_ROUTING_OPTIONS: ODataRoutingOptions = {
  model: {} as EdmModel,
  dataProviders: {},
  enableRouting: true,
  strictMode: false,
  logger: undefined,
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
        const logger = opts.logger
          ?? (context?.logger ? deriveLogger(context.logger, "[OData routing]") : undefined)
          ?? createODataLogger({ prefix: "[OData routing]" });

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
        logger.debug("Processing path", path);

        // Skip if this is already handled by other middleware (metadata, functions, etc.)
        if (path.endsWith('/$metadata') || path.endsWith('/%24metadata') ||
            path === '/' || path.startsWith('/functions/') || path.startsWith('/actions/')) {
          logger.debug("Skipping path handled by another middleware", path);
          return;
        }

        // Extract entity set name from path
        const entitySetName = extractEntitySetName(path, opts.model as EdmModel);
        logger.debug("Resolved entity set", entitySetName);

        if (entitySetName) {
          // Set entity set in context
          context.entitySet = entitySetName;
          context.entityType = resolveEntityTypeForSet(entitySetName, opts.model as EdmModel);

          // Get data from data provider
          const data = await getEntitySetData(entitySetName, opts as ODataRoutingOptions);
          logger.info("Loaded entity set", entitySetName, "items", Array.isArray(data) ? data.length : 0);

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
            logger.warn("No data provider configured for entity set", entitySetName);
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
          logger.warn("Unknown entity set for path", path);
        }

        setMiddlewareContext(request, context);
      } catch (error) {
        const logger = opts.logger ?? createODataLogger({ prefix: "[OData routing]" });
        logger.error("Error in routing middleware", error);
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
