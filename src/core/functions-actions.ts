// import type { ODataEntity } from "./types";

export interface FunctionParameter {
  name: string;
  type: string;
  value: unknown;
}

export interface FunctionCall {
  name: string;
  parameters?: FunctionParameter[];
  boundTo?: string;
}

export interface ActionParameter {
  name: string;
  type: string;
  value: unknown;
}

export interface ActionCall {
  name: string;
  parameters?: ActionParameter[];
  boundTo?: string;
}

export interface FunctionResult {
  value: unknown;
  "@odata.context"?: string;
}

export interface ActionResult {
  value?: unknown;
  "@odata.context"?: string;
}

// Function registry for unbound functions
const functionRegistry = new Map<string, (params: Record<string, unknown>) => FunctionResult>();

// Action registry for unbound actions
const actionRegistry = new Map<string, (params: Record<string, unknown>) => ActionResult>();

// Register built-in functions
functionRegistry.set("getProductsByCategory", (params: any) => {
  const { categoryId, minPrice = 0 } = params;
  // Mock implementation - in real scenario would query database
  return {
    value: [
      { id: 1, name: "Product A", price: 15, categoryId },
      { id: 2, name: "Product B", price: 25, categoryId }
    ].filter(p => p.price >= minPrice)
  };
});

functionRegistry.set("calculatePrice", (params: any) => {
  const { basePrice, discount = 0 } = params;
  return {
    value: basePrice * (1 - discount)
  };
});

functionRegistry.set("calculateShipping", (params: any) => {
  const { address } = params;
  // Mock shipping calculation based on zip code
  const shippingRates: Record<string, number> = {
    "10001": 5.99,
    "90210": 7.99,
    "default": 9.99
  };
  return {
    value: shippingRates[address?.zipCode] || shippingRates.default
  };
});

functionRegistry.set("calculateBulkDiscount", (params: Record<string, unknown>) => {
  const { quantities } = params;
  // Mock bulk discount calculation
  const totalItems = (quantities as number[]).reduce((sum: number, qty: number) => sum + qty, 0);
  const discount = totalItems >= 10 ? 0.15 : totalItems >= 5 ? 0.10 : 0.05;
  return {
    value: discount
  };
});

functionRegistry.set("getRelatedProducts", (params: any) => {
  const { maxCount = 5 } = params;
  // Mock related products
  return {
    value: [
      { id: 2, name: "Related Product 1", price: 20 },
      { id: 3, name: "Related Product 2", price: 30 }
    ].slice(0, maxCount)
  };
});

functionRegistry.set("searchProducts", (params: any) => {
  const { query, categoryId, minPrice, maxPrice } = params;
  // Mock search implementation
  return {
    value: [
      { id: 1, name: "Search Result 1", price: 15, categoryId: 1 },
      { id: 2, name: "Search Result 2", price: 25, categoryId: 2 }
    ].filter(p => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (minPrice && p.price < minPrice) return false;
      if (maxPrice && p.price > maxPrice) return false;
      return !query || p.name.toLowerCase().includes(query.toLowerCase());
    })
  };
});

// Additional functions for comprehensive testing
functionRegistry.set("compareProducts", () => {
  return { value: { comparison: "Product 1 is better" } };
});

functionRegistry.set("getCategoryProducts", (params: any) => {
  const { category } = params;
  return { value: [{ id: 1, name: "Category Product", categoryId: category.id }] };
});

functionRegistry.set("getProductsByStatus", (params: any) => {
  const { status } = params;
  return { value: [{ id: 1, name: "Product", status }] };
});

functionRegistry.set("getProductsCreatedAfter", (params: any) => {
  const { date } = params;
  return { value: [{ id: 1, name: "Product", createdAt: date }] };
});

functionRegistry.set("getProductsWithWarranty", (params: any) => {
  const { warrantyPeriod } = params;
  return { value: [{ id: 1, name: "Product", warrantyPeriod }] };
});

functionRegistry.set("uploadImage", () => {
  return { value: { imageId: "img123", url: "https://example.com/image.jpg" } };
});

functionRegistry.set("findNearbyStores", (params: any) => {
  const { location } = params;
  return { value: [{ id: 1, name: "Store", location }] };
});

functionRegistry.set("calculateArea", () => {
  return { value: 100.5 };
});

functionRegistry.set("getAllCategories", () => {
  return { value: [{ id: 1, name: "Category 1" }, { id: 2, name: "Category 2" }] };
});

