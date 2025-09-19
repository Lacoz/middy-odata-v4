import type { ODataQueryOptions } from "./types";

export function parseODataQuery(query: Record<string, string | undefined>): ODataQueryOptions {
  const opts: ODataQueryOptions = {};
  const sel = query["$select"];
  if (sel) opts.select = sel.split(",").map((s) => s.trim()).filter(Boolean);
  const orderby = query["$orderby"];
  if (orderby) {
    opts.orderby = orderby.split(",").map((term) => {
      const [prop, dir] = term.trim().split(/\s+/);
      return { property: prop, direction: (dir?.toLowerCase() === "desc" ? "desc" : "asc") };
    });
  }
  const top = query["$top"];
  if (top !== undefined) opts.top = Math.max(0, Number(top));
  const skip = query["$skip"];
  if (skip !== undefined) opts.skip = Math.max(0, Number(skip));
  const count = query["$count"];
  if (count !== undefined) opts.count = String(count).toLowerCase() === "true";
  const filter = query["$filter"];
  if (filter) opts.filter = filter;
  const expand = query["$expand"];
  if (expand) {
    opts.expand = expand.split(",").map((e) => ({ path: e.trim() }));
  }

  const parameterAliases: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("@") && typeof value === "string") {
      parameterAliases[key] = value;
    }
  }

  if (Object.keys(parameterAliases).length > 0) {
    opts.parameterAliases = parameterAliases;
  }
  return opts;
}
