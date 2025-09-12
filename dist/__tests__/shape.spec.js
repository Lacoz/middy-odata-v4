import { describe, it, expect } from "vitest";
import { applySelect, projectArray } from "../src/core/shape";
import { PRODUCTS } from "./fixtures/data";
describe("Data shaping: $select", () => {
    it("applies $select to single entity", () => {
        const product = PRODUCTS[0];
        const result = applySelect(product, ["id", "name"]);
        expect(result).toEqual({ id: 1, name: "A" });
    });
    it("returns all properties when no $select", () => {
        const product = PRODUCTS[0];
        const result = applySelect(product);
        expect(result).toEqual(product);
    });
    it("ignores non-existent properties in $select", () => {
        const product = PRODUCTS[0];
        const result = applySelect(product, ["id", "nonExistent", "name"]);
        expect(result).toEqual({ id: 1, name: "A" });
    });
    it("applies $select to array of entities", () => {
        const result = projectArray(PRODUCTS, { select: ["id", "price"] });
        expect(result).toEqual([
            { id: 1, price: 10.5 },
            { id: 2, price: 7.0 },
            { id: 3, price: 12.0 },
        ]);
    });
    it("handles empty $select array", () => {
        const result = projectArray(PRODUCTS, { select: [] });
        expect(result).toEqual(PRODUCTS);
    });
});
describe("Data shaping: $expand (placeholder)", () => {
    it("should support navigation property expansion", () => {
        // TODO: Implement $expand functionality
        expect(true).toBe(true);
    });
    it("should support nested query options in $expand", () => {
        // TODO: Implement nested $select, $filter, etc. in $expand
        expect(true).toBe(true);
    });
    it("should prevent N+1 queries with batched resolvers", () => {
        // TODO: Implement batched resolver interface
        expect(true).toBe(true);
    });
});