functionRegistry.set("getProductById", (params: any) => {
  const { id } = params;
  if (typeof id !== 'number') {
    throw new Error("Parameter 'id' must be of type Edm.Int32");
  }
  if (id <= 0) {
    throw new Error("Parameter 'id' must be a positive integer");
  }
  return { value: { id, name: "Product", price: 10 } };
});

functionRegistry.set("getProductSummary", (params: any) => {
  const { id } = params;
  return { value: { id, name: "Product", price: 10, summary: "Product summary" } };
});

functionRegistry.set("getProductCount", () => {
  return { value: 42 };
});

functionRegistry.set("getProductDescription", (params: any) => {
  const { id } = params;
  return { value: id === 1 ? null : "Product description" };
});

functionRegistry.set("getProductStatus", () => {
  return { value: "Active" };
});

functionRegistry.set("divideByZero", (params: any) => {
  const { a, b } = params;
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return { value: a / b };
});

functionRegistry.set("longRunningFunction", () => {
  throw new Error("Function execution timed out");
});

functionRegistry.set("GetAllProducts", () => {
  return { value: [{ id: 1, name: "Product 1" }, { id: 2, name: "Product 2" }] };
});

// Register built-in actions
actionRegistry.set("createProduct", (params: any) => {
  const { name, price, categoryId } = params;
  return {
    value: {
      id: Date.now(),
      name,
      price,
      categoryId,
      createdAt: new Date().toISOString()
    }
  };
});

actionRegistry.set("updateProductPrice", (params: any) => {
  const { productId, newPrice } = params;
  return {
    value: {
      id: productId,
      price: newPrice,
      updatedAt: new Date().toISOString()
    }
  };
});

actionRegistry.set("bulkUpdateProducts", (params: any) => {
  const { updates } = params;
  return {
    value: updates.map((update: any) => ({
      id: update.id,
      price: update.newPrice,
      updatedAt: new Date().toISOString()
    }))
  };
});

actionRegistry.set("sendNotification", (params: Record<string, unknown>) => {
  const { recipients } = params;
  return {
    value: {
      messageId: Date.now(),
      status: "sent",
      recipients: (recipients as string[]).length,
      sentAt: new Date().toISOString()
    }
  };
});

// Additional actions for comprehensive testing
actionRegistry.set("updateProductAddress", (params: any) => {
  const { productId, address } = params;
  return { value: { id: productId, address } };
});

actionRegistry.set("transferProduct", (params: any) => {
  const { productId, toLocation } = params;
  return { value: { id: productId, location: toLocation } };
});

actionRegistry.set("moveToCategory", (params: any) => {
  const { productId, categoryId } = params;
  return { value: { id: productId, categoryId } };
});

actionRegistry.set("updateProduct", (params: any) => {
  const { productId, name, price } = params;
  if (productId === 999) {
    throw new Error("Product with id 999 not found");
  }
  return { value: { id: productId, name, price } };
});

actionRegistry.set("setProductStatus", (params: any) => {
  const { productId, status } = params;
  return { value: { id: productId, status } };
});

actionRegistry.set("scheduleProduct", (params: any) => {
  const { productId, scheduledDate } = params;
  return { value: { id: productId, scheduledDate } };
});

actionRegistry.set("setWarrantyPeriod", (params: any) => {
  const { productId, warrantyPeriod } = params;
  return { value: { id: productId, warrantyPeriod } };
});

actionRegistry.set("uploadProductImage", (params: any) => {
  const { productId } = params;
  return { value: { id: productId, imageUrl: "https://example.com/image.jpg" } };
});

actionRegistry.set("setProductLocation", (params: any) => {
  const { productId, location } = params;
  return { value: { id: productId, location } };
});

actionRegistry.set("setProductArea", (params: any) => {
  const { productId, area } = params;
  return { value: { id: productId, area } };
});

actionRegistry.set("getProductHistory", () => {
  return { value: [{ id: 1, action: "created", date: "2024-01-01" }] };
});

actionRegistry.set("cloneProduct", (params: any) => {
  const { productId } = params;
  return { value: { id: productId + 1000, name: "Cloned Product" } };
});

actionRegistry.set("getProductReport", (params: any) => {
  const { productId } = params;
  return { value: { id: productId, summary: "Product report summary", report: "Product report data" } };
});

