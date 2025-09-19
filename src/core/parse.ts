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

  const search = query["$search"];
  if (typeof search === "string" && search.trim()) {
    opts.search = search.trim();
  }

  const compute = query["$compute"];
  if (typeof compute === "string" && compute.trim()) {
    const expressions = splitTopLevel(compute, ',');
    if (expressions.length > 0) {
      opts.compute = expressions;
    }
  }

  const apply = query["$apply"];
  if (typeof apply === "string" && apply.trim()) {
    const steps = splitTopLevel(apply, '/');
    if (steps.length === 1) {
      opts.apply = steps[0];
    } else if (steps.length > 1) {
      opts.apply = steps;
    }
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

function splitTopLevel(value: string, separator: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === "'") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (!inQuotes) {
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth = Math.max(0, depth - 1);
      }

      if (char === separator && depth === 0) {
        const segment = current.trim();
        if (segment) {
          parts.push(segment);
        }
        current = "";
        continue;
      }
    }

    current += char;
  }

  const lastSegment = current.trim();
  if (lastSegment) {
    parts.push(lastSegment);
  }

  return parts;
}
