import { describe, it, expect } from "vitest";
import { PRODUCTS, USERS } from "./fixtures/data";
import {
  queryWithConformance,
  getServiceDocument,
  getMetadataDocument,
  validateConformanceLevel,
  getSupportedQueryOptions,
  checkQueryOptionSupport,
  callFunction,
  callAction,
  callFunctionImport,
  callActionImport,
  executeBatch,
  validateConformance,
} from "../src/core/conformance-levels";

const clone = <T>(items: T[]): T[] => items.map(item => ({ ...(item as any) }));

describe("Conformance helpers", () => {
  describe("minimal conformance", () => {
    it("returns full collections when advanced options are requested", () => {
      const result = queryWithConformance(PRODUCTS, { conformance: "minimal", filter: "price gt 10" });
      expect(result?.value).toHaveLength(PRODUCTS.length);
    });

    it("supports $select on collections and single entities", () => {
      const collection = queryWithConformance(PRODUCTS, { conformance: "minimal", select: ["name"] });
      expect(collection?.value[0]).toEqual({ name: "A" });

      const entity = queryWithConformance(PRODUCTS, { conformance: "minimal", key: 1, select: ["price"] });
      expect(entity?.value).toEqual({ price: 10.5 });
    });

    it("exposes service and metadata documents annotated with conformance", () => {
      const service = getServiceDocument({ conformance: "minimal" });
      const metadata = getMetadataDocument({ conformance: "minimal" });
      expect(service["@odata.conformance"]).toBe("minimal");
      expect(metadata["@odata.conformance"]).toBe("minimal");
    });

    it("rejects function and action execution", () => {
      expect(() => callFunction("doWork", {}, { conformance: "minimal" })).toThrow();
      expect(() => callAction("doWork", {}, { conformance: "minimal" })).toThrow();
      expect(() => callFunctionImport("doWork", {}, { conformance: "minimal" })).toThrow();
      expect(() => callActionImport("doWork", {}, { conformance: "minimal" })).toThrow();
      expect(() => executeBatch([], { conformance: "minimal" })).toThrow();
    });
  });

  describe("intermediate conformance", () => {
    it("honours filter, ordering and pagination", () => {
      const result = queryWithConformance(PRODUCTS, {
        conformance: "intermediate",
        filter: "price gt 8",
        orderby: "price desc",
        top: 1,
      });
      expect(result?.value).toHaveLength(1);
      expect((result?.value[0] as any).price).toBe(12);
    });

    it("supports expand on collections", () => {
      const users = clone(USERS).map(user => ({ ...user, orders: [{ id: 1, total: 10 }] }));
      const result = queryWithConformance(users as any, {
        conformance: "intermediate",
        expand: ["orders"],
      });
      expect((result?.value[0] as any).orders).toHaveLength(1);
    });

    it("allows calling functions, actions and batch operations", () => {
      expect(callFunction("demo", {}, { conformance: "intermediate" }).value).toHaveProperty("result");
      expect(callAction("demo", {}, { conformance: "intermediate" }).value).toHaveProperty("result");
      expect(callFunctionImport("demo", {}, { conformance: "intermediate" }).value).toHaveProperty("result");
      expect(callActionImport("demo", {}, { conformance: "intermediate" }).value).toHaveProperty("result");
      const batch = executeBatch([
        { method: "PATCH", url: "Products(1)" },
        { method: "DELETE", url: "Products(2)" },
      ], { conformance: "intermediate" });
      expect(batch).toHaveLength(2);
    });
  });

  describe("advanced conformance", () => {
    it("applies search, compute and apply options", () => {
      const result = queryWithConformance(PRODUCTS, {
        conformance: "advanced",
        search: "A",
        compute: ["price * categoryId"],
        apply: "top(1)",
      });
      expect(result?.value).toHaveLength(1);
      expect((result?.value[0] as any)["price_times_categoryId"]).toBeDefined();
    });
  });

  describe("helpers", () => {
    it("validates and maps conformance levels", () => {
      expect(validateConformanceLevel("advanced")).toBe("advanced");
      expect(() => validateConformanceLevel("unsupported")).toThrow();
    });

    it("reports supported query options per level", () => {
      expect(getSupportedQueryOptions("minimal")).toEqual(["$select"]);
      expect(checkQueryOptionSupport("$search", "advanced")).toBe(true);
      expect(checkQueryOptionSupport("$search", "minimal")).toBe(false);
    });

    it("summarises missing features when validating conformance", () => {
      const intermediate = validateConformance("intermediate");
      expect(intermediate.isValid).toBe(false);
      expect(intermediate.missingFeatures).toContain("Navigation properties");

      const advanced = validateConformance("advanced");
      expect(advanced.missingFeatures).toEqual(["Custom functions", "Custom actions"]);
    });
  });
});
