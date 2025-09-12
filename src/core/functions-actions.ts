import type { ODataEntity } from "./types";

export interface FunctionParameter {
  name: string;
  type: string;
  value: any;
}

export interface FunctionCall {
  name: string;
  parameters?: FunctionParameter[];
  boundTo?: string;
}

export interface ActionParameter {
  name: string;
  type: string;
  value: any;
}

export interface ActionCall {
  name: string;
  parameters?: ActionParameter[];
  boundTo?: string;
}

export interface FunctionResult {
  value: any;
  "@odata.context"?: string;
}

export interface ActionResult {
  value?: any;
  "@odata.context"?: string;
}

// Function registry for unbound functions
const functionRegistry = new Map<string, Function>();

// Action registry for unbound actions
const actionRegistry = new Map<string, Function>();

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

functionRegistry.set("calculateBulkDiscount", (params: any) => {
  const { productIds, quantities } = params;
  // Mock bulk discount calculation
  const totalItems = quantities.reduce((sum: number, qty: number) => sum + qty, 0);
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

actionRegistry.set("sendNotification", (params: any) => {
  const { message, recipients } = params;
  return {
    value: {
      messageId: Date.now(),
      status: "sent",
      recipients: recipients.length,
      sentAt: new Date().toISOString()
    }
  };
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

export function registerFunction(name: string, implementation: Function): void {
  functionRegistry.set(name, implementation);
}

export function registerAction(name: string, implementation: Function): void {
  actionRegistry.set(name, implementation);
}

export function getFunctionMetadata(functionName: string): any {
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

export function getActionMetadata(actionName: string): any {
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
