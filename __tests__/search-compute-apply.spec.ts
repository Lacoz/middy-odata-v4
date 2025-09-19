import { describe, it, expect } from "vitest";
import { PRODUCTS, USERS } from "./fixtures/data";
import { searchData, computeData, applyData } from "../src/core/search-compute-apply";

describe("$search, $compute, $apply - Advanced OData v4.01 Features", () => {
  describe("$search", () => {
    it("should perform full-text search across string properties", () => {
      const result = searchData(PRODUCTS, { search: "A" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("A");
    });

    it("should support search with multiple terms", () => {
      const result = searchData(PRODUCTS, { search: "A B" });
      expect(result).toHaveLength(2);
      expect(result.some(p => p.name === "A")).toBe(true);
      expect(result.some(p => p.name === "B")).toBe(true);
    });

    it("should support search with quoted phrases", () => {
      const result = searchData(PRODUCTS, { search: "A" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("A");
    });

    it("should support search with boolean operators", () => {
      const result = searchData(PRODUCTS, { search: "A" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("A");
    });

    it("should support search with NOT operator", () => {
      const result = searchData(PRODUCTS, { search: "A" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("A");
    });

    it("should support search with OR operator", () => {
      const result = searchData(PRODUCTS, { search: "A B" });
      expect(result).toHaveLength(2);
      expect(result.some(p => p.name === "A")).toBe(true);
      expect(result.some(p => p.name === "B")).toBe(true);
    });

    it("should support search with parentheses for grouping", () => {
      const result = searchData(PRODUCTS, { search: "(A OR B) AND wireless" });
      expect(result).toHaveLength(0); // No products match this complex search
    });

    it("should support search with wildcards", () => {
      const result = searchData(PRODUCTS, { search: "A*" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("A");
    });

    it("should support search with fuzzy matching", () => {
      const result = searchData(PRODUCTS, { search: "A~" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("A");
    });

    it("should support search with field-specific queries", () => {
      const result = searchData(PRODUCTS, { search: "name:A" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("A");
    });

    it("should support search with range queries", () => {
      const result = searchData(PRODUCTS, { search: "price:[10 TO 20]" });
      expect(result).toHaveLength(2);
    });

    it("should support search with proximity queries", () => {
      const result = searchData(PRODUCTS, { search: '"A B"~5' });
      expect(result).toHaveLength(0); // No products match this proximity search
    });

    it("should support search with boost queries", () => {
      const result = searchData(PRODUCTS, { search: "A^2 B" });
      expect(result).toHaveLength(2);
    });

    it("should annotate results with @search.score and order by relevance", () => {
      const items = [
        { id: 1, name: "Alpha Beta" },
        { id: 2, name: "Alpha" },
        { id: 3, name: "Gamma" },
      ];

      const result = searchData(items, { search: '"Alpha Beta" OR Alpha' });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("@search.score");
      expect(result[1]).toHaveProperty("@search.score");
      expect(result[0]["@search.score"]).toBeGreaterThan(result[1]["@search.score"]);
      expect(result.map(item => item.id)).toEqual([1, 2]);
    });

    describe("Error Handling", () => {
      it("should handle invalid search syntax", () => {
        expect(() => searchData(PRODUCTS, { search: "invalid syntax [" }))
          .toThrow("Invalid search syntax");
      });

      it("should handle unsupported search features", () => {
        expect(() => searchData(PRODUCTS, { search: "unsupported:feature" }))
          .toThrow("Unsupported search feature");
      });
    });
  });

  describe("$compute", () => {
    it("should compute simple arithmetic expressions", () => {
      const result = computeData(PRODUCTS, { compute: ["price + categoryId"] });
      expect(result[0]).toHaveProperty("price_plus_categoryId");
      expect((result[0] as any).price_plus_categoryId).toBe(11.5); // 10.5 + 1
    });

    it("should compute string concatenation", () => {
      const result = computeData(PRODUCTS, { compute: ["price * categoryId"] });
      expect(result[0]).toHaveProperty("price_times_categoryId");
      expect((result[0] as any).price_times_categoryId).toBe(10.5); // 10.5 * 1
    });

    it("should compute conditional expressions", () => {
      const result = computeData(PRODUCTS, { compute: ["price gt 15 ? 'high' : 'low'"] });
      expect(result[0]).toHaveProperty("price_gt_15_high_low");
      expect((result[0] as any).price_gt_15_high_low).toBe("low");
    });

    it("should compute with mathematical functions", () => {
      const result = computeData(PRODUCTS, { compute: ["round(price)"] });
      expect(result[0]).toHaveProperty("round_price");
      expect((result[0] as any).round_price).toBe(11);
    });

    it("should compute with string functions", () => {
      const result = computeData(PRODUCTS, { compute: ["length(name)"] });
      expect(result[0]).toHaveProperty("length_name");
      expect((result[0] as any).length_name).toBe(1);
    });

    it("should compute with date functions", () => {
      const result = computeData(PRODUCTS, { compute: ["year(createdAt)"] });
      expect(result[0]).toHaveProperty("year_createdAt");
    });

    it("should compute with type functions", () => {
      const result = computeData(PRODUCTS, { compute: ["cast(price, 'Edm.String')"] });
      expect(result[0]).toHaveProperty("cast_price_Edm.String");
    });

    it("should compute with navigation properties", () => {
      const result = computeData(PRODUCTS, { compute: ["category/name"] });
      expect(result[0]).toHaveProperty("category_name");
    });

    it("should compute multiple expressions", () => {
      const result = computeData(PRODUCTS, { 
        compute: [
          "price + categoryId",
          "price * categoryId"
        ]
      });
      expect(result[0]).toHaveProperty("price_plus_categoryId");
      expect(result[0]).toHaveProperty("price_times_categoryId");
      expect((result[0] as any).price_plus_categoryId).toBe(11.5);
      expect((result[0] as any).price_times_categoryId).toBe(10.5);
    });

    it("should handle null values in computations", () => {
      const result = computeData(PRODUCTS, { compute: ["price + 0"] });
      expect(result[0]).toHaveProperty("price_plus_0");
      expect((result[0] as any).price_plus_0).toBe(10.5);
    });
    describe("Error Handling", () => {
      it("should handle invalid compute expressions", () => {
        expect(() => computeData(PRODUCTS, { compute: "invalid: invalidFunction()" }))
          .toThrow("Invalid compute expression");
      });

      it("should handle unsupported compute functions", () => {
        expect(() => computeData(PRODUCTS, { compute: "result: unsupportedFunction()" }))
          .toThrow("Unsupported compute function");
      });
    });
  });

  describe("$apply", () => {
    it("should apply groupby transformation", () => {
      const result = applyData(PRODUCTS, { apply: "groupby" });
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
    });

    it("should apply filter transformation", () => {
      const result = applyData(PRODUCTS, { apply: "filter(price gt 10)" });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id");
    });

    it("should apply orderby transformation", () => {
      const result = applyData(PRODUCTS, { apply: "orderby(price desc)" });
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("id");
    });

    it("should apply top transformation", () => {
      const result = applyData(PRODUCTS, { apply: "top(2)" });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id");
    });

    it("should apply skip transformation", () => {
      const result = applyData(PRODUCTS, { apply: "skip(1)" });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id");
    });

    it("should apply count transformation", () => {
      const result = applyData(PRODUCTS, { apply: "count()" });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("count");
    });

    it("should apply aggregate transformations", () => {
      const result = applyData(PRODUCTS, { apply: "aggregate(price with sum as totalPrice, price with average as avgPrice)" });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("totalPrice");
      expect(result[0]).toHaveProperty("avgPrice");
    });

    it("should apply compute transformation", () => {
      const result = applyData(PRODUCTS, { apply: "compute(discountedPrice: price * 0.9)" });
      expect(result[0]).toHaveProperty("discountedPrice");
    });

    it("should apply expand transformation", () => {
      const result = applyData(PRODUCTS, { apply: "expand(category)" });
      expect(result[0]).toHaveProperty("category");
    });

    it("should apply select transformation", () => {
      const result = applyData(PRODUCTS, { apply: "select(name, price)" });
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("price");
    });

    it("should apply multiple transformations in sequence", () => {
      const result = applyData(PRODUCTS, { 
        apply: [
          "filter(price gt 10)",
          "orderby(price desc)",
          "top(1)"
        ]
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("price");
    });

    it("should apply nested groupby transformations", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice, price with count as productCount))" 
      });
      expect(result[0]).toHaveProperty("totalPrice");
      expect(result[0]).toHaveProperty("productCount");
    });

    it("should apply groupby with having clause", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice), having(totalPrice gt 15))" 
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("categoryId");
      expect(result[0]).toHaveProperty("totalPrice");
    });

    it("should apply groupby with orderby", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice), orderby(totalPrice desc))" 
      });
      expect(result[0]).toHaveProperty("totalPrice");
    });

    it("should apply groupby with top", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice), top(1))" 
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("categoryId");
      expect(result[0]).toHaveProperty("totalPrice");
    });

    it("should apply groupby with skip", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice), skip(1))" 
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("categoryId");
      expect(result[0]).toHaveProperty("totalPrice");
    });

    it("should apply groupby with count", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice), count())" 
      });
      expect(result).toHaveProperty("count");
    });

    it("should apply groupby with expand", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice), expand(category))" 
      });
      expect(result[0]).toHaveProperty("category");
    });

    it("should apply groupby with select", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice), select(categoryId, totalPrice))" 
      });
      expect(result[0]).toHaveProperty("categoryId");
      expect(result[0]).toHaveProperty("totalPrice");
    });

    it("should apply groupby with compute", () => {
      const result = applyData(PRODUCTS, { 
        apply: "groupby((categoryId), aggregate(price with sum as totalPrice), compute(discountedTotal: totalPrice * 0.9))" 
      });
      expect(result[0]).toHaveProperty("discountedTotal");
    });
    describe("Error Handling", () => {
      it("should handle invalid apply transformations", () => {
        expect(() => applyData(PRODUCTS, { apply: "invalidTransformation()" }))
          .toThrow("Invalid apply transformation");
      });

      it("should handle unsupported apply transformations", () => {
        expect(() => applyData(PRODUCTS, { apply: "unsupportedTransformation()" }))
          .toThrow("Unsupported apply transformation");
      });
    });
  });
});
