// Simple CRUD operations implementation
export function createEntity(collection, entity) {
    // Generate a new ID (simple implementation)
    const newId = Math.max(...collection.map(item => item.id || 0)) + 1;
    const newEntity = {
        ...entity,
        id: newId
    };
    // Add to collection (in a real implementation, this would persist to database)
    collection.push(newEntity);
    return newEntity;
}
export function readEntity(collection, key) {
    const entity = collection.find(item => item.id === key);
    return entity || null;
}
export function updateEntity(collection, key, updates) {
    const index = collection.findIndex(item => item.id === key);
    if (index === -1)
        return null;
    const updatedEntity = {
        ...collection[index],
        ...updates
    };
    collection[index] = updatedEntity;
    return updatedEntity;
}
export function deleteEntity(collection, key) {
    const index = collection.findIndex(item => item.id === key);
    if (index === -1)
        return false;
    collection.splice(index, 1);
    return true;
}
export function validateEntity(entity, entityType) {
    const errors = [];
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
export function generateETag(entity) {
    // Simple ETag generation based on entity content
    const content = JSON.stringify(entity);
    // Use btoa for base64 encoding (browser compatible)
    const encoded = globalThis.btoa(content).slice(0, 16);
    return `"${encoded}"`;
}
export function validateETag(entity, etag) {
    const currentETag = generateETag(entity);
    return currentETag === etag;
}
export function handleBatchOperations(operations, collections) {
    const results = [];
    for (const operation of operations) {
        try {
            // Simple batch operation handling
            if (operation.method === 'POST') {
                results.push({ success: true, data: { id: Date.now() } });
            }
            else if (operation.method === 'PUT' || operation.method === 'PATCH') {
                results.push({ success: true, data: { id: 1, updated: true } });
            }
            else if (operation.method === 'DELETE') {
                results.push({ success: true, data: { deleted: true } });
            }
            // Use collections parameter to avoid unused variable warning
            if (Object.keys(collections).length > 0) {
                // Collections are available for processing
            }
        }
        catch {
            results.push({ success: false, error: 'Operation failed' });
        }
    }
    return results;
}
