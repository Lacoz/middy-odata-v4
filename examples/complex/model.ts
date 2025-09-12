import type { EdmModel } from "middy-odata-v4";

export const model: EdmModel = {
  namespace: "ECommerce",
  entityTypes: [
    {
      name: "Product",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32" },
        { name: "name", type: "Edm.String" },
        { name: "description", type: "Edm.String" },
        { name: "price", type: "Edm.Decimal" },
        { name: "categoryId", type: "Edm.Int32" },
        { name: "supplierId", type: "Edm.Int32" },
        { name: "inStock", type: "Edm.Boolean" },
        { name: "stockQuantity", type: "Edm.Int32" },
        { name: "createdAt", type: "Edm.DateTimeOffset" },
        { name: "updatedAt", type: "Edm.DateTimeOffset" },
      ],
      navigation: [
        { name: "category", target: "Category", collection: false },
        { name: "supplier", target: "Supplier", collection: false },
        { name: "orderItems", target: "OrderItem", collection: true },
      ],
    },
    {
      name: "Category",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32" },
        { name: "name", type: "Edm.String" },
        { name: "description", type: "Edm.String" },
        { name: "parentCategoryId", type: "Edm.Int32", nullable: true },
      ],
      navigation: [
        { name: "parentCategory", target: "Category", collection: false },
        { name: "subCategories", target: "Category", collection: true },
        { name: "products", target: "Product", collection: true },
      ],
    },
    {
      name: "Supplier",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32" },
        { name: "name", type: "Edm.String" },
        { name: "contactEmail", type: "Edm.String" },
        { name: "contactPhone", type: "Edm.String" },
        { name: "address", type: "Edm.String" },
        { name: "active", type: "Edm.Boolean" },
      ],
      navigation: [
        { name: "products", target: "Product", collection: true },
      ],
    },
    {
      name: "Order",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32" },
        { name: "customerName", type: "Edm.String" },
        { name: "customerEmail", type: "Edm.String" },
        { name: "totalAmount", type: "Edm.Decimal" },
        { name: "status", type: "Edm.String" },
        { name: "orderDate", type: "Edm.DateTimeOffset" },
        { name: "shippedDate", type: "Edm.DateTimeOffset", nullable: true },
      ],
      navigation: [
        { name: "orderItems", target: "OrderItem", collection: true },
      ],
    },
    {
      name: "OrderItem",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32" },
        { name: "orderId", type: "Edm.Int32" },
        { name: "productId", type: "Edm.Int32" },
        { name: "quantity", type: "Edm.Int32" },
        { name: "unitPrice", type: "Edm.Decimal" },
        { name: "totalPrice", type: "Edm.Decimal" },
      ],
      navigation: [
        { name: "order", target: "Order", collection: false },
        { name: "product", target: "Product", collection: false },
      ],
    },
  ],
  entitySets: [
    { name: "Products", entityType: "Product" },
    { name: "Categories", entityType: "Category" },
    { name: "Suppliers", entityType: "Supplier" },
    { name: "Orders", entityType: "Order" },
    { name: "OrderItems", entityType: "OrderItem" },
  ],
};
