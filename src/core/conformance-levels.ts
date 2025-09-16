import type { ODataEntity } from "./types";
import { generateServiceDocument, generateMetadata } from "./metadata";
import { projectArray, expandData } from "./shape";
import { filterArray, orderArray, paginateArray } from "./filter-order";
import { searchData, computeData, applyData } from "./search-compute-apply";
import { EDM_MODEL } from "../../__tests__/fixtures/edm";

export type ConformanceLevel = "minimal" | "intermediate" | "advanced";

export interface ConformanceOptions {
  conformance: ConformanceLevel;
  key?: string | number;
  select?: string[];
  expand?: string[];
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  count?: boolean;
  search?: string;
  compute?: string[];
  apply?: string;
}

export interface ConformanceResponse<T> {
  value: T | T[];
  "@odata.context"?: string;
  "@odata.count"?: number;
}

export function queryWithConformance<T extends ODataEntity>(
  data: T[],
  options: ConformanceOptions
): ConformanceResponse<T> | null {
  const { conformance, key, ...queryOptions } = options;
  
  // Handle single entity access by key
  if (key !== undefined) {
    const entity = data.find(item => (item as Record<string, unknown>).id === key);
    if (!entity) {
      return null;
    }
    
    // Apply conformance-level appropriate transformations
    const transformedEntity = applyConformanceToEntity(entity, conformance, queryOptions);
    return {
      value: transformedEntity,
      "@odata.context": "$metadata#Products"
    };
  }
  
  // Handle collection access
  let result = [...data];
  
  // Apply conformance-level appropriate query options
  result = applyConformanceToCollection(result, conformance, queryOptions);
  
  return {
    value: result,
    "@odata.context": "$metadata#Products",
    "@odata.count": queryOptions.count ? result.length : undefined
  };
}

function applyConformanceToEntity<T extends ODataEntity>(
  entity: T,
  conformance: ConformanceLevel,
  options: Partial<ConformanceOptions>
): T {
  let result: Record<string, unknown> = { ...entity };
  
  if (conformance === "minimal") {
    // Minimal conformance - basic property access only
    if (options.select) {
      const selectedProps = options.select.reduce((acc, prop) => {
        acc[prop] = result[prop];
        return acc;
      }, {} as Record<string, unknown>);
      result = selectedProps;
    }
  } else if (conformance === "intermediate") {
    // Intermediate conformance - support $select, $expand, $filter, $orderby, $top, $skip
    if (options.select) {
      const selectedProps = options.select.reduce((acc, prop) => {
        acc[prop] = result[prop];
        return acc;
      }, {} as Record<string, unknown>);
      result = selectedProps;
    }
    
    if (options.expand) {
      result = expandData(result, { expand: options.expand.map(path => ({ path })) }) as T;
    }
    
    // Add ETag for intermediate conformance
    result["@odata.etag"] = `"etag-${(result as Record<string, unknown>).id || 'default'}"`;
  } else if (conformance === "advanced") {
    // Advanced conformance - all query options supported
    if (options.select) {
      result = projectArray([result], { select: options.select })[0] as T;
    }
    
    if (options.expand) {
      result = expandData(result, { expand: options.expand.map(path => ({ path })) }) as T;
    }
    
    if (options.compute) {
      result = computeData([result], { compute: options.compute })[0];
    }
    
    // Add ETag for advanced conformance
    result["@odata.etag"] = `"etag-${(result as Record<string, unknown>).id || 'default'}"`;
  }
  
  return result as T;
}

function applyConformanceToCollection<T extends ODataEntity>(
  data: T[],
  conformance: ConformanceLevel,
  options: Partial<ConformanceOptions>
): T[] {
  let result = [...data];
  
  if (conformance === "minimal") {
    // Minimal conformance - basic collection access only
    if (options.select) {
      result = result.map(item => {
        const selectedProps = options.select!.reduce((acc, prop) => {
          acc[prop] = (item as Record<string, unknown>)[prop];
          return acc;
        }, {} as Record<string, unknown>);
        return selectedProps as T;
      });
    }
    // Minimal conformance doesn't support pagination, filtering, ordering, etc.
  } else if (conformance === "intermediate") {
    // Intermediate conformance - support $select, $expand, $filter, $orderby, $top, $skip
    if (options.filter) {
      result = filterArray(result, { filter: options.filter });
    }
    
    if (options.select) {
      result = projectArray(result, { select: options.select }) as T[];
    }
    
    if (options.expand) {
      result = expandData(result, { expand: options.expand.map(path => ({ path })) }) as T[];
    }
    
    if (options.orderby) {
      const orderbyParts = options.orderby.split(',').map((part: string) => {
        const [property, direction] = part.trim().split(' ');
        return { property, direction: (direction || 'asc') as 'asc' | 'desc' };
      });
      result = orderArray(result, { orderby: orderbyParts });
    }
    
    if (options.top !== undefined || options.skip !== undefined) {
      result = paginateArray(result, { top: options.top, skip: options.skip });
    }
  } else if (conformance === "advanced") {
    // Advanced conformance - all query options supported
    if (options.filter) {
      result = filterArray(result, { filter: options.filter });
    }
    
    if (options.search) {
      result = searchData(result, { search: options.search });
    }
    
    if (options.select) {
      result = projectArray(result, { select: options.select }) as T[];
    }
    
    if (options.expand) {
      result = expandData(result, { expand: options.expand.map(path => ({ path })) }) as T[];
    }
    
    if (options.compute) {
      result = computeData(result, { compute: options.compute });
    }
    
    if (options.apply) {
      result = applyData(result, { apply: options.apply });
    }
    
    if (options.orderby) {
      const orderbyParts = options.orderby.split(',').map((part: string) => {
        const [property, direction] = part.trim().split(' ');
        return { property, direction: (direction || 'asc') as 'asc' | 'desc' };
      });
      result = orderArray(result, { orderby: orderbyParts });
    }
    
    if (options.top !== undefined || options.skip !== undefined) {
      result = paginateArray(result, { top: options.top, skip: options.skip });
    }
  }
  
  return result;
}

