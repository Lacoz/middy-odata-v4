var v = Object.defineProperty;
var S = (t, n, r) => n in t ? v(t, n, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[n] = r;
var d = (t, n, r) => S(t, typeof n != "symbol" ? n + "" : n, r);
function b(t) {
  const n = {}, r = t.$select;
  r && (n.select = r.split(",").map((p) => p.trim()).filter(Boolean));
  const e = t.$orderby;
  e && (n.orderby = e.split(",").map((p) => {
    const [y, w] = p.trim().split(/\s+/);
    return { property: y, direction: w?.toLowerCase() === "desc" ? "desc" : "asc" };
  }));
  const o = t.$top;
  o !== void 0 && (n.top = Math.max(0, Number(o)));
  const i = t.$skip;
  i !== void 0 && (n.skip = Math.max(0, Number(i)));
  const s = t.$count;
  s !== void 0 && (n.count = String(s).toLowerCase() === "true");
  const u = t.$filter;
  u && (n.filter = u);
  const c = t.$expand;
  return c && (n.expand = c.split(",").map((p) => ({ path: p.trim() }))), n;
}
function C(t) {
  return {
    before: async (n) => {
      const r = n.event ?? {}, e = r.rawQueryString ? Object.fromEntries(new URLSearchParams(r.rawQueryString)) : r.queryStringParameters || {}, o = b(e), i = typeof t.serviceRoot == "function" ? t.serviceRoot(r) : t.serviceRoot, s = {
        model: t.model,
        serviceRoot: i,
        entitySet: void 0,
        options: o
      };
      n.internal = n.internal || {}, n.internal.odata = s;
    }
  };
}
class a extends Error {
  constructor() {
    super(...arguments);
    d(this, "statusCode", 400);
    d(this, "code", "BadRequest");
  }
}
class h extends Error {
  constructor() {
    super(...arguments);
    d(this, "statusCode", 500);
    d(this, "code", "InternalServerError");
  }
}
function I(t, n) {
  if (t && typeof t == "object" && "statusCode" in t && "message" in t) {
    const r = t;
    return { error: { code: r.code ?? String(r.statusCode), message: r.message } };
  }
  return { error: { code: "InternalServerError", message: n ?? "An error occurred" } };
}
function O(t, n, r) {
  if (!t || t.length === 0) return;
  const e = r.entityTypes?.find((i) => i.name === n);
  if (!e)
    throw new a(`Entity type '${n}' not found`);
  const o = e.properties?.map((i) => i.name) || [];
  for (const i of t)
    if (!o.includes(i))
      throw new a(`Property '${i}' not found in entity type '${n}'`);
}
function M(t, n, r) {
  if (!t) return;
  if (t.includes("()"))
    throw new a("Invalid filter expression: empty parentheses");
  if (t.includes("  "))
    throw new a("Invalid filter expression: multiple spaces");
  let e = 0;
  for (const c of t)
    if (c === "(" && e++, c === ")" && e--, e < 0)
      throw new a("Invalid filter expression: unmatched closing parenthesis");
  if (e !== 0)
    throw new a("Invalid filter expression: unmatched opening parenthesis");
  const o = r.entityTypes?.find((c) => c.name === n);
  if (!o)
    throw new a(`Entity type '${n}' not found`);
  const i = o.properties?.map((c) => c.name) || [], u = t.replace(/'[^']*'/g, "").match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) || [];
  for (const c of u)
    if (!["eq", "ne", "gt", "ge", "lt", "le", "and", "or", "not", "true", "false", "null"].includes(c) && !i.includes(c))
      throw new a(`Property '${c}' not found in entity type '${n}'`);
}
function R(t, n, r) {
  if (!t || t.length === 0) return;
  const e = r.entityTypes?.find((i) => i.name === n);
  if (!e)
    throw new a(`Entity type '${n}' not found`);
  const o = e.properties?.map((i) => i.name) || [];
  for (const i of t) {
    const [s] = i.split(" ");
    if (!o.includes(s))
      throw new a(`Property '${s}' not found in entity type '${n}'`);
  }
}
function A(t, n, r) {
  if (!t || t.length === 0) return;
  const e = r.entityTypes?.find((i) => i.name === n);
  if (!e)
    throw new a(`Entity type '${n}' not found`);
  const o = e.navigation?.map((i) => i.name) || [];
  for (const i of t)
    if (!o.includes(i))
      throw new a(`Navigation property '${i}' not found in entity type '${n}'`);
}
function T(t, n, r) {
  const e = r.entityTypes?.find((i) => i.name === n);
  if (!e)
    throw new a(`Entity type '${n}' not found`);
  const o = e.properties?.filter((i) => i.nullable !== !0) || [];
  for (const i of o)
    if (!(i.name in t) || t[i.name] === null || t[i.name] === void 0)
      throw new a(`Required property '${i.name}' is missing or null`);
  for (const i of e.properties || [])
    if (i.name in t) {
      const s = t[i.name];
      if (s != null) {
        if (i.type === "Edm.String" && typeof s != "string")
          throw new a(`Property '${i.name}' must be a string`);
        if ((i.type === "Edm.Int32" || i.type === "Edm.Decimal") && typeof s != "number")
          throw new a(`Property '${i.name}' must be a number`);
        if (i.type === "Edm.Boolean" && typeof s != "boolean")
          throw new a(`Property '${i.name}' must be a boolean`);
      }
    }
}
function B(t) {
  return t instanceof a ? 400 : (t instanceof h, 500);
}
function W(t) {
  return t instanceof a;
}
function j(t) {
  return t instanceof h;
}
function N(t, n) {
  if (!n || n.length === 0) return { ...t };
  const r = {};
  for (const e of n) e in t && (r[e] = t[e]);
  return r;
}
function k(t, n) {
  return t.map((r) => N(r, n.select));
}
function g(t, n) {
  if (!n.expand || n.expand.length === 0)
    return t;
  if (Array.isArray(t))
    return t.map((e) => g(e, n));
  const r = { ...t };
  for (const e of n.expand) {
    const o = e.path;
    if (o && !(o in r) && (r[o] = null), e.options) {
      const i = r[o];
      i && (r[o] = g(i, e.options));
    }
  }
  return r;
}
function f(t) {
  if (t.includes(" and ")) {
    const r = m(t, " and ");
    return {
      type: "logical",
      operator: "and",
      left: f(r[0].trim()),
      right: f(r[1].trim())
    };
  }
  if (t.includes(" or ")) {
    const r = m(t, " or ");
    return {
      type: "logical",
      operator: "or",
      left: f(r[0].trim()),
      right: f(r[1].trim())
    };
  }
  const n = [" eq ", " ne ", " gt ", " ge ", " lt ", " le "];
  for (const r of n)
    if (t.includes(r)) {
      const e = t.split(r);
      if (e.length === 2)
        return {
          type: "comparison",
          operator: r.trim(),
          left: f(e[0].trim()),
          right: f(e[1].trim())
        };
    }
  if (t.includes("(") && t.includes(")")) {
    const r = t.match(/^(\w+)\((.+)\)$/);
    if (r) {
      const [, e, o] = r, i = o.split(",").map((s) => f(s.trim()));
      return {
        type: "function",
        function: e,
        args: i
      };
    }
  }
  return t.startsWith("'") && t.endsWith("'") ? {
    type: "literal",
    value: t.slice(1, -1)
  } : t === "null" ? {
    type: "literal",
    value: null
  } : isNaN(Number(t)) ? {
    type: "property",
    property: t
  } : {
    type: "literal",
    value: Number(t)
  };
}
function m(t, n) {
  let r = 0, e = !1;
  for (let o = 0; o < t.length - n.length + 1; o++) {
    const i = t[o];
    if (i === "'" && (e = !e), !e && (i === "(" && r++, i === ")" && r--, r === 0 && t.slice(o, o + n.length) === n))
      return [t.slice(0, o), t.slice(o + n.length)];
  }
  return [t];
}
function l(t, n) {
  switch (t.type) {
    case "property":
      return $(n, t.property);
    case "literal":
      return t.value;
    case "comparison": {
      const r = l(t.left, n), e = l(t.right, n);
      return E(r, t.operator, e);
    }
    case "logical": {
      const r = l(t.left, n), e = l(t.right, n);
      return D(r, t.operator, e);
    }
    case "function":
      return P(t.function, t.args, n);
    default:
      return !1;
  }
}
function $(t, n) {
  const r = n.split("/");
  let e = t;
  for (const o of r)
    if (e && typeof e == "object")
      e = e[o];
    else
      return;
  return e;
}
function E(t, n, r) {
  switch (n) {
    case "eq":
      return t === r;
    case "ne":
      return t !== r;
    case "gt":
      return t > r;
    case "ge":
      return t >= r;
    case "lt":
      return t < r;
    case "le":
      return t <= r;
    default:
      return !1;
  }
}
function D(t, n, r) {
  switch (n) {
    case "and":
      return t && r;
    case "or":
      return t || r;
    default:
      return !1;
  }
}
function P(t, n, r) {
  const e = n.map((o) => l(o, r));
  switch (t) {
    case "contains":
      if (e.length >= 2) {
        const o = String(e[0] || ""), i = String(e[1] || "");
        return o.includes(i);
      }
      return !1;
    case "startswith":
      if (e.length >= 2) {
        const o = String(e[0] || ""), i = String(e[1] || "");
        return o.startsWith(i);
      }
      return !1;
    case "endswith":
      if (e.length >= 2) {
        const o = String(e[0] || ""), i = String(e[1] || "");
        return o.endsWith(i);
      }
      return !1;
    case "length":
      return e.length >= 1 ? String(e[0] || "").length : 0;
    case "tolower":
      return e.length >= 1 ? String(e[0] || "").toLowerCase() : "";
    case "toupper":
      return e.length >= 1 ? String(e[0] || "").toUpperCase() : "";
    case "trim":
      return e.length >= 1 ? String(e[0] || "").trim() : "";
    case "substring":
      if (e.length >= 2) {
        const o = String(e[0] || ""), i = Number(e[1]) || 0;
        if (e.length >= 3) {
          const s = Number(e[2]) || 0;
          return o.substring(i, i + s);
        }
        return o.substring(i);
      }
      return "";
    case "indexof":
      if (e.length >= 2) {
        const o = String(e[0] || ""), i = String(e[1] || "");
        return o.indexOf(i);
      }
      return -1;
    case "concat":
      return e.map((o) => String(o || "")).join("");
    case "year":
      if (e.length >= 1) {
        const o = new Date(e[0]);
        return isNaN(o.getTime()) ? 0 : o.getFullYear();
      }
      return 0;
    case "month":
      if (e.length >= 1) {
        const o = new Date(e[0]);
        return isNaN(o.getTime()) ? 0 : o.getMonth() + 1;
      }
      return 0;
    case "day":
      if (e.length >= 1) {
        const o = new Date(e[0]);
        return isNaN(o.getTime()) ? 0 : o.getDate();
      }
      return 0;
    case "hour":
      if (e.length >= 1) {
        const o = new Date(e[0]);
        return isNaN(o.getTime()) ? 0 : o.getHours();
      }
      return 0;
    case "minute":
      if (e.length >= 1) {
        const o = new Date(e[0]);
        return isNaN(o.getTime()) ? 0 : o.getMinutes();
      }
      return 0;
    case "second":
      if (e.length >= 1) {
        const o = new Date(e[0]);
        return isNaN(o.getTime()) ? 0 : o.getSeconds();
      }
      return 0;
    case "round":
      return e.length >= 1 ? Math.round(Number(e[0]) || 0) : 0;
    case "floor":
      return e.length >= 1 ? Math.floor(Number(e[0]) || 0) : 0;
    case "ceiling":
      return e.length >= 1 ? Math.ceil(Number(e[0]) || 0) : 0;
    case "now":
      return (/* @__PURE__ */ new Date()).toISOString();
    case "maxdatetime":
      return (/* @__PURE__ */ new Date("9999-12-31T23:59:59.999Z")).toISOString();
    case "mindatetime":
      return (/* @__PURE__ */ new Date("0001-01-01T00:00:00.000Z")).toISOString();
    default:
      return !1;
  }
}
function F(t, n) {
  if (!n.filter) return t;
  try {
    const r = f(n.filter);
    return t.filter((e) => l(r, e));
  } catch (r) {
    return console.warn("Filter parsing failed:", r), t;
  }
}
function L(t, n) {
  if (!n.orderby || n.orderby.length === 0) return t;
  const r = [...t];
  return r.sort((e, o) => {
    for (const i of n.orderby) {
      const s = e[i.property], u = o[i.property];
      if (!(s == null && u == null)) {
        if (s == null) return i.direction === "asc" ? -1 : 1;
        if (u == null) return i.direction === "asc" ? 1 : -1;
        if (s < u) return i.direction === "asc" ? -1 : 1;
        if (s > u) return i.direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  }), r;
}
function Q(t, n) {
  const r = n.skip ?? 0, e = n.top ?? t.length;
  return t.slice(r, r + e);
}
function Z(t, n, r, e) {
  const o = {
    "@odata.context": t,
    value: n
  };
  return typeof r == "number" && (o["@odata.count"] = r), e && (o["@odata.nextLink"] = e), o;
}
export {
  a as ODataBadRequest,
  h as ODataInternalServerError,
  N as applySelect,
  g as expandData,
  F as filterArray,
  B as getHttpStatusCode,
  j as isServerError,
  W as isValidationError,
  C as odata,
  L as orderArray,
  Q as paginateArray,
  b as parseODataQuery,
  k as projectArray,
  Z as serializeCollection,
  I as toODataError,
  T as validateEdmModelConstraints,
  A as validateExpandNavigationProperties,
  M as validateFilterExpression,
  R as validateOrderByProperties,
  O as validateSelectParameters
};
//# sourceMappingURL=index.mjs.map