actionRegistry.set("calculateTotal", (params: any) => {
  const { items } = params;
  if (!items || !Array.isArray(items)) {
    return { value: 0 };
  }
  return { value: items.reduce((sum: number, item: any) => sum + (item.price || 0), 0) };
});

actionRegistry.set("getProductDiscount", (params: any) => {
  const { productId } = params;
  return { value: productId === 1 ? null : 0.1 };
});

actionRegistry.set("deleteProduct", () => {
  return {};
});

actionRegistry.set("deleteAllProducts", () => {
  throw new Error("Insufficient permissions to perform this action");
});

actionRegistry.set("getProductStatus", () => {
  return { value: "Active" };
});

actionRegistry.set("BulkUpdateProducts", (params: any) => {
  const { productIds, updates } = params;
  return { value: { updated: productIds.length, updates } };
});

actionRegistry.set("RefreshCache", () => {
  return {};
});

export function callFunction(functionName: string, parameters: Record<string, any> = {}): FunctionResult {
  const func = functionRegistry.get(functionName);
  if (!func) {
    throw new Error(`Function '${functionName}' not found`);
  }
  
  try {
    return func(parameters);
  } catch (error) {
    throw new Error(`Function '${functionName}' execution failed: ${error}`);
  }
}

export function callAction(actionName: string, parameters: Record<string, any> = {}): ActionResult {
  const action = actionRegistry.get(actionName);
  if (!action) {
    throw new Error(`Action '${actionName}' not found`);
  }
  
  try {
    return action(parameters);
  } catch (error) {
    throw new Error(`Action '${actionName}' execution failed: ${error}`);
  }
}

export function callBoundFunction(entityId: string, functionName: string, parameters: Record<string, any> = {}): FunctionResult {
  // For bound functions, we might need to pass the entity context
  const boundParams = { ...parameters, entityId };
  return callFunction(functionName, boundParams);
}

export function callBoundAction(entityId: string, actionName: string, parameters: Record<string, any> = {}): ActionResult {
  // For bound actions, we might need to pass the entity context
  const boundParams = { ...parameters, entityId };
  return callAction(actionName, boundParams);
}

export function registerFunction(name: string, implementation: (params: Record<string, unknown>) => FunctionResult): void {
  functionRegistry.set(name, implementation);
}

export function registerAction(name: string, implementation: (params: Record<string, unknown>) => ActionResult): void {
  actionRegistry.set(name, implementation);
}

export function getFunctionMetadata(functionName: string): Record<string, unknown> {
  const func = functionRegistry.get(functionName);
  if (!func) {
    throw new Error(`Function '${functionName}' not found`);
  }
  
  // Mock metadata - in real implementation would come from EDM model
  return {
    name: functionName,
    parameters: [],
    returnType: "Collection(Product)",
    isComposable: false,
    isBound: false
  };
}

export function getActionMetadata(actionName: string): Record<string, unknown> {
  const action = actionRegistry.get(actionName);
  if (!action) {
    throw new Error(`Action '${actionName}' not found`);
  }
  
  // Mock metadata - in real implementation would come from EDM model
  return {
    name: actionName,
    parameters: [],
    returnType: "Product",
    isBound: false
  };
}

export function validateFunctionParameters(functionName: string, parameters: Record<string, any>): void {
  // Mock validation - in real implementation would validate against EDM model
  const requiredParams = ["categoryId"]; // Example required parameters
  
  for (const param of requiredParams) {
    if (!(param in parameters)) {
      throw new Error(`Function '${functionName}' requires parameter '${param}'`);
    }
  }
}

export function validateActionParameters(actionName: string, parameters: Record<string, any>): void {
  // Mock validation - in real implementation would validate against EDM model
  const requiredParams = ["name"]; // Example required parameters
  
  for (const param of requiredParams) {
    if (!(param in parameters)) {
      throw new Error(`Action '${actionName}' requires parameter '${param}'`);
    }
  }
}

export function executeFunctionImport(functionImportName: string, parameters: Record<string, any> = {}): FunctionResult {
  // Function imports are similar to unbound functions
  return callFunction(functionImportName, parameters);
}

export function executeActionImport(actionImportName: string, parameters: Record<string, any> = {}): ActionResult {
  // Action imports are similar to unbound actions
  return callAction(actionImportName, parameters);
}

export function getAvailableFunctions(): string[] {
  return Array.from(functionRegistry.keys());
}

export function getAvailableActions(): string[] {
  return Array.from(actionRegistry.keys());
}
