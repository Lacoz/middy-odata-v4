import { describe, it, expect } from "vitest";
import { PRODUCTS, CATEGORIES, USERS } from "./fixtures/data";
import { 
  createEntity, 
  readEntity, 
  updateEntity, 
  deleteEntity, 
  validateEntity, 
  generateETag, 
  validateETag,
  handleBatchOperations,
  createEntityWithValidation,
  deepInsert,
  deepUpdate,
  partialUpdate,
  conditionalRead,
  conditionalUpdate,
  conditionalDelete,
  cascadeDelete,
  restrictedDelete
} from "../src/core/crud-operations";

describe("OData v4.01 CRUD Operations", () => {
  describe("Create Operations", () => {
    it("should create new entity", () => {
      const newProduct = { name: "New Product", price: 25, categoryId: 1 };
      const result = createEntity(PRODUCTS, newProduct);
      expect(result).toHaveProperty("id");
      expect(result.name).toBe("New Product");
      expect(result.price).toBe(25);
    });

    it("should create entity with navigation properties", () => {
      const newProduct = { 
        name: "New Product", 
        price: 25, 
        categoryId: 1
      };
      const result = createEntity(PRODUCTS, newProduct);
      expect(result).toHaveProperty("categoryId");
      expect(result.categoryId).toBe(1);
    });

    it("should create entity with complex type properties", () => {
      const newUser = {
        name: "John Doe",
        email: "john@example.com",
        address: {
          street: "123 Main St",
          city: "New York",
          zipCode: "10001"
        }
      };
      const result = createEntity(USERS, newUser);
      expect(result).toHaveProperty("address");
      expect((result as any).address.city).toBe("New York");
    });

    it("should create entity with collection properties", () => {
      const newUser = {
        name: "John Doe",
        email: "john@example.com",
        tags: ["admin", "user"]
      };
      const result = createEntity(USERS, newUser, "User");
      expect(result).toHaveProperty("tags");
      expect(Array.isArray((result as any).tags)).toBe(true);
      expect((result as any).tags).toContain("admin");
    });

    it("should validate required properties on create", () => {
      const incompleteProduct = { price: 25 }; // Missing required 'name'
      expect(() => createEntityWithValidation(PRODUCTS, incompleteProduct, "Product"))
        .toThrow("Validation failed: Name is required for Product");
    });

    it("should validate property types on create", () => {
      const invalidProduct = { name: "Product", price: "invalid" }; // Wrong type for price
      const validation = validateEntity(invalidProduct, "Product");
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Price must be a number");
    });

    it("should handle deep insert", () => {
      const newProduct = {
        name: "New Product",
        price: 25,
        category: {
          name: "New Category",
          description: "A new category"
        }
      };
      const result = deepInsert(PRODUCTS, newProduct, "Product");
      expect(result).toHaveProperty("category");
      expect((result as any).category).toHaveProperty("name");
    });

    it("should generate ETag for created entity", () => {
      const newProduct = { name: "New Product", price: 25, categoryId: 1 };
      const result = createEntity(PRODUCTS, newProduct, "Product");
      const etag = generateETag(result);
      expect(etag).toMatch(/^".*"$/);
    });
  });

  describe("Read Operations", () => {
    it("should read single entity by key", () => {
      const result = readEntity(PRODUCTS, 1);
      expect(result).toHaveProperty("id");
      expect((result as any).id).toBe(1);
      expect((result as any).name).toBe("A");
    });

    it("should read entity with navigation properties", () => {
      const result = readEntity(PRODUCTS, 1);
      expect(result).toHaveProperty("id");
      expect((result as any).id).toBe(1);
    });

    it("should read entity with selected properties", () => {
      const result = readEntity(PRODUCTS, 1);
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("price");
      expect((result as any).name).toBe("A");
    });

    it("should read entity with complex type properties", () => {
      const result = readEntity(USERS, 1, "User");
      expect(result).toHaveProperty("address");
      expect((result as any).address).toHaveProperty("city");
    });

    it("should read entity with collection properties", () => {
      const result = readEntity(USERS, 1, "User");
      expect(result).toHaveProperty("tags");
      expect(Array.isArray((result as any).tags)).toBe(true);
    });

    it("should handle composite keys", () => {
      // Mock composite key read
      const result = { orderId: 1, productId: 1, quantity: 2 };
      expect(result).toHaveProperty("orderId");
      expect(result).toHaveProperty("productId");
    });

    it("should return 404 for non-existent entity", () => {
      const result = readEntity(PRODUCTS, 999, "Product");
      expect(result).toBeNull();
    });

    it("should include ETag in response", () => {
      const result = readEntity(PRODUCTS, 1, "Product");
      const etag = generateETag(result!);
      expect(etag).toMatch(/^".*"$/);
    });

    it("should handle conditional read with ETag", () => {
      const result = conditionalRead(PRODUCTS, 1, "Product", { ifMatch: '"etag-value"' });
      expect(result).toBeNull(); // Should return null due to ETag mismatch
    });

    it("should handle conditional read with If-None-Match", () => {
      const result = conditionalRead(PRODUCTS, 1, "Product", { ifNoneMatch: '"etag-value"' });
      expect(result).not.toBeNull(); // Should return entity when ETag doesn't match
    });
  });

  describe("Update Operations", () => {
    it("should update entity properties", () => {
      const updates = { name: "Updated Product", price: 30 };
      const result = updateEntity(PRODUCTS, 1, updates);
      expect((result as any).name).toBe("Updated Product");
      expect((result as any).price).toBe(30);
    });

    it("should update navigation properties", () => {
      const products = PRODUCTS.map(product => ({ ...product }));
      const updates = { categoryId: 2 };
      const result = updateEntity(products, 1, updates);
      expect((result as any)?.categoryId).toBe(2);
    });

    it("should update complex type properties", () => {
      const updates = { 
        address: { 
          street: "456 Oak Ave", 
          city: "Los Angeles", 
          zipCode: "90210" 
        } 
      };
      const result = updateEntity(USERS, 1, updates, "User");
      expect((result as any)?.address.city).toBe("Los Angeles");
    });

    it("should update collection properties", () => {
      const updates = { tags: ["admin", "premium", "user"] };
      const result = updateEntity(USERS, 1, updates, "User");
      expect((result as any)?.tags).toContain("premium");
    });

    it("should validate property types on update", () => {
      const invalidUpdates = { price: "invalid" };
      const validation = validateEntity(invalidUpdates, "Product");
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Price must be a number");
    });

    it("should handle partial updates", () => {
      const updates = { price: 35 };
      const result = partialUpdate(PRODUCTS, 2, updates, "Product");
      expect((result as any)?.name).toBe("B"); // Original name preserved
      expect((result as any)?.price).toBe(35); // Updated price
    });

    it("should handle deep update", () => {
      const updates = {
        name: "Updated Product",
        category: {
          name: "Updated Category"
        }
      };
      const result = deepUpdate(PRODUCTS, 1, updates, "Product");
      expect((result as any)?.category.name).toBe("Updated Category");
    });

    it("should update ETag after modification", () => {
      // Test that ETag generation works with counter
      const entity1 = { id: 1, name: "Test" };
      const entity2 = { id: 2, name: "Test" };
      const etag1 = generateETag(entity1);
      const etag2 = generateETag(entity2);
      expect(etag1).not.toBe(etag2);
    });

    it("should handle optimistic concurrency with ETag", () => {
      const updates = { name: "Updated Product" };
      const result = conditionalUpdate(PRODUCTS, 1, updates, "Product", { ifMatch: '"old-etag"' });
      expect(result).toBeNull(); // Should return null due to ETag mismatch
    });

    it("should handle conditional update with If-None-Match", () => {
      const updates = { name: "Updated Product" };
      const result = conditionalUpdate(PRODUCTS, 1, updates, "Product", { ifNoneMatch: '"old-etag"' });
      expect((result as any)?.name).toBe("Updated Product");
    });
  });

  describe("Delete Operations", () => {
    it("should delete entity by key", () => {
      const result = deleteEntity(PRODUCTS, 1);
      expect(result).toBe(true);
      expect(readEntity(PRODUCTS, 1)).toBeNull();
    });

    it("should handle composite keys in delete", () => {
      const orders = [
        { id: "1:1", total: 100 },
        { id: "1:2", total: 150 }
      ];
      const result = deleteEntity(orders, "1:2");
      expect(result).toBe(true);
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe("1:1");
    });

    it("should return 404 for non-existent entity", () => {
      const result = deleteEntity(PRODUCTS, 999, "Product");
      expect(result).toBe(false);
    });

    it("should handle optimistic concurrency with ETag", () => {
      const result = conditionalDelete(PRODUCTS, 1, "Product", { ifMatch: '"old-etag"' });
      expect(result).toBe(false); // Should return false due to ETag mismatch
    });

    it("should handle conditional delete with If-None-Match", () => {
      const result = conditionalDelete(PRODUCTS, 3, "Product", { ifNoneMatch: '"old-etag"' });
      expect(result).toBe(true);
    });

    it("should handle cascade delete", () => {
      const categories = [...CATEGORIES];
      const result = cascadeDelete(categories, 1, "Category");
      expect(result).toBe(true);
      expect(categories.find(c => c.id === 1)).toBeUndefined();
    });

    it("should handle restricted delete", () => {
      const categories = [...CATEGORIES];
      const result = restrictedDelete(categories, 2, "Category");
      expect(result).toBe(true);
      expect(categories.find(c => c.id === 2)).toBeUndefined();
    });
  });

  describe("Batch Operations", () => {
    it("should handle batch create operations", () => {
      const operations = [
        { method: "POST" as const, url: "/Products", body: { name: "Product 1", price: 10 } },
        { method: "POST" as const, url: "/Products", body: { name: "Product 2", price: 20 } }
      ];
      const results = handleBatchOperations(operations, { Products: PRODUCTS });
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it("should handle batch update operations", () => {
      const operations = [
        { method: "PATCH" as const, url: "/Products(1)", body: { name: "Updated 1" } },
        { method: "PUT" as const, url: "/Products(2)", body: { name: "Updated 2" } }
      ];
      const results = handleBatchOperations(operations, { Products: PRODUCTS });
      expect(results).toHaveLength(2);
      results.forEach(res => expect(res.success).toBe(true));
    });

    it("should handle batch delete operations", () => {
      const operations = [
        { method: "DELETE" as const, url: "/Products(1)" },
        { method: "DELETE" as const, url: "/Products(2)" }
      ];
      const results = handleBatchOperations(operations, { Products: PRODUCTS });
      expect(results).toHaveLength(2);
      expect(results.every(res => res.success)).toBe(true);
    });

    it("should handle mixed batch operations", () => {
      const operations = [
        { method: "POST" as const, url: "/Products", body: { name: "New Product", price: 30 } },
        { method: "PATCH" as const, url: "/Products(1)", body: { name: "Updated Product" } },
        { method: "DELETE" as const, url: "/Products(2)" }
      ];
      const results = handleBatchOperations(operations, { Products: PRODUCTS });
      expect(results).toHaveLength(3);
      expect(results.every(res => res.success)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors", () => {
      const invalidProduct = { price: "invalid" };
      const validation = validateEntity(invalidProduct, "Product");
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Price must be a number");
    });

    it("should handle constraint violations", () => {
      const products = PRODUCTS.map(product => ({ ...product }));
      const duplicateName = createEntity(products, { name: "A", price: 15 });
      expect(duplicateName.name).toBe("A");
    });

    it("should handle foreign key violations", () => {
      const products = PRODUCTS.map(product => ({ ...product }));
      const product = createEntity(products, { name: "Loose Product", price: 10, categoryId: 999 });
      expect(product.categoryId).toBe(999);
    });

    it("should handle concurrent modification errors", () => {
      const products = PRODUCTS.map(product => ({ ...product }));
      const updates = { name: "Updated Product" };
      const result = conditionalUpdate(products, 1, updates, "Product", { ifMatch: '"stale-etag"' });
      expect(result).toBeNull();
    });

    it("should handle permission errors", () => {
      const products = PRODUCTS.map(product => ({ ...product }));
      const result = conditionalDelete(products, 1, "Product", { ifMatch: '"stale-etag"' });
      expect(result).toBe(false);
    });
  });
});
