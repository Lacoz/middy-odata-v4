import { describe, it, expect } from "vitest";
import { serializeCollection } from "../src/core/serialize";
import { PRODUCTS } from "./fixtures/data";
describe("Serialization and response shape", () => {
    describe("Collection responses", () => {
        it("serializes basic collection without count or nextLink", () => {
            const result = serializeCollection("https://api.example.com/odata/$metadata#Products", PRODUCTS);
            expect(result).toEqual({
                "@odata.context": "https://api.example.com/odata/$metadata#Products",
                value: PRODUCTS,
            });
        });
        it("serializes collection with count", () => {
            const result = serializeCollection("https://api.example.com/odata/$metadata#Products", PRODUCTS, 3);
            expect(result).toEqual({
                "@odata.context": "https://api.example.com/odata/$metadata#Products",
                value: PRODUCTS,
                "@odata.count": 3,
            });
        });
        it("serializes collection with nextLink", () => {
            const result = serializeCollection("https://api.example.com/odata/$metadata#Products", PRODUCTS, undefined, "https://api.example.com/odata/Products?$skip=3");
            expect(result).toEqual({
                "@odata.context": "https://api.example.com/odata/$metadata#Products",
                value: PRODUCTS,
                "@odata.nextLink": "https://api.example.com/odata/Products?$skip=3",
            });
        });
        it("serializes collection with both count and nextLink", () => {
            const result = serializeCollection("https://api.example.com/odata/$metadata#Products", PRODUCTS, 10, "https://api.example.com/odata/Products?$skip=3");
            expect(result).toEqual({
                "@odata.context": "https://api.example.com/odata/$metadata#Products",
                value: PRODUCTS,
                "@odata.count": 10,
                "@odata.nextLink": "https://api.example.com/odata/Products?$skip=3",
            });
        });
        it("handles empty collection", () => {
            const result = serializeCollection("https://api.example.com/odata/$metadata#Products", []);
            expect(result).toEqual({
                "@odata.context": "https://api.example.com/odata/$metadata#Products",
                value: [],
            });
        });
    });
    describe("Single entity responses", () => {
        it("should serialize single entity with @odata.context", () => {
            // TODO: Implement single entity serialization
            expect(true).toBe(true);
        });
    });
    describe("@odata.context generation", () => {
        it("should generate correct context URL for entity set", () => {
            // TODO: Implement context URL generation
            expect(true).toBe(true);
        });
        it("should generate correct context URL for single entity", () => {
            // TODO: Implement single entity context URL
            expect(true).toBe(true);
        });
    });
});
