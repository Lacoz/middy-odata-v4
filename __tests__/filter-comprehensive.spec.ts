import { describe, it, expect } from "vitest";
import { filterArray } from "../src/core/filter-order";
import { PRODUCTS, USERS } from "./fixtures/data";

describe("$filter - practical coverage", () => {
  describe("comparison and logical operators", () => {
    it("supports standard comparison operators", () => {
      const greater = filterArray(PRODUCTS, { filter: "price gt 9" });
      expect(greater.map(p => p.name)).toEqual(["A", "C"]);

      const lessOrEqual = filterArray(PRODUCTS, { filter: "price le 7" });
      expect(lessOrEqual).toHaveLength(1);
      expect(lessOrEqual[0].name).toBe("B");
    });

    it("evaluates logical expressions including not", () => {
      const andResult = filterArray(PRODUCTS, { filter: "price gt 5 and price lt 15" });
      expect(andResult).toHaveLength(3);

      const orResult = filterArray(PRODUCTS, { filter: "price gt 11 or price lt 8" });
      expect(orResult.map(p => p.name)).toEqual(["B", "C"]);

      const notResult = filterArray(PRODUCTS, { filter: "not status eq 'Inactive'" });
      expect(notResult.map(p => p.name)).toEqual(["A", "C"]);
    });
  });

  describe("string functions", () => {
    it("supports substring and index functions", () => {
      const substringMatch = filterArray(PRODUCTS, { filter: "substring(name, 0, 1) eq 'A'" });
      expect(substringMatch.map(p => p.name)).toEqual(["A"]);

      const indexOfMatch = filterArray(PRODUCTS, { filter: "indexof(status, 'Inactive') ge 0" });
      expect(indexOfMatch.map(p => p.status)).toEqual(["Inactive"]);
    });

    it("supports casing and trim helpers", () => {
      const toLower = filterArray(PRODUCTS, { filter: "tolower(name) eq 'a'" });
      expect(toLower.map(p => p.name)).toEqual(["A"]);

      const toUpper = filterArray(PRODUCTS, { filter: "toupper(name) eq 'A'" });
      expect(toUpper.map(p => p.name)).toEqual(["A"]);

      const trimmed = filterArray([{ label: "  value  " }], { filter: "trim(label) eq 'value'" });
      expect(trimmed).toHaveLength(1);
    });

    it("supports concat", () => {
      const concatMatch = filterArray(PRODUCTS, { filter: "concat(name, 'X') eq 'AX'" });
      expect(concatMatch.map(p => p.name)).toEqual(["A"]);
    });
  });

  describe("date/time helpers", () => {
    const timestamp = "2023-01-01T12:34:56Z";
    const dated = [
      { id: 1, createdAt: timestamp },
      { id: 2, createdAt: "2022-05-15T05:00:30Z" }
    ];

    it("supports extracting individual parts", () => {
      const yearMatch = filterArray(dated, { filter: "year(createdAt) eq 2023" });
      expect(yearMatch.map(d => d.id)).toEqual([1]);
    });

    it("evaluates month, day, minute and second helpers", () => {
      const monthMatch = filterArray(dated, { filter: "month(createdAt) eq 1" });
      expect(monthMatch.map(d => d.id)).toEqual([1]);

      const minuteMatch = filterArray(dated, { filter: "minute(createdAt) eq 34" });
      expect(minuteMatch.map(d => d.id)).toEqual([1]);

      const secondMatch = filterArray(dated, { filter: "second(createdAt) eq 30" });
      expect(secondMatch.map(d => d.id)).toEqual([2]);
    });
  });

  describe("mathematical helpers", () => {
    it("supports round, floor and ceiling", () => {
      const rounded = filterArray(PRODUCTS, { filter: "round(price) eq 11" });
      expect(rounded.map(p => p.name)).toEqual(["A"]);

      const floored = filterArray(PRODUCTS, { filter: "floor(price) eq 7" });
      expect(floored.map(p => p.name)).toEqual(["B"]);

      const ceiling = filterArray(PRODUCTS, { filter: "ceiling(price) eq 12" });
      expect(ceiling.map(p => p.name)).toEqual(["C"]);
    });
  });

  describe("null handling and nested properties", () => {
    it("handles null comparisons", () => {
      const items = [
        { id: 1, optional: null },
        { id: 2, optional: "value" }
      ];

      const equalsNull = filterArray(items, { filter: "optional eq null" });
      expect(equalsNull.map(i => i.id)).toEqual([1]);

      const notNull = filterArray(items, { filter: "optional ne null" });
      expect(notNull.map(i => i.id)).toEqual([2]);
    });

    it("supports navigation-like property access", () => {
      const cityMatch = filterArray(USERS, { filter: "address/city eq 'New York'" });
      expect(cityMatch.map(u => u.name)).toEqual(["John Doe"]);
    });
  });

  describe("unsupported expressions fall back to original data", () => {
    it("returns an empty result when an unsupported operator is used", () => {
      const unsupported = filterArray(USERS, { filter: "tags has 'admin'" });
      expect(unsupported).toEqual([]);
    });

    it("ignores unknown functions", () => {
      const unsupportedFunction = filterArray(PRODUCTS, { filter: "invalidFunction(price)" });
      expect(unsupportedFunction).toEqual([]);
    });
  });
});
