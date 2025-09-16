import type { MiddlewareObj } from "@middy/core";
import type { ODataMetadataOptions, ODataMiddlewareContext } from "./types";
import { generateMetadata, generateServiceDocument } from "../core/metadata";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";

const DEFAULT_METADATA_OPTIONS: ODataMetadataOptions = {
  enableMetadata: true,
  enableServiceDocument: true,
  includeAnnotations: true,
  customAnnotations: {},
  metadataPath: "/$metadata",
  serviceDocumentPath: "/",
};

/**
 * OData Metadata Middleware
 * 
 * Responsibilities:
 * - Handle OData metadata requests ($metadata endpoint)
 * - Generate service document for service root
 * - Provide EDM model information to clients
 * - Support custom annotations and metadata extensions
 * - Handle metadata versioning and caching
 * - Generate proper OData metadata XML/JSON responses
 */
export function odataMetadata(options: Partial<ODataMetadataOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_METADATA_OPTIONS, options);

  return {
    before: async (request: any) => {
      try {
        const context = getMiddlewareContext(request);
        
        if (!context) {
          return;
        }

        const { event } = request;
        const path = event.path || event.rawPath || "";
        const queryParams = event.queryStringParameters || {};

        // Check if this is a metadata request
        if (opts.enableMetadata && path.endsWith(opts.metadataPath)) {
          // Generate metadata document
          const metadata = generateMetadata(context.model, {
            serviceRoot: context.serviceRoot,
            includeAnnotations: opts.includeAnnotations,
            customAnnotations: opts.customAnnotations,
            format: queryParams.$format || "xml",
          });

          // Set the response
          const contentType = queryParams.$format === "json" 
            ? "application/json" 
            : "application/xml";

          request.response = {
            statusCode: 200,
            headers: {
              "Content-Type": contentType,
              "OData-Version": "4.0",
              "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
            body: metadata,
          };

          // Update context
          context.metadata = {
            ...context.metadata,
            metadataRequest: {
              path: opts.metadataPath,
              format: queryParams.$format || "xml",
              generated: true,
            },
          };
          setMiddlewareContext(request, context);

        } else if (opts.enableServiceDocument && path === opts.serviceDocumentPath) {
          // Check if this is a service document request (no query parameters or just $format)
          const hasOnlyFormatParam = Object.keys(queryParams).length === 0 || 
            (Object.keys(queryParams).length === 1 && queryParams.$format);

          if (hasOnlyFormatParam) {
            // Generate service document
            const serviceDocument = generateServiceDocument(context.model, {
              serviceRoot: context.serviceRoot,
              format: queryParams.$format || "json",
            });

            // Set the response
            const contentType = queryParams.$format === "xml" 
              ? "application/xml" 
              : "application/json";

            request.response = {
              statusCode: 200,
              headers: {
                "Content-Type": contentType,
                "OData-Version": "4.0",
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
              },
              body: serviceDocument,
            };

            // Update context
            context.metadata = {
              ...context.metadata,
              serviceDocumentRequest: {
                path: opts.serviceDocumentPath,
                format: queryParams.$format || "json",
                generated: true,
              },
            };
            setMiddlewareContext(request, context);
          }
        }

      } catch (error) {
        // Let the error middleware handle this
        request.error = error;
        throw error;
      }
    },
  };
}

/**
 * Helper function to create custom annotations
 */
export function createAnnotation(
  target: string,
  term: string,
  value: any,
  qualifier?: string
) {
  return {
    target,
    term,
    value,
    qualifier,
  };
}

/**
 * Helper function to create a collection of annotations
 */
export function createAnnotations(annotations: Array<{
  target: string;
  term: string;
  value: any;
  qualifier?: string;
}>) {
  return annotations.reduce((acc, annotation) => {
    const key = annotation.qualifier 
      ? `${annotation.target}#${annotation.term}@${annotation.qualifier}`
      : `${annotation.target}#${annotation.term}`;
    
    acc[key] = annotation.value;
    return acc;
  }, {} as Record<string, any>);
}

/**
 * Common OData annotations for better client experience
 */
export const commonAnnotations = {
  // Entity Set annotations
  entitySetCapabilities: (entitySetName: string) => ({
    [`${entitySetName}#Org.OData.Capabilities.V1.ReadRestrictions`]: {
      Readable: true,
    },
    [`${entitySetName}#Org.OData.Capabilities.V1.InsertRestrictions`]: {
      Insertable: true,
    },
    [`${entitySetName}#Org.OData.Capabilities.V1.UpdateRestrictions`]: {
      Updatable: true,
    },
    [`${entitySetName}#Org.OData.Capabilities.V1.DeleteRestrictions`]: {
      Deletable: true,
    },
  }),

  // Property annotations
  propertyDisplayName: (entityTypeName: string, propertyName: string, displayName: string) => ({
    [`${entityTypeName}/${propertyName}#Org.OData.Core.V1.DisplayName`]: displayName,
  }),

  propertyDescription: (entityTypeName: string, propertyName: string, description: string) => ({
    [`${entityTypeName}/${propertyName}#Org.OData.Core.V1.Description`]: description,
  }),

  // Navigation property annotations
  navigationPropertyRestrictions: (entityTypeName: string, navPropertyName: string) => ({
    [`${entityTypeName}/${navPropertyName}#Org.OData.Capabilities.V1.NavigationRestrictions`]: {
      RestrictedProperties: [
        {
          NavigationProperty: navPropertyName,
          ReadRestrictions: {
            Readable: true,
          },
        },
      ],
    },
  }),

  // Function/Action annotations
  functionCapabilities: (functionName: string) => ({
    [`${functionName}#Org.OData.Capabilities.V1.Callable`]: true,
  }),

  actionCapabilities: (actionName: string) => ({
    [`${actionName}#Org.OData.Capabilities.V1.Callable`]: true,
  }),
};

/**
 * Helper function to merge multiple annotation objects
 */
export function mergeAnnotations(...annotationObjects: Record<string, any>[]): Record<string, any> {
  return annotationObjects.reduce((acc, annotations) => {
    return { ...acc, ...annotations };
  }, {});
}

/**
 * Helper function to create metadata options with common annotations
 */
export function createMetadataOptions(
  baseOptions: Partial<ODataMetadataOptions> = {},
  customAnnotations: Record<string, any> = {}
): ODataMetadataOptions {
  return {
    ...DEFAULT_METADATA_OPTIONS,
    ...baseOptions,
    customAnnotations: {
      ...baseOptions.customAnnotations,
      ...customAnnotations,
    },
  };
}
