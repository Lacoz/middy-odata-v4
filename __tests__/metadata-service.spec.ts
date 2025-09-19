import { describe, it, expect } from "vitest";
import { generateMetadata, generateServiceDocument } from "../src/core/metadata";
import { EDM_MODEL } from "./fixtures/edm";
import type { EdmModel } from "../src/core/types";

describe("OData metadata and service document helpers", () => {
  describe("Service document", () => {
    it("lists entity sets from the model", () => {
      const doc = generateServiceDocument(EDM_MODEL, "https://api.example.com/odata");
      expect(doc["@odata.context"]).toBe("https://api.example.com/odata/$metadata");
      expect(doc.value.map((item: any) => item.name)).toEqual(["Products", "Categories"]);
    });

    it("includes singletons and imports when present", () => {
      const richModel: EdmModel = {
        ...EDM_MODEL,
        singletons: [{ name: "Settings", entityType: "Category" }],
        functionImports: [{ name: "TopProducts", function: "GetTopProducts" }],
        actionImports: [{ name: "RebuildIndex", action: "RebuildIndexAction" }],
      };

      const doc = generateServiceDocument(richModel, "https://api.example.com/odata");
      const kinds = new Map(doc.value.map((item: any) => [item.name, item.kind]));
      expect(kinds.get("Settings")).toBe("Singleton");
      expect(kinds.get("TopProducts")).toBe("FunctionImport");
      expect(kinds.get("RebuildIndex")).toBe("ActionImport");
    });

    it("provides titles and URLs for each element", () => {
      const doc = generateServiceDocument(EDM_MODEL, "https://api.example.com/odata");
      doc.value.forEach((item: any) => {
        expect(item).toHaveProperty("title");
        expect(typeof item.url).toBe("string");
        expect(item.url.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Metadata document", () => {
    const richModel: EdmModel = {
      namespace: "Demo",
      containerName: "DemoContainer",
      entityTypes: [
        {
          name: "Order",
          key: ["id"],
          properties: [
            { name: "id", type: "Edm.Int32" },
            { name: "total", type: "Edm.Decimal" },
          ],
          navigation: [{ name: "customer", target: "Customer", collection: false }],
        },
        {
          name: "Customer",
          key: ["id"],
          properties: [
            { name: "id", type: "Edm.Int32" },
            { name: "name", type: "Edm.String" },
            { name: "preferences", type: "Demo.CustomerPreferences", nullable: true },
          ],
        },
      ],
      entitySets: [
        { name: "Orders", entityType: "Order" },
        { name: "Customers", entityType: "Customer" },
      ],
      complexTypes: [
        {
          name: "CustomerPreferences",
          properties: [
            { name: "newsletter", type: "Edm.Boolean" },
          ],
        },
      ],
      enumTypes: [
        {
          name: "OrderStatus",
          members: [
            { name: "Pending", value: 0 },
            { name: "Completed", value: 1 },
          ],
        },
      ],
      singletons: [{ name: "Configuration", entityType: "Customer" }],
      functionImports: [{ name: "TopOrders", function: "GetTopOrders" }],
      actionImports: [{ name: "ResetStore", action: "ResetStoreAction" }],
    };

    it("sets schema information with namespace", () => {
      const metadata = generateMetadata(richModel, "https://api.example.com/odata");
      expect(metadata["@odata.context"]).toBe("https://api.example.com/odata/$metadata");
      expect(metadata["$Version"]).toBe("4.01");
      expect(metadata).toHaveProperty("Demo");
      expect(metadata.Demo.$Kind).toBe("Schema");
    });

    it("describes entity types with keys, properties and navigation", () => {
      const metadata = generateMetadata(richModel, "https://api.example.com/odata");
      const orderType = metadata.Demo.Order;
      expect(orderType.$Kind).toBe("EntityType");
      expect(orderType.$Key).toContain("Order/id");
      expect(orderType.total.$Type).toBe("Edm.Decimal");
      expect(orderType.customer.$Type).toBe("Customer");
    });

    it("includes complex and enum types", () => {
      const metadata = generateMetadata(richModel, "https://api.example.com/odata");
      expect(metadata.Demo.CustomerPreferences.$Kind).toBe("ComplexType");
      expect(metadata.Demo.OrderStatus.$Kind).toBe("EnumType");
      expect(metadata.Demo.OrderStatus.Pending.$Value).toBe(0);
    });

    it("defines entity container members", () => {
      const metadata = generateMetadata(richModel, "https://api.example.com/odata");
      const container = metadata.DemoContainer;
      expect(container.$Kind).toBe("EntityContainer");
      expect(container.Orders.$Collection).toBe(true);
      expect(container.Configuration.$Type).toBe("Demo.Customer");
      expect(container.TopOrders.$Function).toBe("Demo.GetTopOrders");
      expect(container.ResetStore.$Action).toBe("Demo.ResetStoreAction");
    });
  });
});
