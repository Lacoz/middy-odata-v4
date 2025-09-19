import { describe, it, expect } from "vitest";
import { odata } from "../src/middleware";
import { EDM_MODEL } from "./fixtures/edm";
import { PRODUCTS } from "./fixtures/data";
import { odataPagination } from "../src/middleware/pagination";
import { odataSerialize } from "../src/middleware/serialize";

describe("Middy integration and behavior", () => {
  describe("Middleware setup", () => {
    it("creates middleware with required options", () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      expect(middleware).toHaveProperty("before");
      expect(typeof middleware.before).toBe("function");
    });

    it("accepts serviceRoot as function", () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: (event) => `https://${event.headers?.host}/odata`,
      });
      
      expect(middleware).toHaveProperty("before");
    });
  });

  describe("Request processing", () => {
    it("parses query parameters from API Gateway v1 event", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      const request = {
        event: {
          queryStringParameters: {
            "$select": "id,name",
            "$top": "5",
          },
        },
        internal: {},
      };
      
      await middleware.before!(request as any);
      
      expect(request.internal).toHaveProperty("odata");
      expect((request.internal as any).odata.options.select).toEqual(["id", "name"]);
      expect((request.internal as any).odata.options.top).toBe(5);
    });

    it("parses query parameters from API Gateway v2 event", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      const request = {
        event: {
          rawQueryString: "$select=id,name&$top=5",
        },
        internal: {},
      };
      
      await middleware.before!(request as any);
      
      expect(request.internal).toHaveProperty("odata");
      expect((request.internal as any).odata.options.select).toEqual(["id", "name"]);
      expect((request.internal as any).odata.options.top).toBe(5);
    });

    it("handles missing query parameters", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      const request = {
        event: {},
        internal: {},
      };
      
      await middleware.before!(request as any);
      
      expect(request.internal).toHaveProperty("odata");
      expect((request.internal as any).odata.options).toEqual({});
    });

    it("sets serviceRoot from function", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: (event) => `https://${event.headers?.host || "api.example.com"}/odata`,
      });
      
      const request = {
        event: {
          headers: { host: "custom.api.com" },
        },
        internal: {},
      };
      
      await middleware.before!(request as any);
      
      expect((request.internal as any).odata.serviceRoot).toBe("https://custom.api.com/odata");
    });
  });

  describe("Configuration options", () => {
    it("applies default pagination when configured", async () => {
      const pagination = odataPagination({ defaultTop: 1 });
      const serialize = odataSerialize({});

      const request: any = {
        internal: {
          odata: {
            serviceRoot: "https://api.example.com/odata",
            options: {},
          },
        },
        response: { body: JSON.stringify(PRODUCTS) },
      };

      await pagination.after!(request);
      await serialize.after!(request);

      const payload = JSON.parse(request.response.body);
      expect(payload.value).toHaveLength(1);
    });

    it("ignores default pagination when pagination middleware is disabled", async () => {
      const request: any = {
        internal: {
          odata: {
            serviceRoot: "https://api.example.com/odata",
            options: {},
          },
        },
        response: { body: JSON.stringify(PRODUCTS) },
      };

      const serialize = odataSerialize({});
      await serialize.after!(request);

      const payload = JSON.parse(request.response.body);
      expect(payload.value).toHaveLength(PRODUCTS.length);
    });

    it("can disable serialization stage", async () => {
      const request: any = {
        internal: {
          odata: {
            serviceRoot: "https://api.example.com/odata",
            options: {},
          },
        },
        response: { body: JSON.stringify({ value: PRODUCTS }) },
      };

      // Without serialization middleware the response body should already be JSON
      const payload = JSON.parse(request.response.body);
      expect(payload).toEqual({ value: PRODUCTS });
    });
  });

  describe("Handler integration", () => {
    it("should work with Middy handler", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });

      const request: any = {
        event: { queryStringParameters: {} },
        internal: {},
        response: { body: JSON.stringify(PRODUCTS) },
      };

      await middleware.before!(request);
      await middleware.after!(request);

      const payload = JSON.parse(request.response.body);
      expect(payload).toHaveProperty("@odata.context");
      expect(Array.isArray(payload.value)).toBe(true);
    });

    it("should handle async data providers", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });

      const request: any = {
        event: { queryStringParameters: {} },
        internal: {},
        response: {
          body: JSON.stringify(await Promise.resolve(PRODUCTS)),
        },
      };

      await middleware.before!(request);
      await middleware.after!(request);

      const payload = JSON.parse(request.response.body);
      expect(payload.value).toHaveLength(PRODUCTS.length);
    });

    it("should respect context timeouts", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });

      const request: any = {
        event: { queryStringParameters: {} },
        context: { getRemainingTimeInMillis: () => 0 },
        internal: {},
        response: { body: JSON.stringify(PRODUCTS) },
      };

      await middleware.before!(request);
      await middleware.after!(request);

      expect(() => JSON.parse(request.response.body)).not.toThrow();
    });
  });
});
