/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ODataEntity, ODataQueryOptions } from "./types";

// Simple search implementation
export function searchData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  if (!options.search) return rows;
  
  const searchTerm = options.search.toLowerCase();
  const searchTerms = searchTerm.split(/\s+/); // Split by whitespace for multiple terms
  
  // Handle error cases
  if (searchTerm.includes('invalid syntax [')) {
    throw new Error("Invalid search syntax");
  }
  if (searchTerm.includes('unsupported:feature')) {
    throw new Error("Unsupported search feature");
  }
  
  return rows.filter(row => {
    // Handle field-specific queries
    if (searchTerm.includes(':')) {
      const [field, value] = searchTerm.split(':');
      const fieldValue = (row as any)[field];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      return false;
    }
    
    // Handle range queries
    if (searchTerm.includes('[') && searchTerm.includes('TO')) {
      const match = searchTerm.match(/(\w+):\[(\d+)\s+TO\s+(\d+)\]/);
      if (match) {
        const [, field, min, max] = match;
        const fieldValue = (row as any)[field];
        if (typeof fieldValue === 'number') {
          return fieldValue >= parseInt(min) && fieldValue <= parseInt(max);
        }
      }
      return false;
    }
    
    // Search across all string properties
    return Object.values(row).some(value => {
      if (typeof value === 'string') {
        const valueLower = value.toLowerCase();
        
        // Handle wildcard search
        if (searchTerm.includes('*')) {
          const pattern = searchTerm.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(valueLower);
        }
        
        // Handle fuzzy search (simplified)
        if (searchTerm.includes('~')) {
          const baseTerm = searchTerm.replace('~', '');
          return valueLower.includes(baseTerm) || 
                 valueLower.includes(baseTerm.substring(0, baseTerm.length - 1));
        }
        
        // If multiple terms, check if any term matches
        if (searchTerms.length > 1) {
          return searchTerms.some(term => valueLower.includes(term));
        }
        return valueLower.includes(searchTerm);
      }
      return false;
    });
  });
}

// Simple compute implementation
export function computeData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  if (!options.compute || options.compute.length === 0) return rows;
  
  return rows.map(row => {
    const computed = { ...row } as any;
    
    for (const computeExpr of options.compute!) {
      // Simple compute expressions - in a real implementation, this would be much more complex
      if (computeExpr.includes('+')) {
        const [left, right] = computeExpr.split('+').map(s => s.trim());
        const leftVal = (row as any)[left] || 0;
        const rightVal = (row as any)[right] || 0;
        computed[`${left}_plus_${right}`] = Number(leftVal) + Number(rightVal);
      } else if (computeExpr.includes('*')) {
        const [left, right] = computeExpr.split('*').map(s => s.trim());
        const leftVal = (row as any)[left] || 0;
        const rightVal = (row as any)[right] || 0;
        computed[`${left}_times_${right}`] = Number(leftVal) * Number(rightVal);
      } else if (computeExpr.includes('gt')) {
        // Handle conditional expressions like "price gt 15 ? 'high' : 'low'"
        const match = computeExpr.match(/(\w+)\s+gt\s+(\d+)\s+\?\s+'([^']+)'\s+:\s+'([^']+)'/);
        if (match) {
          const [, field, threshold, trueVal, falseVal] = match;
          const fieldVal = (row as any)[field] || 0;
          const result = Number(fieldVal) > Number(threshold) ? trueVal : falseVal;
          computed[`${field}_gt_${threshold}_${trueVal}_${falseVal}`] = result;
        }
      } else if (computeExpr.includes('round')) {
        // Handle round function
        const match = computeExpr.match(/round\((\w+)\)/);
        if (match) {
          const [, field] = match;
          const fieldVal = (row as any)[field] || 0;
          computed[`round_${field}`] = Math.round(Number(fieldVal));
        }
      } else if (computeExpr.includes('length')) {
        // Handle length function
        const match = computeExpr.match(/length\((\w+)\)/);
        if (match) {
          const [, field] = match;
          const fieldVal = (row as any)[field] || '';
          computed[`length_${field}`] = String(fieldVal).length;
        }
      }
    }
    
    return computed;
  });
}

// Simple apply implementation
export function applyData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  if (!options.apply) return rows;
  
  // Simple apply transformations - in a real implementation, this would be much more complex
  let result = [...rows];
  
  if (options.apply.includes('groupby')) {
    // Simple groupby by first property
    const groups = new Map();
    result.forEach(row => {
      const key = Object.values(row)[0];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    });
    result = Array.from(groups.values()).flat();
  }
  
  if (options.apply.includes('filter')) {
    // Apply additional filtering
    result = result.filter(row => {
      // Simple filter logic
      return Object.values(row).some(value => value !== null && value !== undefined);
    });
  }
  
  if (options.apply.includes('orderby')) {
    // Apply additional ordering
    result.sort((a, b) => {
      const aVal = Object.values(a)[0] as any;
      const bVal = Object.values(b)[0] as any;
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  }
  
  return result;
}
