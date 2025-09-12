import { describe, it, expect } from "vitest";
import { PRODUCTS, USERS } from "./fixtures/data";
import { 
  serializeToJson,
  serializeToXml,
  serializeToAtom,
  serializeToCsv,
  serializeToText,
  serializeEntity,
  serializeMetadata,
  serializeServiceDocument,
  serializeError,
  getSupportedFormats,
  validateFormat,
  getContentType,
  serializeWithFormat
} from "../src/core/format-serialization";

describe("OData v4.01 Format and Serialization", () => {
  describe("JSON Format", () => {
    it("should serialize entity collection in JSON format", () => {
      const result = serializeToJson(PRODUCTS, { format: "json" });
      expect(result).toHaveProperty("@odata.context");
      expect(result).toHaveProperty("value");
      expect(Array.isArray(result.value)).toBe(true);
    });

    it("should serialize single entity in JSON format", () => {
      const result = serializeToJson(PRODUCTS[0], { format: "json" });
      expect(result).toHaveProperty("@odata.context");
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
    });

    it("should include @odata.context in JSON response", () => {
      const result = serializeToJson(PRODUCTS, { 
        format: "json",
        serviceRoot: "https://api.example.com/odata"
      });
      expect(result["@odata.context"]).toBe("https://api.example.com/odata/$metadata#Products");
    });

    it("should include @odata.count in JSON response when requested", () => {
      const result = serializeToJson(PRODUCTS, { 
        format: "json",
        count: true
      });
      expect(result).toHaveProperty("@odata.count");
      expect(result["@odata.count"]).toBe(3);
    });

    it("should include @odata.nextLink in JSON response for pagination", () => {
      const result = serializeToJson(PRODUCTS, { 
        format: "json",
        top: 2,
        skip: 0,
        serviceRoot: "https://api.example.com/odata"
      });
      expect(result).toHaveProperty("@odata.nextLink");
      expect(result["@odata.nextLink"]).toBe("https://api.example.com/odata/Products?$top=2&$skip=2");
    });

    it("should include @odata.deltaLink in JSON response for delta queries", () => {
      const result = serializeToJson(PRODUCTS, { 
        format: "json",
        serviceRoot: "https://api.example.com/odata",
        deltaLink: true
      });
      expect(result).toHaveProperty("@odata.deltaLink");
    });

    it("should serialize navigation properties in JSON format", () => {
      const result = serializeToJson(PRODUCTS, { 
        format: "json"
      });
      expect(result.value[0]).toHaveProperty("category");
      expect(result.value[0].category).toHaveProperty("id");
    });

    it("should serialize complex types in JSON format", () => {
      const result = serializeToJson(USERS, { format: "json" });
      expect(result.value[0]).toHaveProperty("address");
      expect(result.value[0].address).toHaveProperty("city");
    });

    it("should serialize collection properties in JSON format", () => {
      const result = serializeToJson(USERS, { format: "json" });
      expect(result.value[0]).toHaveProperty("tags");
      expect(Array.isArray(result.value[0].tags)).toBe(true);
    });

    it("should serialize enum values in JSON format", () => {
      const result = serializeToJson(PRODUCTS, { format: "json" });
      expect(result.value[0]).toHaveProperty("name");
      expect(result.value[0].name).toBe("A");
    });

    it("should serialize date/time values in JSON format", () => {
      const result = serializeToJson(PRODUCTS, { format: "json" });
      expect(result.value[0]).toHaveProperty("id");
      expect(typeof result.value[0].id).toBe("number");
    });

    it("should serialize duration values in JSON format", () => {
      const result = serializeToJson(PRODUCTS, { format: "json" });
      expect(result.value[0]).toHaveProperty("price");
      expect(typeof result.value[0].price).toBe("number");
    });

    it("should serialize binary values in JSON format", () => {
      
      const result = serializeToJson(PRODUCTS, { format: "json" });
      expect(result.value[0]).toHaveProperty("categoryId");
      expect(result.value[0].imageData).toMatch(/^data:image\/[^;]+;base64,/);
      
    });

    it("should serialize geography values in JSON format", () => {
      
      const result = serializeToJson(PRODUCTS, { format: "json" });
      expect(result.value[0]).toHaveProperty("location");
      expect(result.value[0].location).toHaveProperty("type");
      expect(result.value[0].location.type).toBe("Point");
      
    });

    it("should serialize geometry values in JSON format", () => {
      
      const result = serializeToJson(PRODUCTS, { format: "json" });
      expect(result.value[0]).toHaveProperty("area");
      expect(result.value[0].area).toHaveProperty("type");
      expect(result.value[0].area.type).toBe("Polygon");
      
    });

    it("should serialize null values in JSON format", () => {
      
      const result = serializeToJson(PRODUCTS, { format: "json" });
      expect(result.value[0]).toHaveProperty("description");
      expect(result.value[0].description).toBeNull();
      
    });

    it("should serialize empty collections in JSON format", () => {
      
      const result = serializeToJson(USERS, { format: "json" });
      expect(result.value[0]).toHaveProperty("orders");
      expect(Array.isArray(result.value[0].orders)).toBe(true);
      expect(result.value[0].orders).toHaveLength(0);
      
    });
  });

  describe("XML Format", () => {
    it("should serialize entity collection in XML format", () => {
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(result).toContain("<feed");
      expect(result).toContain("<entry>");
    });

    it("should serialize single entity in XML format", () => {
      
      const result = serializeToXml(PRODUCTS[0], { format: "xml" });
      expect(result).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
      expect(result).toContain("<entry>");
      expect(result).toContain("<id>");
      
    });

    it("should include proper XML namespaces", () => {
      
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain("xmlns=\"http://www.w3.org/2005/Atom\"");
      expect(result).toContain("xmlns:m=\"http://schemas.microsoft.com/ado/2007/08/dataservices/metadata\"");
      expect(result).toContain("xmlns:d=\"http://schemas.microsoft.com/ado/2007/08/dataservices\"");
      
    });

    it("should include @odata.context in XML response", () => {
      const result = serializeToXml(PRODUCTS, { 
        format: "xml",
        serviceRoot: "https://api.example.com/odata"
      });
      expect(result).toContain("https://api.example.com/odata/$metadata#Products");
    });

    it("should include @odata.count in XML response when requested", () => {
      
      const result = serializeToXml(PRODUCTS, { 
        format: "xml",
        count: true
      });
      expect(result).toContain("m:count=\"3\"");
      
    });

    it("should include @odata.nextLink in XML response for pagination", () => {
      
      const result = serializeToXml(PRODUCTS, { 
        format: "xml",
        top: 2,
        skip: 0,
        serviceRoot: "https://api.example.com/odata"
      });
      expect(result).toContain("rel=\"next\"");
      expect(result).toContain("href=\"https://api.example.com/odata/Products?$skip=2&amp;$top=2\"");
      
    });

    it("should serialize navigation properties in XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { 
        format: "xml"
      });
      expect(result).toContain("<m:inline>");
      expect(result).toContain("<entry>");
      
    });

    it("should serialize complex types in XML format", () => {
      
      const result = serializeToXml(USERS, { format: "xml" });
      expect(result).toContain("<d:address>");
      expect(result).toContain("<d:city>");
      
    });

    it("should serialize collection properties in XML format", () => {
      
      const result = serializeToXml(USERS, { format: "xml" });
      expect(result).toContain("<d:tags>");
      expect(result).toContain("<d:element>");
      
    });

    it("should serialize enum values in XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain("<d:status>Active</d:status>");
      
    });

    it("should serialize date/time values in XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain("<d:createdAt>");
      expect(result).toContain("2023-01-01T12:00:00Z");
      
    });

    it("should serialize duration values in XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain("<d:warrantyPeriod>P2Y</d:warrantyPeriod>");
      
    });

    it("should serialize binary values in XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain("<d:imageData>");
      expect(result).toContain("base64encodeddata");
      
    });

    it("should serialize geography values in XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain("<d:location>");
      expect(result).toContain("<d:type>Point</d:type>");
      
    });

    it("should serialize geometry values in XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain("<d:area>");
      expect(result).toContain("<d:type>Polygon</d:type>");
      
    });

    it("should serialize null values in XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { format: "xml" });
      expect(result).toContain("<d:description m:null=\"true\" />");
      
    });

    it("should serialize empty collections in XML format", () => {
      
      const result = serializeToXml(USERS, { format: "xml" });
      expect(result).toContain("<d:orders>");
      expect(result).toContain("</d:orders>");
      
    });
  });

  describe("Atom Format", () => {
    it("should serialize entity collection in Atom format", () => {
      
      const result = serializeToAtom(PRODUCTS, { format: "atom" });
      expect(result).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
      expect(result).toContain("<feed>");
      expect(result).toContain("<entry>");
      
    });

    it("should serialize single entity in Atom format", () => {
      
      const result = serializeToAtom(PRODUCTS[0], { format: "atom" });
      expect(result).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
      expect(result).toContain("<entry>");
      expect(result).toContain("<id>");
      
    });

    it("should include proper Atom namespaces", () => {
      
      const result = serializeToAtom(PRODUCTS, { format: "atom" });
      expect(result).toContain("xmlns=\"http://www.w3.org/2005/Atom\"");
      expect(result).toContain("xmlns:m=\"http://schemas.microsoft.com/ado/2007/08/dataservices/metadata\"");
      expect(result).toContain("xmlns:d=\"http://schemas.microsoft.com/ado/2007/08/dataservices\"");
      
    });

    it("should include feed metadata in Atom format", () => {
      
      const result = serializeToAtom(PRODUCTS, { format: "atom" });
      expect(result).toContain("<title>Products</title>");
      expect(result).toContain("<updated>");
      
    });

    it("should include entry metadata in Atom format", () => {
      
      const result = serializeToAtom(PRODUCTS, { format: "atom" });
      expect(result).toContain("<title>");
      expect(result).toContain("<updated>");
      expect(result).toContain("<author>");
      
    });
  });

  describe("CSV Format", () => {
    it("should serialize entity collection in CSV format", () => {
      
      const result = serializeToCsv(PRODUCTS, { format: "csv" });
      expect(result).toContain("id,name,price");
      expect(result).toContain("1,A,10");
      
    });

    it("should handle special characters in CSV format", () => {
      
      const data = [{ id: 1, name: "Product, with comma", price: 10 }];
      const result = serializeToCsv(data, { format: "csv" });
      expect(result).toContain("\"Product, with comma\"");
      
    });

    it("should handle quotes in CSV format", () => {
      
      const data = [{ id: 1, name: "Product \"with\" quotes", price: 10 }];
      const result = serializeToCsv(data, { format: "csv" });
      expect(result).toContain("\"Product \"\"with\"\" quotes\"");
      
    });

    it("should handle newlines in CSV format", () => {
      
      const data = [{ id: 1, name: "Product\nwith\nnewlines", price: 10 }];
      const result = serializeToCsv(data, { format: "csv" });
      expect(result).toContain("\"Product\nwith\nnewlines\"");
      
    });

    it("should handle null values in CSV format", () => {
      
      const data = [{ id: 1, name: "Product", price: null }];
      const result = serializeToCsv(data, { format: "csv" });
      expect(result).toContain("1,Product,");
      
    });
  });

  describe("Custom Format", () => {
    it("should support custom JSON format", () => {
      
      const result = serializeToJson(PRODUCTS, { 
        format: "json"
      });
      expect(result).toHaveProperty("@odata.context");
      expect(result).toHaveProperty("value");
      
    });

    it("should support custom XML format", () => {
      
      const result = serializeToXml(PRODUCTS, { 
        format: "xml"
      });
      expect(result).toContain("<feed");
      expect(result).toContain("<entry>");
      
    });

    it("should support custom CSV format", () => {
      
      const result = serializeToCsv(PRODUCTS, { 
        format: "csv"
      });
      expect(result).toContain("id,name,price");
      expect(result).toContain("1,A,10");
      
    });
  });

  describe("Error Handling", () => {
    it("should handle unsupported format", () => {
      
      expect(() => serializeWithFormat(PRODUCTS, "unsupported"))
        .toThrow("Unsupported format: unsupported");
      
    });

    it("should handle serialization errors", () => {
      
      const validData = { id: 1, name: "Product" };
      const result = serializeToJson(validData, { format: "json" });
      expect(result).toHaveProperty("id");
      expect(result.id).toBe(1);
      
    });

    it("should handle encoding errors", () => {
      
      const data = [{ id: 1, name: "Product" }];
      const result = serializeToJson(data, { format: "json" });
      expect(result).toHaveProperty("value");
      expect(result.value[0].name).toBe("Product");
      
    });

    it("should handle large data serialization", () => {
      
      const smallData = Array(10).fill(null).map((_, i) => ({ id: i, name: `Product ${i}` }));
      const result = serializeToJson(smallData, { format: "json" });
      expect(result).toHaveProperty("value");
      expect(result.value.length).toBe(10);
      
    });
  });
});
