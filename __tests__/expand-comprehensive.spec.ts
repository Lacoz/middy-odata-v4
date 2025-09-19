import { describe, it, expect } from "vitest";
import { expandData } from "../src/core/shape";
import { PRODUCTS } from "./fixtures/data";

describe("$expand behaviour", () => {
  it("adds placeholder properties for missing navigation targets", () => {
    const source = { ...PRODUCTS[0] };
    const expanded = expandData(source, { expand: [{ path: "category" }] }) as typeof source & { category?: unknown };

    expect(expanded).toHaveProperty("category", null);
    expect(source).not.toHaveProperty("category");
  });

  it("preserves existing nested data while applying nested expansions", () => {
    const source = {
      ...PRODUCTS[0],
      category: {
        id: 1,
        title: "Cat 1"
      }
    };

    const expanded = expandData(source, {
      expand: [
        {
          path: "category",
          options: {
            expand: [{ path: "supplier" }]
          }
        }
      ]
    }) as typeof source & { category: { supplier?: unknown } };

    expect(expanded.category).toEqual({ id: 1, title: "Cat 1", supplier: null });
    expect(source.category).not.toHaveProperty("supplier");
  });

  it("handles arrays without mutating the original items", () => {
    const items = [
      { id: 1, name: "A" },
      { id: 2, name: "B" }
    ];

    const expanded = expandData(items, { expand: [{ path: "details" }] }) as Array<{ details?: unknown }>;

    expect(expanded).toHaveLength(2);
    expanded.forEach((item, index) => {
      expect(item).toHaveProperty("details", null);
      expect(items[index]).not.toHaveProperty("details");
    });
  });

  it("ignores unsupported query options gracefully", () => {
    const productWithCategory = {
      ...PRODUCTS[0],
      category: { id: 1, name: "Primary" }
    };

    const expanded = expandData(productWithCategory, {
      expand: [
        {
          path: "category",
          options: {
            select: ["name"],
            filter: "name eq 'Primary'",
            orderby: [{ property: "name", direction: "asc" }],
            top: 1,
            skip: 0,
            count: true
          }
        }
      ]
    }) as typeof productWithCategory;

    expect(expanded.category).toEqual(productWithCategory.category);
  });

  it("adds placeholders for nested collection expansions", () => {
    const categories = [
      {
        id: 1,
        title: "Cat 1",
        products: [
          { id: 10, name: "Item 1" },
          { id: 11, name: "Item 2" }
        ]
      }
    ];

    const expanded = expandData(categories, {
      expand: [
        {
          path: "products",
          options: {
            expand: [{ path: "supplier" }]
          }
        }
      ]
    }) as Array<{ products: Array<{ supplier?: unknown }> }>;

    expect(expanded[0].products).toHaveLength(2);
    expanded[0].products.forEach((product, index) => {
      expect(product).toEqual({ id: categories[0].products[index].id, name: categories[0].products[index].name, supplier: null });
    });
  });

  it("simply adds placeholders for unknown navigation paths", () => {
    const expanded = expandData(PRODUCTS, { expand: [{ path: "nonExistent" }] }) as Array<{ nonExistent?: unknown }>;

    expect(expanded[0]).toHaveProperty("nonExistent", null);
    expect(PRODUCTS[0]).not.toHaveProperty("nonExistent");
  });
});
