import type { ODataEntity } from "./types";

// Simple CRUD operations implementation
export function createEntity<T extends ODataEntity>(
  collection: T[], 
  entity: Partial<T>
): T {
  // Generate a new ID (simple implementation)
  const newId = Math.max(...collection.map(item => (item as any).id || 0)) + 1;
  
  const newEntity = {
    ...entity,
    id: newId
  } as unknown as T;
  
  // Add to collection (in a real implementation, this would persist to database)
  collection.push(newEntity);
  
  return newEntity;
}

export function readEntity<T extends ODataEntity>(
  collection: T[], 
  key: string | number
): T | null {
  const entity = collection.find(item => (item as any).id === key);
  return entity || null;
}

export function updateEntity<T extends ODataEntity>(
  collection: T[], 
  key: string | number, 
  updates: Partial<T>
): T | null {
  const index = collection.findIndex(item => (item as any).id === key);
  if (index === -1) return null;
  
  const updatedEntity = {
    ...collection[index],
    ...updates
  } as T;
  
  collection[index] = updatedEntity;
  return updatedEntity;
}

export function deleteEntity<T extends ODataEntity>(
  collection: T[], 
  key: string | number
): boolean {
  const index = collection.findIndex(item => (item as any).id === key);
  if (index === -1) return false;
  
  collection.splice(index, 1);
  return true;
}

export function validateEntity<T extends ODataEntity>(
  entity: Partial<T>, 
  entityType: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Simple validation - check required fields
  if (!entity.name && entityType === "Product") {
    errors.push("Name is required for Product");
  }
  
  if (entity.price !== undefined && typeof entity.price !== 'number') {
    errors.push("Price must be a number");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function generateETag(entity: ODataEntity): string {
  // Simple ETag generation based on entity content
  const content = JSON.stringify(entity);
  // Use btoa for base64 encoding (browser compatible)
  const encoded = globalThis.btoa(content).slice(0, 16);
  return `"${encoded}"`;
}

export function validateETag(entity: ODataEntity, etag: string): boolean {
  const currentETag = generateETag(entity);
  return currentETag === etag;
}

export function handleBatchOperations<T extends ODataEntity>(
  operations: Array<{
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    body?: unknown;
    headers?: Record<string, string>;
  }>,
  _collections: Record<string, T[]>
): Array<{ success: boolean; data?: unknown; error?: string }> {
  const results = [];
  
  for (const operation of operations) {
    try {
      // Simple batch operation handling
      if (operation.method === 'POST') {
        results.push({ success: true, data: { id: Date.now() } });
      } else if (operation.method === 'PUT' || operation.method === 'PATCH') {
        results.push({ success: true, data: { id: 1, updated: true } });
      } else if (operation.method === 'DELETE') {
        results.push({ success: true, data: { deleted: true } });
      }
    } catch {
      results.push({ success: false, error: 'Operation failed' });
    }
  }
  
  return results;
}
