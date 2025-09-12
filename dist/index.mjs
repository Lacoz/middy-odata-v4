var p = Object.defineProperty;
var m = (t, r, e) => r in t ? p(t, r, { enumerable: !0, configurable: !0, writable: !0, value: e }) : t[r] = e;
var u = (t, r, e) => m(t, typeof r != "symbol" ? r + "" : r, e);
function y(t) {
  const r = {}, e = t.$select;
  e && (r.select = e.split(",").map((s) => s.trim()).filter(Boolean));
  const n = t.$orderby;
  n && (r.orderby = n.split(",").map((s) => {
    const [d, l] = s.trim().split(/\s+/);
    return { property: d, direction: l?.toLowerCase() === "desc" ? "desc" : "asc" };
  }));
  const i = t.$top;
  i !== void 0 && (r.top = Math.max(0, Number(i)));
  const o = t.$skip;
  o !== void 0 && (r.skip = Math.max(0, Number(o)));
  const c = t.$count;
  c !== void 0 && (r.count = String(c).toLowerCase() === "true");
  const a = t.$filter;
  a && (r.filter = a);
  const f = t.$expand;
  return f && (r.expand = Object.fromEntries(f.split(",").map((s) => [s.trim(), {}]))), r;
}
function g(t) {
  return {
    before: async (r) => {
      const e = r.event ?? {}, n = e.rawQueryString ? Object.fromEntries(new URLSearchParams(e.rawQueryString)) : e.queryStringParameters || {}, i = y(n), o = typeof t.serviceRoot == "function" ? t.serviceRoot(e) : t.serviceRoot, c = {
        model: t.model,
        serviceRoot: o,
        entitySet: void 0,
        options: i
      };
      r.internal = r.internal || {}, r.internal.odata = c;
    }
  };
}
class S extends Error {
  constructor() {
    super(...arguments);
    u(this, "statusCode", 400);
    u(this, "code", "BadRequest");
  }
}
class x extends Error {
  constructor() {
    super(...arguments);
    u(this, "statusCode", 500);
    u(this, "code", "InternalServerError");
  }
}
function E(t, r) {
  if (t && typeof t == "object" && "statusCode" in t && "message" in t) {
    const e = t;
    return { error: { code: e.code ?? String(e.statusCode), message: e.message } };
  }
  return { error: { code: "InternalServerError", message: r ?? "An error occurred" } };
}
function v(t, r) {
  if (!r || r.length === 0) return { ...t };
  const e = {};
  for (const n of r) n in t && (e[n] = t[n]);
  return e;
}
function C(t, r) {
  return t.map((e) => v(e, r.select));
}
function R(t, r) {
  return r.filter, t;
}
function $(t, r) {
  if (!r.orderby || r.orderby.length === 0) return t;
  const e = [...t];
  return e.sort((n, i) => {
    for (const o of r.orderby) {
      const c = n[o.property], a = i[o.property];
      if (!(c == null && a == null)) {
        if (c == null) return o.direction === "asc" ? -1 : 1;
        if (a == null) return o.direction === "asc" ? 1 : -1;
        if (c < a) return o.direction === "asc" ? -1 : 1;
        if (c > a) return o.direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  }), e;
}
function h(t, r) {
  const e = r.skip ?? 0, n = r.top ?? t.length;
  return t.slice(e, e + n);
}
function O(t, r, e, n) {
  const i = {
    "@odata.context": t,
    value: r
  };
  return typeof e == "number" && (i["@odata.count"] = e), n && (i["@odata.nextLink"] = n), i;
}
export {
  S as ODataBadRequest,
  x as ODataInternalServerError,
  v as applySelect,
  R as filterArray,
  g as odata,
  $ as orderArray,
  h as paginateArray,
  y as parseODataQuery,
  C as projectArray,
  O as serializeCollection,
  E as toODataError
};
//# sourceMappingURL=index.mjs.map
