import type { ODataErrorPayload, EdmModel } from "./types";

export class ODataBadRequest extends Error {
  statusCode = 400;
  code = "BadRequest";
}

export class ODataInternalServerError extends Error {
  statusCode = 500;
  code = "InternalServerError";
}

export function toODataError(err: unknown, message?: string): ODataErrorPayload {
  if (err && typeof err === "object" && "statusCode" in err && "message" in err) {
    const e = err as any;
    return { error: { code: e.code ?? String(e.statusCode), message: e.message } };
  }
  return { error: { code: "InternalServerError", message: message ?? "An error occurred" } };
}

// Validation functions for OData query parameters
export function validateSelectParameters(select: string[] | undefined, entityType: string, edmModel: EdmModel): void {
  if (!select || select.length === 0) return;
  
  // Get entity type properties from EDM model
  const entityTypeDef = edmModel.entityTypes?.find(et => et.name === entityType);
  if (!entityTypeDef) {
    throw new ODataBadRequest(`Entity type '${entityType}' not found`);
  }
  
  const validProperties = entityTypeDef.properties?.map(p => p.name) || [];
  
  for (const property of select) {
    if (!validProperties.includes(property)) {
      throw new ODataBadRequest(`Property '${property}' not found in entity type '${entityType}'`);
    }
  }
}

export function validateFilterExpression(filter: string | undefined, entityType: string, edmModel: EdmModel): void {
  if (!filter) return;
  
  // Basic filter validation - check for common syntax errors
  if (filter.includes('()')) {
    throw new ODataBadRequest("Invalid filter expression: empty parentheses");
  }
  
  if (filter.includes('  ')) {
    throw new ODataBadRequest("Invalid filter expression: multiple spaces");
  }
  
  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of filter) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      throw new ODataBadRequest("Invalid filter expression: unmatched closing parenthesis");
    }
  }
  if (parenCount !== 0) {
    throw new ODataBadRequest("Invalid filter expression: unmatched opening parenthesis");
  }
  
  // Get entity type properties from EDM model
  const entityTypeDef = edmModel.entityTypes?.find(et => et.name === entityType);
  if (!entityTypeDef) {
    throw new ODataBadRequest(`Entity type '${entityType}' not found`);
  }
  
  const validProperties = entityTypeDef.properties?.map(p => p.name) || [];
  
  // Extract property names from filter (simple regex-based approach)
  // Skip string literals (text in single quotes)
  const filterWithoutStrings = filter.replace(/'[^']*'/g, '');
  const propertyMatches = filterWithoutStrings.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) || [];
  for (const match of propertyMatches) {
    if (!['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'and', 'or', 'not', 'true', 'false', 'null'].includes(match) && 
        !validProperties.includes(match)) {
      throw new ODataBadRequest(`Property '${match}' not found in entity type '${entityType}'`);
    }
  }
}

export function validateOrderByProperties(orderby: string[] | undefined, entityType: string, edmModel: EdmModel): void {
  if (!orderby || orderby.length === 0) return;
  
  // Get entity type properties from EDM model
  const entityTypeDef = edmModel.entityTypes?.find(et => et.name === entityType);
  if (!entityTypeDef) {
    throw new ODataBadRequest(`Entity type '${entityType}' not found`);
  }
  
  const validProperties = entityTypeDef.properties?.map(p => p.name) || [];
  
  for (const orderByItem of orderby) {
    const [property] = orderByItem.split(' ');
    if (!validProperties.includes(property)) {
      throw new ODataBadRequest(`Property '${property}' not found in entity type '${entityType}'`);
    }
  }
}

export function validateExpandNavigationProperties(expand: string[] | undefined, entityType: string, edmModel: EdmModel): void {
  if (!expand || expand.length === 0) return;
  
  // Get entity type navigation properties from EDM model
  const entityTypeDef = edmModel.entityTypes?.find(et => et.name === entityType);
  if (!entityTypeDef) {
    throw new ODataBadRequest(`Entity type '${entityType}' not found`);
  }
  
  const validNavigationProperties = entityTypeDef.navigation?.map(np => np.name) || [];
  
  for (const navigationProperty of expand) {
    if (!validNavigationProperties.includes(navigationProperty)) {
      throw new ODataBadRequest(`Navigation property '${navigationProperty}' not found in entity type '${entityType}'`);
    }
  }
}

export function validateEdmModelConstraints(entity: any, entityType: string, edmModel: EdmModel): void {
  const entityTypeDef = edmModel.entityTypes?.find(et => et.name === entityType);
  if (!entityTypeDef) {
    throw new ODataBadRequest(`Entity type '${entityType}' not found`);
  }
  
  // Check required properties (assume all properties are required if nullable is not explicitly set to true)
  const requiredProperties = entityTypeDef.properties?.filter(p => p.nullable !== true) || [];
  for (const property of requiredProperties) {
    if (!(property.name in entity) || entity[property.name] === null || entity[property.name] === undefined) {
      throw new ODataBadRequest(`Required property '${property.name}' is missing or null`);
    }
  }
  
  // Check property types (basic validation)
  for (const property of entityTypeDef.properties || []) {
    if (property.name in entity) {
      const value = entity[property.name];
      if (value !== null && value !== undefined) {
        // Basic type checking
        if (property.type === 'Edm.String' && typeof value !== 'string') {
          throw new ODataBadRequest(`Property '${property.name}' must be a string`);
        }
        if ((property.type === 'Edm.Int32' || property.type === 'Edm.Decimal') && typeof value !== 'number') {
          throw new ODataBadRequest(`Property '${property.name}' must be a number`);
        }
        if (property.type === 'Edm.Boolean' && typeof value !== 'boolean') {
          throw new ODataBadRequest(`Property '${property.name}' must be a boolean`);
        }
      }
    }
  }
}

// HTTP status code mapping
export function getHttpStatusCode(error: Error): number {
  if (error instanceof ODataBadRequest) {
    return 400;
  }
  if (error instanceof ODataInternalServerError) {
    return 500;
  }
  // Default to 500 for unknown errors
  return 500;
}

export function isValidationError(error: Error): boolean {
  return error instanceof ODataBadRequest;
}

export function isServerError(error: Error): boolean {
  return error instanceof ODataInternalServerError;
}
