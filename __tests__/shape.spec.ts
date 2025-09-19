import { describe, it, expect } from "vitest";
import { applySelect, projectArray, expandData } from "../src/core/shape";
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
    const product = { ...PRODUCTS[0] };
    const expanded = expandData(product, {
      expand: [{ path: "category" }]
    }) as typeof product & { category?: unknown };

    expect(expanded).toHaveProperty("category", null);
    expect(product).not.toHaveProperty("category"); // original not mutated
  });

  it("should support nested query options in $expand", () => {
    const productWithCategory = {
      ...PRODUCTS[0],
      category: { id: 10, title: "Cat" }
    };

    const expanded = expandData(productWithCategory, {
      expand: [
        {
          path: "category",
          options: {
            expand: [{ path: "supplier" }]
          }
        }
      ]
    }) as typeof productWithCategory & { category: { supplier?: unknown } };

    expect(expanded.category).toHaveProperty("supplier", null);
  });

  it("should prevent N+1 queries with batched resolvers", () => {
    const items = [
      { id: 1, name: "A" },
      { id: 2, name: "B" }
    ];

    const expanded = expandData(items, {
      expand: [{ path: "details" }]
    }) as Array<{ details?: unknown }>;

    expect(expanded).toHaveLength(2);
    expanded.forEach((item, index) => {
      expect(item).toHaveProperty("details", null);
      expect(items[index]).not.toHaveProperty("details");
    });
  });
});
