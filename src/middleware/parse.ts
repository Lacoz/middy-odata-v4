import type { MiddlewareObj } from "@middy/core";
import type { ODataParseOptions, ODataMiddlewareContext } from "./types";
import type { EdmModel } from "../core/types";
import { parseODataQuery } from "../core/parse";
import { mergeMiddlewareOptions, setMiddlewareContext } from "./compose";

const DEFAULT_PARSE_OPTIONS: ODataParseOptions = {
  model: {} as any, // Will be provided by user
  serviceRoot: "",
  validateAgainstModel: true,
  strictMode: false,
};

/**
 * OData Parse Middleware
 * 
 * Responsibilities:
 * - Parse query parameters from API Gateway events
 * - Validate query options against EDM model
 * - Set up initial OData context
 * - Handle service root resolution
 */
export function odataParse(options: Partial<ODataParseOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_PARSE_OPTIONS, options);

  return {
    before: async (request: any) => {
      try {
        const event = request.event ?? {};
        
        // Extract query parameters from different API Gateway event formats
        const query: Record<string, string> = event.rawQueryString
          ? Object.fromEntries(new URLSearchParams(event.rawQueryString))
          : (event.queryStringParameters || {});

        // Parse OData query options
        const parsedOptions = parseODataQuery(query);

        // Resolve service root
        const serviceRoot = typeof opts.serviceRoot === "function" 
          ? opts.serviceRoot(event) 
          : opts.serviceRoot;

        // Create OData context
        const context: ODataMiddlewareContext = {
          model: opts.model as EdmModel,
          serviceRoot,
          entitySet: undefined, // Will be set by route handler or other middleware
          options: parsedOptions,
          metadata: {
            middlewareStack: ["parse"],
            executionTime: Date.now(),
          },
        };

        // Validate against EDM model if enabled
        if (opts.validateAgainstModel) {
          validateQueryOptions(context);
        }

        // Set context on request
        setMiddlewareContext(request, context);

      } catch (error) {
        // If parsing fails, we should still set up basic context
        // The error middleware will handle the actual error
        const context: ODataMiddlewareContext = {
          model: opts.model as EdmModel,
          serviceRoot: typeof opts.serviceRoot === "function" 
            ? opts.serviceRoot(request.event) 
            : opts.serviceRoot,
          entitySet: undefined,
          options: {},
          error: error as Error,
          metadata: {
            middlewareStack: ["parse"],
            executionTime: Date.now(),
          },
        };
        setMiddlewareContext(request, context);
        throw error; // Re-throw to let error middleware handle it
      }
    },
  };
}

/**
 * Validates parsed query options against the EDM model
 * @param context OData middleware context
 * @throws Error if validation fails
 */
function validateQueryOptions(context: ODataMiddlewareContext): void {
  const { model, options } = context;

  // Validate $select properties exist in model
  if (options.select) {
    for (const property of options.select) {
      if (!isValidPropertyPath(property, model)) {
        throw new Error(`Invalid property in $select: ${property}`);
      }
    }
  }

  // Validate $expand navigation properties exist in model
  if (options.expand) {
    for (const expandItem of options.expand) {
      if (!isValidNavigationProperty(expandItem.path, model)) {
        throw new Error(`Invalid navigation property in $expand: ${expandItem.path}`);
      }
    }
  }

  // Validate $orderby properties exist in model
  if (options.orderby) {
    for (const orderItem of options.orderby) {
      if (!isValidPropertyPath(orderItem.property, model)) {
        throw new Error(`Invalid property in $orderby: ${orderItem.property}`);
      }
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
  // Simple validation - in a real implementation, this would be more comprehensive
  // For now, we'll just check if the model has entity types
  if (!model.entityTypes || model.entityTypes.length === 0) {
    return true; // Can't validate without entity types
  }

  // Check if property exists in any entity type
  return model.entityTypes.some((entityType: any) => 
    entityType.properties?.some((prop: any) => prop.name === propertyPath)
  );
}

/**
 * Checks if a navigation property is valid in the EDM model
 * @param navigationPath Navigation property path to validate
 * @param model EDM model
 * @returns True if valid
 */
function isValidNavigationProperty(navigationPath: string, model: any): boolean {
  // Simple validation - in a real implementation, this would be more comprehensive
  if (!model.entityTypes || model.entityTypes.length === 0) {
    return true; // Can't validate without entity types
  }

  // Check if navigation property exists in any entity type
  return model.entityTypes.some((entityType: any) => 
    entityType.navigation?.some((nav: any) => nav.name === navigationPath)
  );
}