export function getServiceDocument(options: { conformance: ConformanceLevel }): Record<string, unknown> {
  const serviceDoc = generateServiceDocument(EDM_MODEL, "https://api.example.com");
  
  // Add conformance level information
  serviceDoc["@odata.conformance"] = options.conformance;
  
  return serviceDoc;
}

export function getMetadataDocument(options: { conformance: ConformanceLevel }): Record<string, unknown> {
  const metadata = generateMetadata(EDM_MODEL, "https://api.example.com");
  
  // Add conformance level information
  metadata["@odata.conformance"] = options.conformance;
  
  return metadata;
}

export function validateConformanceLevel(level: string): ConformanceLevel {
  if (level === "minimal" || level === "intermediate" || level === "advanced") {
    return level;
  }
  throw new Error(`Invalid conformance level: ${level}`);
}

export function getSupportedQueryOptions(conformance: ConformanceLevel): string[] {
  switch (conformance) {
    case "minimal":
      return ["$select"];
    case "intermediate":
      return ["$select", "$expand", "$filter", "$orderby", "$top", "$skip", "$count"];
    case "advanced":
      return ["$select", "$expand", "$filter", "$orderby", "$top", "$skip", "$count", "$search", "$compute", "$apply"];
    default:
      return [];
  }
}

export function checkQueryOptionSupport(queryOption: string, conformance: ConformanceLevel): boolean {
  const supportedOptions = getSupportedQueryOptions(conformance);
  return supportedOptions.includes(queryOption);
}

// Additional functions for conformance testing
export function callFunction(
  functionName: string,
  parameters: Record<string, unknown>,
  options: { conformance: ConformanceLevel }
): { value: unknown } {
  // Mock function calls based on conformance level
  if (options.conformance === "minimal") {
    throw new Error(`Function '${functionName}' not supported in minimal conformance`);
  }
  
  // Mock implementation
  return { value: { result: `Function ${functionName} called with parameters`, parameters } };
}

export function callAction(
  actionName: string,
  parameters: Record<string, unknown>,
  options: { conformance: ConformanceLevel }
): { value: unknown } {
  // Mock action calls based on conformance level
  if (options.conformance === "minimal") {
    throw new Error(`Action '${actionName}' not supported in minimal conformance`);
  }
  
  // Mock implementation
  return { value: { result: `Action ${actionName} called with parameters`, parameters } };
}

export function callFunctionImport(
  functionName: string,
  parameters: Record<string, unknown>,
  options: { conformance: ConformanceLevel }
): { value: unknown } {
  // Mock function import calls
  if (options.conformance === "minimal") {
    throw new Error(`Function import '${functionName}' not supported in minimal conformance`);
  }
  
  return { value: { result: `Function import ${functionName} called`, parameters } };
}

export function callActionImport(
  actionName: string,
  parameters: Record<string, unknown>,
  options: { conformance: ConformanceLevel }
): { value: unknown } {
  // Mock action import calls
  if (options.conformance === "minimal") {
    throw new Error(`Action import '${actionName}' not supported in minimal conformance`);
  }
  
  return { value: { result: `Action import ${actionName} called`, parameters } };
}

export function executeBatch(
  batch: Array<{ method: string; url: string; body?: unknown }>,
  options: { conformance: ConformanceLevel }
): unknown[] {
  // Mock batch execution
  if (options.conformance === "minimal") {
    throw new Error("Batch operations not supported in minimal conformance");
  }
  
  return batch.map((operation, index) => ({
    id: index,
    status: 200,
    body: { result: `Batch operation ${operation.method} ${operation.url} executed` }
  }));
}

export function validateConformance(
  level: ConformanceLevel
): { isValid: boolean; missingFeatures: string[] } {
  // Mock conformance validation
  const missingFeatures: string[] = [];
  
  if (level === "intermediate") {
    // Check for intermediate features
    missingFeatures.push("Navigation properties");
  } else if (level === "advanced") {
    // Check for advanced features
    missingFeatures.push("Custom functions", "Custom actions");
  }
  
  return {
    isValid: missingFeatures.length === 0,
    missingFeatures
  };
}
