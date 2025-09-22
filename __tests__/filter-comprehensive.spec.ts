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

    it("supports directional trim helpers", () => {
      const values = [
        { id: 1, label: "  padded" },
        { id: 2, label: "padded  " },
      ];

      const leftTrimmed = filterArray(values, { filter: "ltrim(label) eq 'padded'" });
      expect(leftTrimmed.map(v => v.id)).toEqual([1]);

      const rightTrimmed = filterArray(values, { filter: "rtrim(label) eq 'padded'" });
      expect(rightTrimmed.map(v => v.id)).toEqual([2]);
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

    it("formats dates and times and exposes fractional parts", () => {
      const records = [
        { id: 1, createdAt: "2023-01-01T12:34:56.789Z", duration: "PT1H2M3.5S" },
        { id: 2, createdAt: "2023-01-02T05:00:30Z", duration: "PT30M" },
      ];

      const dateMatch = filterArray(records, { filter: "date(createdAt) eq '2023-01-01'" });
      expect(dateMatch.map(r => r.id)).toEqual([1]);

      const timeMatch = filterArray(records, { filter: "time(createdAt) eq '12:34:56.789'" });
      expect(timeMatch.map(r => r.id)).toEqual([1]);

      const withTotalSeconds = filterArray(records, { filter: "totalseconds(duration) gt 3600" });
      expect(withTotalSeconds.map(r => r.id)).toEqual([1]);

      const fractionalSeconds = filterArray(records, { filter: "fractionalseconds(duration) gt 0.4" });
      expect(fractionalSeconds.map(r => r.id)).toEqual([1]);
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

    it("supports absolute, square root, power and modulo", () => {
      const numbers = [
        { id: 1, delta: -4, value: 16 },
        { id: 2, delta: 2, value: 9 },
      ];

      const absolute = filterArray(numbers, { filter: "abs(delta) eq 4" });
      expect(absolute.map(n => n.id)).toEqual([1]);

      const squareRoot = filterArray(numbers, { filter: "sqrt(value) eq 4" });
      expect(squareRoot.map(n => n.id)).toEqual([1]);

      const powered = filterArray(PRODUCTS, { filter: "power(price, 2) gt 100" });
      expect(powered.map(p => p.name)).toEqual(["A", "C"]);

      const modulo = filterArray(PRODUCTS, { filter: "mod(price, 5) lt 1" });
      expect(modulo.map(p => p.name)).toEqual(["A"]);
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

  describe("collection operators, aliases and unknowns", () => {
    it("supports collection membership via has operator", () => {
      const admins = filterArray(USERS, { filter: "tags has 'admin'" });
      expect(admins.map(u => u.name)).toEqual(["John Doe"]);
    });

    it("filters using the in operator", () => {
      const activeOrPending = filterArray(PRODUCTS, { filter: "status in ('Active','Pending')" });
      expect(activeOrPending.map(p => p.name)).toEqual(["A", "C"]);
    });

    it("resolves parameter aliases when evaluating filters", () => {
      const aliased = filterArray(PRODUCTS, {
        filter: "status eq @target",
        parameterAliases: {
          "@target": "'Active'",
        },
      });
      expect(aliased.map(p => p.name)).toEqual(["A", "C"]);
    });

    it("evaluates lambda any expressions", () => {
      const anyAdmin = filterArray(USERS, { filter: "tags/any(tag: tag eq 'admin')" });
      expect(anyAdmin.map(u => u.name)).toEqual(["John Doe"]);
    });

    it("evaluates lambda all expressions", () => {
      const allNonAdmin = filterArray(USERS, { filter: "tags/all(tag: tag ne 'admin')" });
      expect(allNonAdmin.map(u => u.name)).toEqual(["Jane Smith"]);
    });

    it("ignores unknown functions", () => {
      const unsupportedFunction = filterArray(PRODUCTS, { filter: "invalidFunction(price)" });
      expect(unsupportedFunction).toEqual([]);
    });
  });
});
