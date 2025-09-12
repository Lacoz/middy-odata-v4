import type { EdmModel } from "../../src/core/types.js";

export const EDM_MODEL: EdmModel = {
  namespace: "Test",
  entityTypes: [
    {
      name: "Product",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32" },
        { name: "name", type: "Edm.String" },
        { name: "price", type: "Edm.Decimal" },
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
      ],
    },
  ],
  entitySets: [
    { name: "Products", entityType: "Product" },
    { name: "Categories", entityType: "Category" },
  ],
};
