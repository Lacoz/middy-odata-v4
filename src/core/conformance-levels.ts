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
