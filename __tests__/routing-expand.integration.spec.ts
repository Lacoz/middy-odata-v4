import { describe, it, expect, vi } from "vitest";
import { odataParse } from "../src/middleware/parse";
import { odataRouting } from "../src/middleware/routing";
import { odataShape } from "../src/middleware/shape";
import { EDM_MODEL } from "./fixtures/edm";
import { CATEGORIES, PRODUCTS } from "./fixtures/data";

describe("routing + shape middleware integration", () => {
  it("automatically resolves to-one navigation properties via data providers", async () => {
    const request: any = {
      event: {
        path: "/Products",
        rawQueryString: "$expand=category",
      },
      context: {
        getRemainingTimeInMillis: () => 1000,
      },
      internal: {},
    };

    const productsProvider = vi.fn(async () => PRODUCTS);
    const categoriesProvider = vi.fn(async () => CATEGORIES);

    const parseMw = odataParse({ model: EDM_MODEL, serviceRoot: "https://example.test" });
    await parseMw.before?.(request);

    const routingMw = odataRouting({
      model: EDM_MODEL,
      dataProviders: {
        Products: productsProvider,
        Categories: categoriesProvider,
      },
    });

    await routingMw.after?.(request);

    const shapeMw = odataShape();
    await shapeMw.after?.(request);

    // Ensure the routing middleware responded with data
    expect(request.response).toBeDefined();
    const payload = JSON.parse(request.response.body);

    expect(payload.value).toHaveLength(PRODUCTS.length);
    expect(payload.value[0]).toHaveProperty("category");
    expect(payload.value[0].category).toMatchObject({ id: 1, title: "Cat1" });

    expect(categoriesProvider).toHaveBeenCalledTimes(1);
    expect(productsProvider).toHaveBeenCalledTimes(1);
  });

  it("supports nested expand options with chained data providers", async () => {
    const PRODUCTS_FIXTURE = [
      { id: 1, name: "Laptop", categoryId: 100 },
    ];
    const CATEGORIES_FIXTURE = [
      { id: 100, title: "Hardware", supplierId: 900 },
    ];
    const SUPPLIERS_FIXTURE = [
      { id: 900, name: "ACME", region: "EU" },
    ];

    const model = {
      namespace: "Test",
      entityTypes: [
        {
          name: "Product",
          key: ["id"],
          properties: [
            { name: "id", type: "Edm.Int32" },
            { name: "name", type: "Edm.String" },
            { name: "categoryId", type: "Edm.Int32" },
          ],
          navigation: [
            { name: "category", target: "Category", collection: false },
          ],
        },
        {
          name: "Category",
          key: ["id"],
          properties: [
            { name: "id", type: "Edm.Int32" },
            { name: "title", type: "Edm.String" },
            { name: "supplierId", type: "Edm.Int32" },
          ],
          navigation: [
            { name: "supplier", target: "Supplier", collection: false },
          ],
        },
        {
          name: "Supplier",
          key: ["id"],
          properties: [
            { name: "id", type: "Edm.Int32" },
            { name: "name", type: "Edm.String" },
            { name: "region", type: "Edm.String" },
          ],
        },
      ],
      entitySets: [
        { name: "Products", entityType: "Product" },
        { name: "Categories", entityType: "Category" },
        { name: "Suppliers", entityType: "Supplier" },
      ],
    } as const;

    const request: any = {
      event: {
        path: "/Products",
        rawQueryString: "$expand=category",
      },
      context: {
        getRemainingTimeInMillis: () => 1000,
      },
      internal: {},
    };

    const parseMw = odataParse({ model, serviceRoot: "https://example.test" });
    await parseMw.before?.(request);

    // Inject nested expand options manually for the test
    request.internal.odata.options.expand = [
      {
        path: "category",
        options: {
          select: ["title"],
          expand: [
            {
              path: "supplier",
              options: {
                select: ["name"],
              },
            },
          ],
        },
      },
    ];

    const routingMw = odataRouting({
      model,
      dataProviders: {
        Products: async () => PRODUCTS_FIXTURE,
        Categories: async () => CATEGORIES_FIXTURE,
        Suppliers: async () => SUPPLIERS_FIXTURE,
      },
    });

    await routingMw.after?.(request);

    const shapeMw = odataShape();
    await shapeMw.after?.(request);

    const payload = JSON.parse(request.response.body);
    expect(payload.value[0]).toMatchObject({
      id: 1,
      name: "Laptop",
      category: {
        title: "Hardware",
        supplier: {
          name: "ACME",
        },
      },
    });
  });
});
