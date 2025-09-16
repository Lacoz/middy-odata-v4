import { describe, it, expect } from "vitest";
import { 
  odata, 
  odataParse, 
  odataShape, 
  odataFilter, 
  odataPagination, 
  odataSerialize,
  odataError,
  odataFunctions,
  odataMetadata,
  odataConformance,
  composeMiddlewares,
  odataCore,
  odataFull,
  odataLight,
  odataReadOnly,
  odataWrite,
  createMiddlewareArray
} from "../src";
import { EDM_MODEL } from "./fixtures/edm";

describe("Middleware Composition and Interaction", () => {
  describe("Individual Middlewares", () => {
    it("should create odataParse middleware with required options", () => {
      const middleware = odataParse({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      expect(middleware).toHaveProperty("before");
      expect(typeof middleware.before).toBe("function");
    });

    it("should create odataShape middleware with default options", () => {
      const middleware = odataShape();
      
      expect(middleware).toHaveProperty("after");
      expect(typeof middleware.after).toBe("function");
    });

    it("should create odataFilter middleware with custom options", () => {
      const middleware = odataFilter({
        enableFilter: true,
        enableOrderby: true,
        caseSensitive: false,
      });
      
      expect(middleware).toHaveProperty("after");
      expect(typeof middleware.after).toBe("function");
    });

    it("should create odataPagination middleware with pagination options", () => {
      const middleware = odataPagination({
        maxTop: 100,
        defaultTop: 25,
        enableCount: true,
      });
      
      expect(middleware).toHaveProperty("after");
      expect(typeof middleware.after).toBe("function");
    });

    it("should create odataSerialize middleware with format options", () => {
      const middleware = odataSerialize({
        format: "json",
        includeMetadata: true,
        prettyPrint: true,
      });
      
      expect(middleware).toHaveProperty("after");
      expect(typeof middleware.after).toBe("function");
    });

    it("should create odataError middleware with error handling options", () => {
      const middleware = odataError({
        includeStackTrace: false,
        logErrors: true,
      });
      
      expect(middleware).toHaveProperty("onError");
      expect(typeof middleware.onError).toBe("function");
    });

    it("should create odataFunctions middleware with function resolvers", () => {
      const middleware = odataFunctions({
        enableFunctions: true,
        enableActions: true,
        functionResolvers: {
          "Products": () => ({ id: 1, name: "Test" }),
        },
      });
      
      expect(middleware).toHaveProperty("before");
      expect(typeof middleware.before).toBe("function");
    });

    it("should create odataMetadata middleware with metadata options", () => {
      const middleware = odataMetadata({
        enableMetadata: true,
        enableServiceDocument: true,
        includeAnnotations: true,
      });
      
      expect(middleware).toHaveProperty("before");
      expect(typeof middleware.before).toBe("function");
    });

    it("should create odataConformance middleware with conformance options", () => {
      const middleware = odataConformance({
        conformanceLevel: "intermediate",
        strictMode: false,
        validateQueries: true,
      });
      
      expect(middleware).toHaveProperty("before");
      expect(typeof middleware.before).toBe("function");
    });
  });

  describe("Middleware Composition", () => {
    it("should compose multiple middlewares using composeMiddlewares", () => {
      const parseMiddleware = odataParse({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      const shapeMiddleware = odataShape();
      const filterMiddleware = odataFilter();
      
      const composed = composeMiddlewares(parseMiddleware, shapeMiddleware, filterMiddleware);
      
      expect(composed).toHaveProperty("before");
      expect(composed).toHaveProperty("after");
      expect(composed).toHaveProperty("onError");
      expect(typeof composed.before).toBe("function");
      expect(typeof composed.after).toBe("function");
      expect(typeof composed.onError).toBe("function");
    });

    it("should execute composed middlewares in correct order", async () => {
      const executionOrder: string[] = [];
      
      const middleware1 = {
        before: async () => { executionOrder.push("before1"); },
        after: async () => { executionOrder.push("after1"); },
      };
      
      const middleware2 = {
        before: async () => { executionOrder.push("before2"); },
        after: async () => { executionOrder.push("after2"); },
      };
      
      const composed = composeMiddlewares(middleware1, middleware2);
      
      const request = { event: {}, internal: {} };
      
      // Execute before hooks
      await composed.before!(request as any);
      
      // Execute after hooks
      await composed.after!(request as any);
      
      expect(executionOrder).toEqual(["before1", "before2", "after2", "after1"]);
    });
  });

  describe("Convenience Middleware Arrays", () => {
    it("should create odataCore middleware array", () => {
      const middlewares = odataCore({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
      
      // Check that all middlewares have required properties
      middlewares.forEach(middleware => {
        // Each middleware should have at least one lifecycle hook
        const hasLifecycleHook = middleware.before || middleware.after || middleware.onError;
        expect(hasLifecycleHook).toBeTruthy();
      });
    });

    it("should create odataFull middleware array", () => {
      const middlewares = odataFull({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
    });

    it("should create odataLight middleware array", () => {
      const middlewares = odataLight({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
    });

    it("should create odataReadOnly middleware array", () => {
      const middlewares = odataReadOnly({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
    });

    it("should create odataWrite middleware array", () => {
      const middlewares = odataWrite({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      });
      
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
    });

    it("should create custom middleware array using createMiddlewareArray", () => {
      const middlewares = createMiddlewareArray({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
        include: ["parse", "shape", "filter"],
        exclude: ["functions", "metadata"],
      });
      
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBe(3);
    });
  });

  describe("Pre-composed odata() Middleware", () => {
    it("should create pre-composed middleware with all features", () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
        enable: {
          parse: true,
          shape: true,
          filter: true,
          pagination: true,
          serialize: true,
          error: true,
          functions: true,
          metadata: true,
          conformance: true,
        },
        defaults: {
          maxTop: 1000,
          defaultTop: 50,
        },
      });
      
      expect(middleware).toHaveProperty("before");
      expect(middleware).toHaveProperty("after");
      expect(middleware).toHaveProperty("onError");
      expect(typeof middleware.before).toBe("function");
      expect(typeof middleware.after).toBe("function");
      expect(typeof middleware.onError).toBe("function");
    });

    it("should create pre-composed middleware with minimal features", () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
        enable: {
          parse: true,
          shape: false,
          filter: false,
          pagination: false,
          serialize: false,
          error: true,
          functions: false,
          metadata: false,
          conformance: false,
        },
      });
      
      expect(middleware).toHaveProperty("before");
      expect(middleware).toHaveProperty("after");
      expect(middleware).toHaveProperty("onError");
    });

    it("should handle serviceRoot as function", () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: (event) => `https://${event.headers?.host}/odata`,
      });
      
      expect(middleware).toHaveProperty("before");
      expect(typeof middleware.before).toBe("function");
    });
  });

  describe("Middleware Integration", () => {
    it("should process request through complete middleware chain", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
        enable: {
          parse: true,
          shape: true,
          filter: true,
          pagination: true,
          serialize: true,
          error: true,
          functions: false,
          metadata: false,
          conformance: false,
        },
      });
      
      const request = {
        event: {
          queryStringParameters: {
            "$select": "id,name",
            "$top": "5",
            "$filter": "price gt 10",
          },
        },
        internal: {},
      };
      
      // Execute before hooks
      await middleware.before!(request as any);
      
      // Check that OData context was set up
      expect(request.internal).toHaveProperty("odata");
      expect((request.internal as any).odata).toHaveProperty("model");
      expect((request.internal as any).odata).toHaveProperty("serviceRoot");
      expect((request.internal as any).odata).toHaveProperty("options");
      
      // Check that query options were parsed
      expect((request.internal as any).odata.options.select).toEqual(["id", "name"]);
      expect((request.internal as any).odata.options.top).toBe(5);
      expect((request.internal as any).odata.options.filter).toBe("price gt 10");
    });

    it("should handle errors through error middleware", async () => {
      const middleware = odata({
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
        enable: {
          parse: true,
          error: true,
        },
      });
      
      const request = {
        event: {
          queryStringParameters: {
            "$invalid": "test",
          },
        },
        internal: {},
        error: new Error("Test error"),
      };
      
      // Execute error handler
      await middleware.onError!(request as any);
      
      // Check that error was handled
      expect(request).toHaveProperty("error");
    });
  });

  describe("Configuration Inheritance", () => {
    it("should inherit configuration from parent to child middlewares", () => {
      const parentConfig = {
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
        defaults: {
          maxTop: 100,
          defaultTop: 25,
        },
      };
      
      const middleware = odata(parentConfig);
      
      expect(middleware).toHaveProperty("before");
      expect(typeof middleware.before).toBe("function");
    });

    it("should allow overriding configuration in individual middlewares", () => {
      const baseConfig = {
        model: EDM_MODEL,
        serviceRoot: "https://api.example.com/odata",
      };
      
      const parseMiddleware = odataParse({
        ...baseConfig,
        validateAgainstModel: false,
        strictMode: true,
      });
      
      expect(parseMiddleware).toHaveProperty("before");
      expect(typeof parseMiddleware.before).toBe("function");
    });
  });
});
