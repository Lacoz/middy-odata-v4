import { describe, it, expect } from "vitest";
import { callFunction, callAction, callBoundFunction, callBoundAction, validateFunctionParameters, executeFunctionImport, executeActionImport } from "../src/core/functions-actions";
describe("OData v4.01 Functions and Actions", () => {
    describe("Functions", () => {
        it("should call bound function on entity", () => {
            const result = callBoundFunction("1", "getRelatedProducts", { maxCount: 5 });
            expect(result).toHaveProperty("value");
            expect(Array.isArray(result.value)).toBe(true);
        });
        it("should call unbound function", () => {
            const result = callFunction("getProductsByCategory", { categoryId: 1, minPrice: 10 });
            expect(result).toHaveProperty("value");
            expect(Array.isArray(result.value)).toBe(true);
        });
        it("should call function with primitive parameters", () => {
            const result = callFunction("calculatePrice", { basePrice: 100, discount: 0.1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toBe(90);
        });
        it("should call function with complex type parameters", () => {
            const result = callFunction("calculateShipping", {
                address: {
                    city: "New York",
                    zipCode: "10001"
                }
            });
            expect(result).toHaveProperty("value");
            expect(result.value).toBe(5.99);
        });
        it("should call function with collection parameters", () => {
            const result = callFunction("calculateBulkDiscount", {
                productIds: [1, 2, 3],
                quantities: [2, 1, 3]
            });
            expect(result).toHaveProperty("value");
            expect(result.value).toBe(0.10); // 6 total items = 10% discount
        });
        it("should call function with entity parameters", () => {
            const result = callFunction("compareProducts", {
                product1: { id: 1 },
                product2: { id: 2 }
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with navigation property parameters", () => {
            const result = callFunction("getCategoryProducts", {
                category: { id: 1 }
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with optional parameters", () => {
            const result = callFunction("searchProducts", {
                query: "phone",
                limit: 10 // Optional parameter
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with default parameter values", () => {
            const result = callFunction("getProductsByCategory", {
                categoryId: 1
                // minPrice uses default value
            });
            expect(result).toHaveProperty("value");
            expect(Array.isArray(result.value)).toBe(true);
        });
        it("should call function with nullable parameters", () => {
            const result = callFunction("searchProducts", {
                query: "phone",
                categoryId: null // Nullable parameter
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with enum parameters", () => {
            const result = callFunction("getProductsByStatus", {
                status: "Active" // Enum value
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with date/time parameters", () => {
            const result = callFunction("getProductsCreatedAfter", {
                date: "2023-01-01T00:00:00Z"
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with duration parameters", () => {
            const result = callFunction("getProductsWithWarranty", {
                warrantyPeriod: "P2Y" // 2 years
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with binary parameters", () => {
            const result = callFunction("uploadImage", {
                imageData: "base64encodeddata"
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with geography parameters", () => {
            const result = callFunction("findNearbyStores", {
                location: "POINT(-74.006 40.7128)" // New York coordinates
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with geometry parameters", () => {
            const result = callFunction("calculateArea", {
                polygon: "POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))"
            });
            expect(result).toHaveProperty("value");
        });
        it("should call function with collection return type", () => {
            const result = callFunction("getAllCategories");
            expect(result).toHaveProperty("value");
            expect(Array.isArray(result.value)).toBe(true);
        });
        it("should call function with entity return type", () => {
            const result = callFunction("getProductById", { id: 1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toHaveProperty("id");
        });
        it("should call function with complex type return type", () => {
            const result = callFunction("getProductSummary", { id: 1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toHaveProperty("name");
            expect(result.value).toHaveProperty("price");
        });
        it("should call function with primitive return type", () => {
            const result = callFunction("getProductCount");
            expect(result).toHaveProperty("value");
            expect(typeof result.value).toBe("number");
        });
        it("should call function with nullable return type", () => {
            const result = callFunction("getProductDescription", { id: 1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toBeNull(); // No description available
        });
        it("should call function with enum return type", () => {
            const result = callFunction("getProductStatus", { id: 1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toBe("Active");
        });
    });
    describe("Actions", () => {
        it("should call bound action on entity", () => {
            const result = callBoundAction("1", "updateProductPrice", { newPrice: 25 });
            expect(result).toHaveProperty("value");
            expect(result.value.price).toBe(25);
        });
        it("should call unbound action", () => {
            const result = callAction("bulkUpdateProducts", {
                updates: [
                    { id: 1, newPrice: 20 },
                    { id: 2, newPrice: 30 }
                ]
            });
            expect(result).toHaveProperty("value");
            expect(Array.isArray(result.value)).toBe(true);
        });
        it("should call action with primitive parameters", () => {
            const result = callAction("updateProductPrice", {
                productId: 1,
                newPrice: 25.99
            });
            expect(result).toHaveProperty("value");
            expect(result.value.price).toBe(25.99);
        });
        it("should call action with complex type parameters", () => {
            const result = callAction("updateProductAddress", {
                productId: 1,
                address: {
                    street: "123 Main St",
                    city: "New York"
                }
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with collection parameters", () => {
            const result = callAction("sendNotification", {
                message: "Product updated",
                recipients: ["user1", "user2"]
            });
            expect(result).toHaveProperty("value");
            expect(result.value.recipients).toBe(2);
        });
        it("should call action with entity parameters", () => {
            const result = callAction("transferProduct", {
                productId: 1,
                newCategory: { id: 2 }
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with navigation property parameters", () => {
            const result = callAction("moveToCategory", {
                productId: 1,
                category: { id: 2 }
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with optional parameters", () => {
            const result = callAction("updateProduct", {
                productId: 1,
                name: "Updated Product",
                description: "New description" // Optional parameter
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with default parameter values", () => {
            const result = callAction("createProduct", {
                name: "New Product"
                // price parameter has default value of 0
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with nullable parameters", () => {
            const result = callAction("updateProduct", {
                productId: 1,
                description: null // Nullable parameter
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with enum parameters", () => {
            const result = callAction("setProductStatus", {
                productId: 1,
                status: "Discontinued" // Enum value
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with date/time parameters", () => {
            const result = callAction("scheduleProduct", {
                productId: 1,
                releaseDate: "2024-01-01T00:00:00Z"
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with duration parameters", () => {
            const result = callAction("setWarrantyPeriod", {
                productId: 1,
                warrantyPeriod: "P1Y" // 1 year
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with binary parameters", () => {
            const result = callAction("uploadProductImage", {
                productId: 1,
                imageData: "base64encodeddata"
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with geography parameters", () => {
            const result = callAction("setProductLocation", {
                productId: 1,
                location: "POINT(-74.006 40.7128)" // New York coordinates
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with geometry parameters", () => {
            const result = callAction("setProductArea", {
                productId: 1,
                area: "POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))"
            });
            expect(result).toHaveProperty("value");
        });
        it("should call action with collection return type", () => {
            const result = callAction("getProductHistory", { productId: 1 });
            expect(result).toHaveProperty("value");
            expect(Array.isArray(result.value)).toBe(true);
        });
        it("should call action with entity return type", () => {
            const result = callAction("cloneProduct", { productId: 1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toHaveProperty("id");
        });
        it("should call action with complex type return type", () => {
            const result = callAction("getProductReport", { productId: 1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toHaveProperty("summary");
        });
        it("should call action with primitive return type", () => {
            const result = callAction("calculateTotal", { productIds: [1, 2, 3] });
            expect(result).toHaveProperty("value");
            expect(typeof result.value).toBe("number");
        });
        it("should call action with nullable return type", () => {
            const result = callAction("getProductDiscount", { productId: 1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toBeNull(); // No discount available
        });
        it("should call action with enum return type", () => {
            const result = callAction("getProductStatus", { productId: 1 });
            expect(result).toHaveProperty("value");
            expect(result.value).toBe("Active");
        });
        it("should call action with no return type", () => {
            const result = callAction("deleteProduct", { productId: 1 });
            expect(result).not.toHaveProperty("value");
        });
    });
    describe("Function and Action Import", () => {
        it("should call function import", () => {
            const result = executeFunctionImport("getProductsByCategory", { categoryId: 1 });
            expect(result).toHaveProperty("value");
            expect(Array.isArray(result.value)).toBe(true);
        });
        it("should call action import", () => {
            const result = executeActionImport("BulkUpdateProducts", {
                productIds: [1, 2, 3],
                updates: { status: "Active" }
            });
            expect(result).toHaveProperty("value");
        });
        it("should handle function import with no parameters", () => {
            const result = executeFunctionImport("GetAllProducts");
            expect(result).toHaveProperty("value");
        });
        it("should handle action import with no parameters", () => {
            const result = executeActionImport("RefreshCache");
            expect(result).not.toHaveProperty("value");
        });
    });
    describe("Error Handling", () => {
        it("should handle invalid function name", () => {
            expect(() => callFunction("InvalidFunction", {}))
                .toThrow("Function 'InvalidFunction' not found");
        });
        it("should handle invalid action name", () => {
            expect(() => callAction("InvalidAction", {}))
                .toThrow("Action 'InvalidAction' not found");
        });
        it("should handle missing required parameters", () => {
            expect(() => validateFunctionParameters("getProductsByCategory", {}))
                .toThrow("Function 'getProductsByCategory' requires parameter 'categoryId'");
        });
        it("should handle invalid parameter types", () => {
            expect(() => callFunction("getProductById", { id: "invalid" }))
                .toThrow("Parameter 'id' must be of type Edm.Int32");
        });
        it("should handle invalid parameter values", () => {
            expect(() => callFunction("getProductById", { id: -1 }))
                .toThrow("Parameter 'id' must be a positive integer");
        });
        it("should handle function execution errors", () => {
            expect(() => callFunction("divideByZero", { a: 10, b: 0 }))
                .toThrow("Division by zero");
        });
        it("should handle action execution errors", () => {
            expect(() => callAction("updateProduct", { productId: 999, name: "New Name" }))
                .toThrow("Product with id 999 not found");
        });
        it("should handle permission errors", () => {
            expect(() => callAction("deleteAllProducts", {}))
                .toThrow("Insufficient permissions to perform this action");
        });
        it("should handle timeout errors", () => {
            expect(() => callFunction("longRunningFunction", {}))
                .toThrow("Function execution timed out");
        });
    });
});
