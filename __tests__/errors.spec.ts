import { describe, it, expect } from "vitest";
import { 
  ODataBadRequest, 
  ODataInternalServerError, 
  toODataError,
  validateSelectParameters,
  validateFilterExpression,
  validateOrderByProperties,
  validateExpandNavigationProperties,
  validateEdmModelConstraints,
  getHttpStatusCode,
  isValidationError,
  isServerError
} from "../src/core/errors";
import { EDM_MODEL } from "./fixtures/edm";

describe("OData error handling and validation", () => {
  describe("Error classes", () => {
    it("creates ODataBadRequest with correct status code", () => {
      const error = new ODataBadRequest("Invalid query parameter");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("BadRequest");
      expect(error.message).toBe("Invalid query parameter");
    });

    it("creates ODataInternalServerError with correct status code", () => {
      const error = new ODataInternalServerError("Database connection failed");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("InternalServerError");
      expect(error.message).toBe("Database connection failed");
    });
  });

  describe("Error serialization", () => {
    it("converts ODataBadRequest to OData error format", () => {
      const error = new ODataBadRequest("Invalid $select parameter");
      const result = toODataError(error);
      
      expect(result).toEqual({
        error: {
          code: "BadRequest",
          message: "Invalid $select parameter",
        },
      });
    });

    it("converts ODataInternalServerError to OData error format", () => {
      const error = new ODataInternalServerError("Internal server error");
      const result = toODataError(error);
      
      expect(result).toEqual({
        error: {
          code: "InternalServerError",
          message: "Internal server error",
        },
      });
    });

    it("handles unknown errors with default message", () => {
      const result = toODataError(new Error("Something went wrong"));
      
      expect(result).toEqual({
        error: {
          code: "InternalServerError",
          message: "An error occurred",
        },
      });
    });

    it("handles unknown errors with custom message", () => {
      const result = toODataError(new Error("Something went wrong"), "Custom error message");
      
      expect(result).toEqual({
        error: {
          code: "InternalServerError",
          message: "Custom error message",
        },
      });
    });

    it("handles non-Error objects", () => {
      const result = toODataError("String error");
      
      expect(result).toEqual({
        error: {
          code: "InternalServerError",
          message: "An error occurred",
        },
      });
    });
  });

  describe("Validation errors", () => {
    it("should validate $select parameters", () => {
      // Valid select parameters should not throw
      expect(() => validateSelectParameters(["name", "price"], "Product", EDM_MODEL)).not.toThrow();
      
      // Invalid select parameters should throw
      expect(() => validateSelectParameters(["invalidProperty"], "Product", EDM_MODEL)).toThrow(ODataBadRequest);
      expect(() => validateSelectParameters(["name", "invalidProperty"], "Product", EDM_MODEL)).toThrow(ODataBadRequest);
    });

    it("should validate $filter expressions", () => {
      // Valid filter expressions should not throw
      expect(() => validateFilterExpression("name eq 'test'", "Product", EDM_MODEL)).not.toThrow();
      expect(() => validateFilterExpression("price gt 10", "Product", EDM_MODEL)).not.toThrow();
      
      // Invalid filter expressions should throw
      expect(() => validateFilterExpression("invalidProperty eq 'test'", "Product", EDM_MODEL)).toThrow(ODataBadRequest);
      expect(() => validateFilterExpression("name eq 'test' and invalidProperty gt 5", "Product", EDM_MODEL)).toThrow(ODataBadRequest);
      expect(() => validateFilterExpression("name eq 'test' (", "Product", EDM_MODEL)).toThrow(ODataBadRequest);
      expect(() => validateFilterExpression("name eq 'test')", "Product", EDM_MODEL)).toThrow(ODataBadRequest);
    });

    it("should validate $orderby properties", () => {
      // Valid orderby properties should not throw
      expect(() => validateOrderByProperties(["name asc", "price desc"], "Product", EDM_MODEL)).not.toThrow();
      expect(() => validateOrderByProperties(["name"], "Product", EDM_MODEL)).not.toThrow();
      
      // Invalid orderby properties should throw
      expect(() => validateOrderByProperties(["invalidProperty asc"], "Product", EDM_MODEL)).toThrow(ODataBadRequest);
      expect(() => validateOrderByProperties(["name asc", "invalidProperty desc"], "Product", EDM_MODEL)).toThrow(ODataBadRequest);
    });

    it("should validate $expand navigation properties", () => {
      // Valid expand properties should not throw (if they exist in the model)
      expect(() => validateExpandNavigationProperties(["category"], "Product", EDM_MODEL)).not.toThrow();
      
      // Invalid expand properties should throw
      expect(() => validateExpandNavigationProperties(["invalidNavigationProperty"], "Product", EDM_MODEL)).toThrow(ODataBadRequest);
      expect(() => validateExpandNavigationProperties(["category", "invalidNavigationProperty"], "Product", EDM_MODEL)).toThrow(ODataBadRequest);
    });

    it("should validate EDM model constraints", () => {
      // Valid entity should not throw
      const validEntity = { id: 1, name: "Test Product", price: 10.5, categoryId: 1 };
      expect(() => validateEdmModelConstraints(validEntity, "Product", EDM_MODEL)).not.toThrow();
      
      // Invalid entity should throw
      const invalidEntity = { id: 1, name: "Test Product", price: "invalid" };
      expect(() => validateEdmModelConstraints(invalidEntity, "Product", EDM_MODEL)).toThrow(ODataBadRequest);
      
      // Entity with missing required properties should throw
      const incompleteEntity = { id: 1, name: "Test Product" };
      expect(() => validateEdmModelConstraints(incompleteEntity, "Product", EDM_MODEL)).toThrow(ODataBadRequest);
    });
  });

  describe("HTTP status codes", () => {
    it("should return 400 for validation errors", () => {
      const validationError = new ODataBadRequest("Invalid parameter");
      expect(getHttpStatusCode(validationError)).toBe(400);
      expect(isValidationError(validationError)).toBe(true);
      expect(isServerError(validationError)).toBe(false);
    });

    it("should return 500 for server errors", () => {
      const serverError = new ODataInternalServerError("Database error");
      expect(getHttpStatusCode(serverError)).toBe(500);
      expect(isValidationError(serverError)).toBe(false);
      expect(isServerError(serverError)).toBe(true);
    });
  });
});
