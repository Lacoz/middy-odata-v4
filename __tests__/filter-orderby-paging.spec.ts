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
      const greaterThan = filterArray(PRODUCTS, { filter: "price gt 9" });
      expect(greaterThan.map(p => p.name)).toEqual(["A", "C"]);

      const equals = filterArray(PRODUCTS, { filter: "status eq 'Inactive'" });
      expect(equals).toHaveLength(1);
      expect(equals[0].name).toBe("B");
    });

    it("should support logical operators (and, or, not)", () => {
      const conjunction = filterArray(PRODUCTS, {
        filter: "price gt 9 and categoryId eq 1"
      });
      expect(conjunction.map(p => p.name)).toEqual(["A", "C"]);

      const disjunction = filterArray(PRODUCTS, {
        filter: "price lt 8 or status eq 'Inactive'"
      });
      expect(disjunction.map(p => p.name)).toEqual(["B"]);

      const negation = filterArray(PRODUCTS, {
        filter: "not status eq 'Inactive'"
      });
      expect(negation.map(p => p.name)).toEqual(["A", "C"]);
    });

    it("should support string functions (startswith, endswith, contains)", () => {
      const startsWith = filterArray(PRODUCTS, { filter: "startswith(name, 'A')" });
      expect(startsWith.map(p => p.name)).toEqual(["A"]);

      const contains = filterArray(PRODUCTS, { filter: "contains(name, 'B')" });
      expect(contains.map(p => p.name)).toEqual(["B"]);

      const endsWith = filterArray(PRODUCTS, { filter: "endswith(status, 'ive')" });
      expect(endsWith.map(p => p.status)).toEqual(["Active", "Inactive", "Active"]);
    });

    it("should handle null values correctly", () => {
      const dataWithNulls = [
        ...PRODUCTS,
        { id: 4, name: "D", price: null, categoryId: 3, status: "Pending", customPrice: null }
      ];

      const nullMatches = filterArray(dataWithNulls, { filter: "customPrice eq null" });
      expect(nullMatches).toHaveLength(1);
      expect(nullMatches[0].name).toBe("D");

      const nonNullMatches = filterArray(dataWithNulls, { filter: "customPrice ne null" });
      expect(nonNullMatches.map(p => p.name)).toEqual(["A", "B", "C"]);
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
      const filtered = filterArray(PRODUCTS, { filter: "price ge 7" });
      expect(filtered).toHaveLength(3);

      const paged = paginateArray(filtered, { top: 1, skip: 1 });
      expect(paged).toEqual([PRODUCTS[1]]);
    });
  });
});
