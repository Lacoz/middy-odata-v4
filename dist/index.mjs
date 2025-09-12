var y = Object.defineProperty;
var S = (t, n, r) => n in t ? y(t, n, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[n] = r;
var f = (t, n, r) => S(t, typeof n != "symbol" ? n + "" : n, r);
function b(t) {
  const n = {}, r = t.$select;
  r && (n.select = r.split(",").map((l) => l.trim()).filter(Boolean));
  const e = t.$orderby;
  e && (n.orderby = e.split(",").map((l) => {
    const [m, h] = l.trim().split(/\s+/);
    return { property: m, direction: h?.toLowerCase() === "desc" ? "desc" : "asc" };
  }));
  const s = t.$top;
  s !== void 0 && (n.top = Math.max(0, Number(s)));
  const o = t.$skip;
  o !== void 0 && (n.skip = Math.max(0, Number(o)));
  const a = t.$count;
  a !== void 0 && (n.count = String(a).toLowerCase() === "true");
  const c = t.$filter;
  c && (n.filter = c);
  const g = t.$expand;
  return g && (n.expand = g.split(",").map((l) => ({ path: l.trim() }))), n;
}
function C(t) {
  return {
    before: async (n) => {
      const r = n.event ?? {}, e = r.rawQueryString ? Object.fromEntries(new URLSearchParams(r.rawQueryString)) : r.queryStringParameters || {}, s = b(e), o = typeof t.serviceRoot == "function" ? t.serviceRoot(r) : t.serviceRoot, a = {
        model: t.model,
        serviceRoot: o,
        entitySet: void 0,
        options: s
      };
      n.internal = n.internal || {}, n.internal.odata = a;
    }
  };
}
class E extends Error {
  constructor() {
    super(...arguments);
    f(this, "statusCode", 400);
    f(this, "code", "BadRequest");
  }
}
class R extends Error {
  constructor() {
    super(...arguments);
    f(this, "statusCode", 500);
    f(this, "code", "InternalServerError");
  }
}
function M(t, n) {
  if (t && typeof t == "object" && "statusCode" in t && "message" in t) {
    const r = t;
    return { error: { code: r.code ?? String(r.statusCode), message: r.message } };
  }
  return { error: { code: "InternalServerError", message: n ?? "An error occurred" } };
}
function v(t, n) {
  if (!n || n.length === 0) return { ...t };
  const r = {};
  for (const e of n) e in t && (r[e] = t[e]);
  return r;
}
function T(t, n) {
  return t.map((r) => v(r, n.select));
}
function p(t, n) {
  if (!n.expand || n.expand.length === 0)
    return t;
  if (Array.isArray(t))
    return t.map((e) => p(e, n));
  const r = { ...t };
  for (const e of n.expand) {
    const s = e.path;
    if (s && !(s in r) && (r[s] = null), e.options) {
      const o = r[s];
      o && (r[s] = p(o, e.options));
    }
  }
  return r;
}
function i(t) {
  if (t.includes(" and ")) {
    const r = d(t, " and ");
    return {
      type: "logical",
      operator: "and",
      left: i(r[0].trim()),
      right: i(r[1].trim())
    };
  }
  if (t.includes(" or ")) {
    const r = d(t, " or ");
    return {
      type: "logical",
      operator: "or",
      left: i(r[0].trim()),
      right: i(r[1].trim())
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
          left: i(e[0].trim()),
          right: i(e[1].trim())
        };
    }
  if (t.includes("(") && t.includes(")")) {
    const r = t.match(/^(\w+)\((.+)\)$/);
    if (r) {
      const [, e, s] = r, o = s.split(",").map((a) => i(a.trim()));
      return {
        type: "function",
        function: e,
        args: o
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
function d(t, n) {
  let r = 0, e = !1;
  for (let s = 0; s < t.length - n.length + 1; s++) {
    const o = t[s];
    if (o === "'" && (e = !e), !e && (o === "(" && r++, o === ")" && r--, r === 0 && t.slice(s, s + n.length) === n))
      return [t.slice(0, s), t.slice(s + n.length)];
  }
  return [t];
}
function u(t, n) {
  switch (t.type) {
    case "property":
      return N(n, t.property);
    case "literal":
      return t.value;
    case "comparison": {
      const r = u(t.left, n), e = u(t.right, n);
      return w(r, t.operator, e);
    }
    case "logical": {
      const r = u(t.left, n), e = u(t.right, n);
      return D(r, t.operator, e);
    }
    case "function":
      return x(t.function, t.args, n);
    default:
      return !1;
  }
}
function N(t, n) {
  const r = n.split("/");
  let e = t;
  for (const s of r)
    if (e && typeof e == "object")
      e = e[s];
    else
      return;
  return e;
}
function w(t, n, r) {
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
function x(t, n, r) {
  const e = n.map((s) => u(s, r));
  switch (t) {
    case "contains":
      if (e.length >= 2) {
        const s = String(e[0] || ""), o = String(e[1] || "");
        return s.includes(o);
      }
      return !1;
    case "startswith":
      if (e.length >= 2) {
        const s = String(e[0] || ""), o = String(e[1] || "");
        return s.startsWith(o);
      }
      return !1;
    case "endswith":
      if (e.length >= 2) {
        const s = String(e[0] || ""), o = String(e[1] || "");
        return s.endsWith(o);
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
        const s = String(e[0] || ""), o = Number(e[1]) || 0;
        if (e.length >= 3) {
          const a = Number(e[2]) || 0;
          return s.substring(o, o + a);
        }
        return s.substring(o);
      }
      return "";
    case "indexof":
      if (e.length >= 2) {
        const s = String(e[0] || ""), o = String(e[1] || "");
        return s.indexOf(o);
      }
      return -1;
    case "concat":
      return e.map((s) => String(s || "")).join("");
    case "year":
      if (e.length >= 1) {
        const s = new Date(e[0]);
        return isNaN(s.getTime()) ? 0 : s.getFullYear();
      }
      return 0;
    case "month":
      if (e.length >= 1) {
        const s = new Date(e[0]);
        return isNaN(s.getTime()) ? 0 : s.getMonth() + 1;
      }
      return 0;
    case "day":
      if (e.length >= 1) {
        const s = new Date(e[0]);
        return isNaN(s.getTime()) ? 0 : s.getDate();
      }
      return 0;
    case "hour":
      if (e.length >= 1) {
        const s = new Date(e[0]);
        return isNaN(s.getTime()) ? 0 : s.getHours();
      }
      return 0;
    case "minute":
      if (e.length >= 1) {
        const s = new Date(e[0]);
        return isNaN(s.getTime()) ? 0 : s.getMinutes();
      }
      return 0;
    case "second":
      if (e.length >= 1) {
        const s = new Date(e[0]);
        return isNaN(s.getTime()) ? 0 : s.getSeconds();
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
function $(t, n) {
  if (!n.filter) return t;
  try {
    const r = i(n.filter);
    return t.filter((e) => u(r, e));
  } catch (r) {
    return console.warn("Filter parsing failed:", r), t;
  }
}
function A(t, n) {
  if (!n.orderby || n.orderby.length === 0) return t;
  const r = [...t];
  return r.sort((e, s) => {
    for (const o of n.orderby) {
      const a = e[o.property], c = s[o.property];
      if (!(a == null && c == null)) {
        if (a == null) return o.direction === "asc" ? -1 : 1;
        if (c == null) return o.direction === "asc" ? 1 : -1;
        if (a < c) return o.direction === "asc" ? -1 : 1;
        if (a > c) return o.direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  }), r;
}
function I(t, n) {
  const r = n.skip ?? 0, e = n.top ?? t.length;
  return t.slice(r, r + e);
}
function j(t, n, r, e) {
  const s = {
    "@odata.context": t,
    value: n
  };
  return typeof r == "number" && (s["@odata.count"] = r), e && (s["@odata.nextLink"] = e), s;
}
export {
  E as ODataBadRequest,
  R as ODataInternalServerError,
  v as applySelect,
  p as expandData,
  $ as filterArray,
  C as odata,
  A as orderArray,
  I as paginateArray,
  b as parseODataQuery,
  T as projectArray,
  j as serializeCollection,
  M as toODataError
};
//# sourceMappingURL=index.mjs.map
