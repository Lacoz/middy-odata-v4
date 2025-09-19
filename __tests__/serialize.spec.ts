import { describe, it, expect } from "vitest";
import {
  serializeCollection,
  serializeEntityWithContext,
  buildEntitySetContext,
  buildSingleEntityContext,
} from "../src/core/serialize";
import { PRODUCTS } from "./fixtures/data";

describe("Serialization and response shape", () => {
  describe("Collection responses", () => {
    it("serializes basic collection without count or nextLink", () => {
      const result = serializeCollection(
        "https://api.example.com/odata/$metadata#Products",
        PRODUCTS
      );
      
      expect(result).toEqual({
        "@odata.context": "https://api.example.com/odata/$metadata#Products",
        value: PRODUCTS,
      });
    });

    it("serializes collection with count", () => {
      const result = serializeCollection(
        "https://api.example.com/odata/$metadata#Products",
        PRODUCTS,
        3
      );
      
      expect(result).toEqual({
        "@odata.context": "https://api.example.com/odata/$metadata#Products",
        value: PRODUCTS,
        "@odata.count": 3,
      });
    });

    it("serializes collection with nextLink", () => {
      const result = serializeCollection(
        "https://api.example.com/odata/$metadata#Products",
        PRODUCTS,
        undefined,
        "https://api.example.com/odata/Products?$skip=3"
      );
      
      expect(result).toEqual({
        "@odata.context": "https://api.example.com/odata/$metadata#Products",
        value: PRODUCTS,
        "@odata.nextLink": "https://api.example.com/odata/Products?$skip=3",
      });
    });

    it("serializes collection with both count and nextLink", () => {
      const result = serializeCollection(
        "https://api.example.com/odata/$metadata#Products",
        PRODUCTS,
        10,
        "https://api.example.com/odata/Products?$skip=3"
      );
      
      expect(result).toEqual({
        "@odata.context": "https://api.example.com/odata/$metadata#Products",
        value: PRODUCTS,
        "@odata.count": 10,
        "@odata.nextLink": "https://api.example.com/odata/Products?$skip=3",
      });
    });

    it("handles empty collection", () => {
      const result = serializeCollection(
        "https://api.example.com/odata/$metadata#Products",
        []
      );
      
      expect(result).toEqual({
        "@odata.context": "https://api.example.com/odata/$metadata#Products",
        value: [],
      });
    });
  });

  describe("Single entity responses", () => {
    it("should serialize single entity with @odata.context", () => {
      const context = "https://api.example.com/odata/$metadata#Products/$entity";
      const product = PRODUCTS[0];
      const serialized = serializeEntityWithContext(context, product);

      expect(serialized).toEqual({
        "@odata.context": context,
        ...product,
      });
      expect(serialized).not.toBe(product);
    });
  });

  describe("@odata.context generation", () => {
    it("should generate correct context URL for entity set", () => {
      const context = buildEntitySetContext("https://api.example.com/odata/", "Products");
      expect(context).toBe("https://api.example.com/odata/$metadata#Products");
    });

    it("should generate correct context URL for single entity", () => {
      const context = buildSingleEntityContext("https://api.example.com/odata", "Products(1)");
      expect(context).toBe("https://api.example.com/odata/$metadata#Products(1)/$entity");
    });
  });
});
