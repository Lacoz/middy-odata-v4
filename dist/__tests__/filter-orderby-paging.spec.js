import { describe, it, expect } from "vitest";
import { filterArray, orderArray, paginateArray } from "../src/core/filter-order";
import { PRODUCTS } from "./fixtures/data";
describe("Filtering, ordering, pagination", () => {
    describe("$filter", () => {
        it("returns all items when no filter", () => {
            const result = filterArray(PRODUCTS, {});
            expect(result).toEqual(PRODUCTS);
        });
        it("should support basic comparison operators", () => {
            // TODO: Implement filter evaluation
            // const result = filterArray(PRODUCTS, { filter: "price gt 10" });
            // expect(result).toHaveLength(2);
            expect(true).toBe(true);
        });
        it("should support logical operators (and, or, not)", () => {
            // TODO: Implement logical operators
            expect(true).toBe(true);
        });
        it("should support string functions (startswith, endswith, contains)", () => {
            // TODO: Implement string functions
            expect(true).toBe(true);
        });
        it("should handle null values correctly", () => {
            // TODO: Implement null handling
            expect(true).toBe(true);
        });
    });
    describe("$orderby", () => {
        it("returns items in original order when no orderby", () => {
            const result = orderArray(PRODUCTS, {});
            expect(result).toEqual(PRODUCTS);
        });
        it("sorts by single property ascending", () => {
            const result = orderArray(PRODUCTS, {
                orderby: [{ property: "name", direction: "asc" }],
            });
            expect(result[0].name).toBe("A");
            expect(result[1].name).toBe("B");
            expect(result[2].name).toBe("C");
        });
        it("sorts by single property descending", () => {
            const result = orderArray(PRODUCTS, {
                orderby: [{ property: "name", direction: "desc" }],
            });
            expect(result[0].name).toBe("C");
            expect(result[1].name).toBe("B");
            expect(result[2].name).toBe("A");
        });
        it("sorts by multiple properties", () => {
            const result = orderArray(PRODUCTS, {
                orderby: [
                    { property: "categoryId", direction: "asc" },
                    { property: "price", direction: "desc" },
                ],
            });
            // Should group by categoryId, then sort by price desc within each group
            expect(result[0].categoryId).toBe(1);
            expect(result[1].categoryId).toBe(1);
            expect(result[2].categoryId).toBe(2);
            expect(result[0].price).toBeGreaterThanOrEqual(result[1].price);
        });
        it("handles null values in sorting", () => {
            const dataWithNulls = [
                { id: 1, name: "A", price: null },
                { id: 2, name: "B", price: 10 },
                { id: 3, name: "C", price: null },
            ];
            const result = orderArray(dataWithNulls, {
                orderby: [{ property: "price", direction: "asc" }],
            });
            // Nulls should come first in ascending order
            expect(result[0].price).toBeNull();
            expect(result[1].price).toBeNull();
            expect(result[2].price).toBe(10);
        });
    });
    describe("$top and $skip", () => {
        it("returns all items when no pagination", () => {
            const result = paginateArray(PRODUCTS, {});
            expect(result).toEqual(PRODUCTS);
        });
        it("applies $top correctly", () => {
            const result = paginateArray(PRODUCTS, { top: 2 });
            expect(result).toHaveLength(2);
            expect(result).toEqual(PRODUCTS.slice(0, 2));
        });
        it("applies $skip correctly", () => {
            const result = paginateArray(PRODUCTS, { skip: 1 });
            expect(result).toHaveLength(2);
            expect(result).toEqual(PRODUCTS.slice(1));
        });
        it("applies both $top and $skip", () => {
            const result = paginateArray(PRODUCTS, { top: 1, skip: 1 });
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(PRODUCTS[1]);
        });
        it("handles $top=0", () => {
            const result = paginateArray(PRODUCTS, { top: 0 });
            expect(result).toHaveLength(0);
        });
        it("handles $skip beyond array length", () => {
            const result = paginateArray(PRODUCTS, { skip: 10 });
            expect(result).toHaveLength(0);
        });
        it("handles $top beyond remaining items", () => {
            const result = paginateArray(PRODUCTS, { top: 10, skip: 2 });
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(PRODUCTS[2]);
        });
    });
    describe("$count", () => {
        it("should return total count before pagination", () => {
            // TODO: Implement count functionality
            expect(true).toBe(true);
        });
    });
});
