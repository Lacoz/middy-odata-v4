import { describe, expect, it } from "vitest";
import { applyODataQuery } from "../src/core/apply-query";
import { createODataResponse } from "../src/middleware/response";
import { createODataLogger } from "../src/middleware/logger";
import type { ODataMiddlewareContext } from "../src/middleware/types";
import type { ODataQueryOptions, EdmModel } from "../src/core/types";

interface Person {
  id: number;
  name: string;
  age: number;
}

describe("applyODataQuery helper", () => {
  it("applies filter, ordering, pagination and selection similar to ODataQueryOptions.ApplyTo", () => {
    const people: Person[] = [
      { id: 1, name: "Alice", age: 30 },
      { id: 2, name: "Bob", age: 20 },
      { id: 3, name: "Charlie", age: 16 },
    ];

    const options: ODataQueryOptions = {
      filter: "age ge 18",
      orderby: [{ property: "age", direction: "desc" }],
      skip: 1,
      top: 1,
      select: ["name"],
      count: true,
    };

    const result = applyODataQuery(people, options);

    expect(result.value).toEqual([{ name: "Bob" }]);
    expect(result.count).toBe(2);
  });
});

describe("createODataResponse helper", () => {
  it("builds an OData-compliant collection response", () => {
    const options: ODataQueryOptions = {
      filter: "age ge 18",
      orderby: [{ property: "age", direction: "desc" }],
      skip: 1,
      top: 1,
      select: ["name"],
      count: true,
    };

    const context: ODataMiddlewareContext = {
      model: { entityTypes: [], entitySets: [] } as unknown as EdmModel,
      serviceRoot: "https://api.example.com/odata",
      entitySet: "People",
      options,
      logger: createODataLogger({ level: "silent" }),
    };

    const data = [{ name: "Bob" }];
    const response = createODataResponse(context, { value: data, count: 2 });

    expect(response.statusCode).toBe(200);
    expect(response.headers["Content-Type"]).toBe("application/json");
    expect(response.headers["OData-Version"]).toBe("4.01");

    const payload = JSON.parse(response.body) as Record<string, unknown>;
    expect(payload["@odata.context"]).toBe("https://api.example.com/odata/$metadata#People");
    expect(payload["@odata.count"]).toBe(2);
    expect(payload.value).toEqual(data);
  });
});
