import { describe, it, expect } from "vitest";
import { parseODataQuery } from "../src/core/parse.js";

describe("parseODataQuery", () => {
  it("parses $select and $orderby", () => {
    const q = parseODataQuery({ "$select": "id,name", "$orderby": "name desc, id" });
    expect(q.select).toEqual(["id", "name"]);
    expect(q.orderby).toEqual([
      { property: "name", direction: "desc" },
      { property: "id", direction: "asc" },
    ]);
  });

  it("parses $top, $skip, $count", () => {
    const q = parseODataQuery({ "$top": "5", "$skip": "10", "$count": "true" });
    expect(q.top).toBe(5);
    expect(q.skip).toBe(10);
    expect(q.count).toBe(true);
  });

  it("parses $filter and $expand minimally", () => {
    const q = parseODataQuery({ "$filter": "price gt 10", "$expand": "category" });
    expect(q.filter).toBe("price gt 10");
    expect(q.expand).toEqual([{ path: "category" }]);
  });

  it("parses $search, $compute, $apply and parameter aliases", () => {
    const q = parseODataQuery({
      "$search": "name:A",
      "$compute": "price + 1, concat(name,'-')",
      "$apply": "filter(price gt 10)/groupby((categoryId))",
      "@p1": "'Active'",
    });

    expect(q.search).toBe("name:A");
    expect(q.compute).toEqual(["price + 1", "concat(name,'-')"]);
    expect(Array.isArray(q.apply) ? q.apply : [q.apply]).toEqual([
      "filter(price gt 10)",
      "groupby((categoryId))",
    ]);
    expect(q.parameterAliases).toStrictEqual({ "@p1": "'Active'" });
  });
});
