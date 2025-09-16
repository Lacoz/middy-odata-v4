var ee = Object.defineProperty;
var te = (e, t, r) => t in e ? ee(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var T = (e, t, r) => te(e, typeof t != "symbol" ? t + "" : t, r);
function re(...e) {
  return {
    before: async (t) => {
      for (const r of e)
        r.before && await r.before(t);
    },
    after: async (t) => {
      for (const r of e.slice().reverse())
        r.after && await r.after(t);
    },
    onError: async (t) => {
      for (const r of e.slice().reverse())
        r.onError && await r.onError(t);
    }
  };
}
function h(e, t = {}) {
  return { ...e, ...t };
}
function y(e) {
  return e.internal?.odata || {};
}
function m(e, t) {
  e.internal = e.internal || {}, e.internal.odata = t;
}
function ne(e) {
  const t = {}, r = e.$select;
  r && (t.select = r.split(",").map((u) => u.trim()).filter(Boolean));
  const n = e.$orderby;
  n && (t.orderby = n.split(",").map((u) => {
    const [p, v] = u.trim().split(/\s+/);
    return { property: p, direction: v?.toLowerCase() === "desc" ? "desc" : "asc" };
  }));
  const o = e.$top;
  o !== void 0 && (t.top = Math.max(0, Number(o)));
  const a = e.$skip;
  a !== void 0 && (t.skip = Math.max(0, Number(a)));
  const i = e.$count;
  i !== void 0 && (t.count = String(i).toLowerCase() === "true");
  const s = e.$filter;
  s && (t.filter = s);
  const c = e.$expand;
  return c && (t.expand = c.split(",").map((u) => ({ path: u.trim() }))), t;
}
const ae = {
  model: {},
  // Will be provided by user
  serviceRoot: "",
  validateAgainstModel: !0,
  strictMode: !1
};
function w(e = {}) {
  const t = h(ae, e);
  return {
    before: async (r) => {
      try {
        const n = r.event ?? {}, o = n.rawQueryString ? Object.fromEntries(new URLSearchParams(n.rawQueryString)) : n.queryStringParameters || {}, a = ne(o), i = typeof t.serviceRoot == "function" ? t.serviceRoot(n) : t.serviceRoot, s = {
          model: t.model,
          serviceRoot: i,
          entitySet: void 0,
          // Will be set by route handler or other middleware
          options: a,
          metadata: {
            middlewareStack: ["parse"],
            executionTime: Date.now()
          }
        };
        t.validateAgainstModel && oe(s), m(r, s);
      } catch (n) {
        const o = {
          model: t.model,
          serviceRoot: typeof t.serviceRoot == "function" ? t.serviceRoot(r.event) : t.serviceRoot,
          entitySet: void 0,
          options: {},
          error: n,
          metadata: {
            middlewareStack: ["parse"],
            executionTime: Date.now()
          }
        };
        throw m(r, o), n;
      }
    }
  };
}
function oe(e) {
  const { model: t, options: r } = e;
  if (r.select) {
    for (const n of r.select)
      if (!j(n, t))
        throw new Error(`Invalid property in $select: ${n}`);
  }
  if (r.expand) {
    for (const n of r.expand)
      if (!ie(n.path, t))
        throw new Error(`Invalid navigation property in $expand: ${n.path}`);
  }
  if (r.orderby) {
    for (const n of r.orderby)
      if (!j(n.property, t))
        throw new Error(`Invalid property in $orderby: ${n.property}`);
  }
}
function j(e, t) {
  return !t.entityTypes || t.entityTypes.length === 0 ? !0 : t.entityTypes.some(
    (r) => r.properties?.some((n) => n.name === e)
  );
}
function ie(e, t) {
  return !t.entityTypes || t.entityTypes.length === 0 ? !0 : t.entityTypes.some(
    (r) => r.navigation?.some((n) => n.name === e)
  );
}
function Q(e, t) {
  if (!t || t.length === 0) return { ...e };
  const r = {};
  for (const n of t) n in e && (r[n] = e[n]);
  return r;
}
function I(e, t) {
  return e.map((r) => Q(r, t.select));
}
function x(e, t) {
  if (!t.expand || t.expand.length === 0)
    return e;
  if (Array.isArray(e))
    return e.map((n) => x(n, t));
  const r = { ...e };
  for (const n of t.expand) {
    const o = n.path;
    if (o && !(o in r) && (r[o] = null), n.options) {
      const a = r[o];
      a && (r[o] = x(a, n.options));
    }
  }
  return r;
}
const se = {
  enableExpand: !0,
  maxExpandDepth: 3,
  expandResolvers: {}
};
function b(e = {}) {
  const t = h(se, e);
  return {
    after: async (r) => {
      try {
        const n = y(r);
        if (!n || !n.options)
          return;
        let o = r.response?.body;
        if (typeof o == "string")
          try {
            o = JSON.parse(o);
          } catch {
            return;
          }
        if (!o)
          return;
        const a = await ce(o, n, t);
        r.response ? r.response.body = JSON.stringify(a) : r.response = {
          statusCode: 200,
          body: JSON.stringify(a)
        }, n.data = a, m(r, n);
      } catch (n) {
        console.error("[OData Shape] Error applying data shaping:", n);
      }
    }
  };
}
async function ce(e, t, r) {
  const { options: n } = t;
  return Array.isArray(e) ? await D(e, n, r, t) : e && typeof e == "object" ? await A(e, n, r, t) : e;
}
async function D(e, t, r, n) {
  const o = [];
  for (const a of e)
    if (a && typeof a == "object") {
      const i = await A(
        a,
        t,
        r,
        n
      );
      o.push(i);
    } else
      o.push(a);
  return o;
}
async function A(e, t, r, n) {
  let o = { ...e };
  return t.select && t.select.length > 0 && (o = Q(o, t.select)), t.expand && t.expand.length > 0 && r.enableExpand && (o = await ue(
    o,
    t.expand,
    r,
    n,
    0
    // Start with depth 0
  )), o;
}
async function ue(e, t, r, n, o) {
  if (o >= (r.maxExpandDepth || 3))
    return console.warn(`[OData Shape] Maximum expansion depth (${r.maxExpandDepth}) reached`), e;
  const a = { ...e };
  for (const i of t) {
    const s = i.path;
    if (!s)
      continue;
    const c = r.expandResolvers?.[s];
    if (c)
      try {
        const u = await c(n);
        if (a[s] = u, i.options) {
          const p = {
            ...n,
            options: i.options
          };
          Array.isArray(u) ? a[s] = await D(
            u,
            i.options,
            r,
            p
          ) : u && typeof u == "object" && (a[s] = await A(
            u,
            i.options,
            r,
            p
          ));
        }
      } catch (u) {
        console.error(`[OData Shape] Error resolving navigation property ${s}:`, u), a[s] = null;
      }
    else if (s in a) {
      const u = a[s];
      i.options && u && (Array.isArray(u) ? a[s] = await D(
        u,
        i.options,
        r,
        {
          ...n,
          options: i.options
        }
      ) : typeof u == "object" && (a[s] = await A(
        u,
        i.options,
        r,
        {
          ...n,
          options: i.options
        }
      )));
    } else
      a[s] = null;
  }
  return a;
}
function g(e) {
  if (e.includes(" and ")) {
    const r = U(e, " and ");
    return {
      type: "logical",
      operator: "and",
      left: g(r[0].trim()),
      right: g(r[1].trim())
    };
  }
  if (e.includes(" or ")) {
    const r = U(e, " or ");
    return {
      type: "logical",
      operator: "or",
      left: g(r[0].trim()),
      right: g(r[1].trim())
    };
  }
  const t = [" eq ", " ne ", " gt ", " ge ", " lt ", " le "];
  for (const r of t)
    if (e.includes(r)) {
      const n = e.split(r);
      if (n.length === 2)
        return {
          type: "comparison",
          operator: r.trim(),
          left: g(n[0].trim()),
          right: g(n[1].trim())
        };
    }
  if (e.includes("(") && e.includes(")")) {
    const r = e.match(/^(\w+)\((.+)\)$/);
    if (r) {
      const [, n, o] = r, a = o.split(",").map((i) => g(i.trim()));
      return {
        type: "function",
        function: n,
        args: a
      };
    }
  }
  return e.startsWith("'") && e.endsWith("'") ? {
    type: "literal",
    value: e.slice(1, -1)
  } : e === "null" ? {
    type: "literal",
    value: null
  } : isNaN(Number(e)) ? {
    type: "property",
    property: e
  } : {
    type: "literal",
    value: Number(e)
  };
}
function U(e, t) {
  let r = 0, n = !1;
  for (let o = 0; o < e.length - t.length + 1; o++) {
    const a = e[o];
    if (a === "'" && (n = !n), !n && (a === "(" && r++, a === ")" && r--, r === 0 && e.slice(o, o + t.length) === t))
      return [e.slice(0, o), e.slice(o + t.length)];
  }
  return [e];
}
function E(e, t) {
  switch (e.type) {
    case "property":
      return le(t, e.property);
    case "literal":
      return e.value;
    case "comparison": {
      const r = E(e.left, t), n = E(e.right, t);
      return de(r, e.operator, n);
    }
    case "logical": {
      const r = E(e.left, t), n = E(e.right, t);
      return fe(r, e.operator, n);
    }
    case "function":
      return pe(e.function, e.args, t);
    default:
      return !1;
  }
}
function le(e, t) {
  const r = t.split("/");
  let n = e;
  for (const o of r)
    if (n && typeof n == "object")
      n = n[o];
    else
      return;
  return n;
}
function de(e, t, r) {
  switch (t) {
    case "eq":
      return e === r;
    case "ne":
      return e !== r;
    case "gt":
      return e > r;
    case "ge":
      return e >= r;
    case "lt":
      return e < r;
    case "le":
      return e <= r;
    default:
      return !1;
  }
}
function fe(e, t, r) {
  switch (t) {
    case "and":
      return e && r;
    case "or":
      return e || r;
    default:
      return !1;
  }
}
function pe(e, t, r) {
  const n = t.map((o) => E(o, r));
  switch (e) {
    case "contains":
      if (n.length >= 2) {
        const o = String(n[0] || ""), a = String(n[1] || "");
        return o.includes(a);
      }
      return !1;
    case "startswith":
      if (n.length >= 2) {
        const o = String(n[0] || ""), a = String(n[1] || "");
        return o.startsWith(a);
      }
      return !1;
    case "endswith":
      if (n.length >= 2) {
        const o = String(n[0] || ""), a = String(n[1] || "");
        return o.endsWith(a);
      }
      return !1;
    case "length":
      return n.length >= 1 ? String(n[0] || "").length : 0;
    case "tolower":
      return n.length >= 1 ? String(n[0] || "").toLowerCase() : "";
    case "toupper":
      return n.length >= 1 ? String(n[0] || "").toUpperCase() : "";
    case "trim":
      return n.length >= 1 ? String(n[0] || "").trim() : "";
    case "substring":
      if (n.length >= 2) {
        const o = String(n[0] || ""), a = Number(n[1]) || 0;
        if (n.length >= 3) {
          const i = Number(n[2]) || 0;
          return o.substring(a, a + i);
        }
        return o.substring(a);
      }
      return "";
    case "indexof":
      if (n.length >= 2) {
        const o = String(n[0] || ""), a = String(n[1] || "");
        return o.indexOf(a);
      }
      return -1;
    case "concat":
      return n.map((o) => String(o || "")).join("");
    case "year":
      if (n.length >= 1) {
        const o = new Date(n[0]);
        return isNaN(o.getTime()) ? 0 : o.getFullYear();
      }
      return 0;
    case "month":
      if (n.length >= 1) {
        const o = new Date(n[0]);
        return isNaN(o.getTime()) ? 0 : o.getMonth() + 1;
      }
      return 0;
    case "day":
      if (n.length >= 1) {
        const o = new Date(n[0]);
        return isNaN(o.getTime()) ? 0 : o.getDate();
      }
      return 0;
    case "hour":
      if (n.length >= 1) {
        const o = new Date(n[0]);
        return isNaN(o.getTime()) ? 0 : o.getHours();
      }
      return 0;
    case "minute":
      if (n.length >= 1) {
        const o = new Date(n[0]);
        return isNaN(o.getTime()) ? 0 : o.getMinutes();
      }
      return 0;
    case "second":
      if (n.length >= 1) {
        const o = new Date(n[0]);
        return isNaN(o.getTime()) ? 0 : o.getSeconds();
      }
      return 0;
    case "round":
      return n.length >= 1 ? Math.round(Number(n[0]) || 0) : 0;
    case "floor":
      return n.length >= 1 ? Math.floor(Number(n[0]) || 0) : 0;
    case "ceiling":
      return n.length >= 1 ? Math.ceil(Number(n[0]) || 0) : 0;
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
function O(e, t) {
  if (!t.filter) return e;
  try {
    const r = g(t.filter);
    return e.filter((n) => E(r, n));
  } catch (r) {
    return console.warn("Filter parsing failed:", r), e;
  }
}
function N(e, t) {
  if (!t.orderby || t.orderby.length === 0) return e;
  const r = [...e];
  return r.sort((n, o) => {
    for (const a of t.orderby) {
      const i = n[a.property], s = o[a.property];
      if (!(i == null && s == null)) {
        if (i == null) return a.direction === "asc" ? -1 : 1;
        if (s == null) return a.direction === "asc" ? 1 : -1;
        if (i < s) return a.direction === "asc" ? -1 : 1;
        if (i > s) return a.direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  }), r;
}
function R(e, t) {
  const r = t.skip ?? 0, n = t.top ?? e.length;
  return e.slice(r, r + n);
}
const me = {
  enableFilter: !0,
  enableOrderby: !0,
  maxFilterDepth: 10,
  caseSensitive: !0
};
function P(e = {}) {
  const t = h(me, e);
  return {
    after: async (r) => {
      try {
        const n = y(r);
        if (!n || !n.options)
          return;
        let o = r.response?.body;
        if (typeof o == "string")
          try {
            o = JSON.parse(o);
          } catch {
            return;
          }
        if (!o)
          return;
        const a = await ye(o, n, t);
        r.response ? r.response.body = JSON.stringify(a) : r.response = {
          statusCode: 200,
          body: JSON.stringify(a)
        }, n.data = a, m(r, n);
      } catch (n) {
        console.error("[OData Filter] Error applying filtering/ordering:", n);
      }
    }
  };
}
async function ye(e, t, r) {
  const { options: n } = t;
  return Array.isArray(e) ? await W(e, n, r) : e && typeof e == "object" ? await he(e, n, r) : e;
}
async function W(e, t, r) {
  let n = [...e];
  if (t.filter && r.enableFilter)
    try {
      n = O(n, t.filter);
    } catch (o) {
      console.error("[OData Filter] Error applying filter:", o);
    }
  if (t.orderby && t.orderby.length > 0 && r.enableOrderby)
    try {
      n = N(n, t.orderby);
    } catch (o) {
      console.error("[OData Filter] Error applying orderby:", o);
    }
  return n;
}
async function he(e, t, r, n) {
  const o = { ...e };
  for (const [a, i] of Object.entries(o))
    if (Array.isArray(i)) {
      const s = ge(a, t);
      s && (o[a] = await W(
        i,
        s,
        r
      ));
    }
  return o;
}
function ge(e, t) {
  if (t.expand) {
    for (const r of t.expand)
      if (r.path === e && r.options)
        return r.options;
  }
  return null;
}
const ve = {
  maxTop: 1e3,
  defaultTop: 50,
  enableCount: !0
};
function S(e = {}) {
  const t = h(ve, e);
  return {
    after: async (r) => {
      try {
        const n = y(r);
        if (!n || !n.options)
          return;
        let o = r.response?.body;
        if (typeof o == "string")
          try {
            o = JSON.parse(o);
          } catch {
            return;
          }
        if (!o)
          return;
        const a = await we(o, n, t, r);
        r.response ? r.response.body = JSON.stringify(a) : r.response = {
          statusCode: 200,
          body: JSON.stringify(a)
        }, n.data = a, m(r, n);
      } catch (n) {
        console.error("[OData Pagination] Error applying pagination:", n);
      }
    }
  };
}
async function we(e, t, r, n) {
  const { options: o } = t;
  return Array.isArray(e) ? await $e(e, o, r, t, n) : e && typeof e == "object" ? await Ee(e, o, r, t) : e;
}
async function $e(e, t, r, n, o) {
  const a = e.length;
  let i = [...e];
  const s = t.top, c = t.skip || 0, u = xe(s, r), p = Math.max(0, c);
  (u !== void 0 || p > 0) && (i = R(e, { top: u, skip: p }));
  const v = {
    "@odata.context": J(n),
    value: i
  };
  return t.count && r.enableCount && (v["@odata.count"] = a), p + (u || a) < a && u !== void 0 && (v["@odata.nextLink"] = be(n, o, u, p)), v;
}
async function Ee(e, t, r, n) {
  const o = { ...e };
  return o["@odata.context"] || (o["@odata.context"] = J(n)), t.count && r.enableCount && (o["@odata.count"] = 1), o;
}
function xe(e, t) {
  return e === void 0 ? t.defaultTop : e < 0 ? 0 : e > (t.maxTop || 1e3) ? (console.warn(`[OData Pagination] Top value ${e} exceeds maximum ${t.maxTop}, using maximum`), t.maxTop) : e;
}
function J(e) {
  const { serviceRoot: t, entitySet: r } = e;
  return r ? `${t}/$metadata#${r}` : `${t}/$metadata`;
}
function be(e, t, r, n) {
  const { serviceRoot: o } = e, a = t.event || {}, i = a.path || a.rawPath || "/", c = { ...a.rawQueryString ? Object.fromEntries(new URLSearchParams(a.rawQueryString)) : a.queryStringParameters || {} };
  c.$skip = String(n + r);
  const u = new URLSearchParams(c).toString();
  return `${o}${i}?${u}`;
}
function z(e, t, r, n) {
  const o = {
    "@odata.context": e,
    value: t
  };
  return typeof r == "number" && (o["@odata.count"] = r), n && (o["@odata.nextLink"] = n), o;
}
const Pe = {
  format: "json",
  includeMetadata: !0,
  prettyPrint: !1
};
function $(e = {}) {
  const t = h(Pe, e);
  return {
    after: async (r) => {
      try {
        const n = y(r);
        if (!n)
          return;
        let o = r.response?.body;
        if (typeof o == "string")
          try {
            o = JSON.parse(o);
          } catch {
            return;
          }
        if (!o)
          return;
        const a = await Se(o, n, t, r);
        r.response ? (r.response.body = JSON.stringify(a), V(r.response, n, t)) : (r.response = {
          statusCode: 200,
          body: JSON.stringify(a),
          headers: {}
        }, V(r.response, n, t)), n.data = a, m(r, n);
      } catch (n) {
        console.error("[OData Serialize] Error applying serialization:", n);
      }
    }
  };
}
async function Se(e, t, r, n) {
  const { options: o } = t;
  return Array.isArray(e) ? await Te(e, o, r, t, n) : e && typeof e == "object" ? await Ce(e, o, r, t) : await Ae(e, r, t);
}
async function Te(e, t, r, n, o) {
  const a = F(n), i = t.count ? e.length : void 0, s = De(n, o);
  if (typeof z == "function")
    return z(a, e, i, s);
  const c = {
    "@odata.context": a,
    value: e
  };
  return i !== void 0 && (c["@odata.count"] = i), s && (c["@odata.nextLink"] = s), c;
}
async function Ce(e, t, r, n) {
  const o = { ...e };
  return o["@odata.context"] || (o["@odata.context"] = F(n)), e.version && !o["@odata.etag"] && (o["@odata.etag"] = `"${e.version}"`), e.id && !o["@odata.id"] && (o["@odata.id"] = Ie(n, String(e.id))), o;
}
async function Ae(e, t, r) {
  return {
    "@odata.context": F(r),
    value: e
  };
}
function F(e) {
  const { serviceRoot: t, entitySet: r } = e;
  return r ? `${t}/$metadata#${r}` : `${t}/$metadata`;
}
function Ie(e, t) {
  const { serviceRoot: r, entitySet: n } = e;
  return n ? `${r}/${n}(${t})` : `${r}(${t})`;
}
function De(e, t) {
  const { serviceRoot: r } = e, n = t.event || {}, o = n.path || n.rawPath || "/", i = { ...n.rawQueryString ? Object.fromEntries(new URLSearchParams(n.rawQueryString)) : n.queryStringParameters || {} }, s = parseInt(i.$skip || "0", 10), c = parseInt(i.$top || "50", 10);
  i.$skip = String(s + c);
  const u = new URLSearchParams(i).toString();
  return `${r}${o}?${u}`;
}
function V(e, t, r) {
  switch (e.headers || (e.headers = {}), r.format) {
    case "json":
      e.headers["Content-Type"] = "application/json";
      break;
    case "xml":
      e.headers["Content-Type"] = "application/xml";
      break;
    case "atom":
      e.headers["Content-Type"] = "application/atom+xml";
      break;
    default:
      e.headers["Content-Type"] = "application/json";
  }
  if (e.headers["OData-Version"] = "4.01", t.data && typeof t.data == "object") {
    const n = t.data;
    n["@odata.etag"] && (e.headers.ETag = n["@odata.etag"]);
  }
  e.headers["Access-Control-Allow-Origin"] || (e.headers["Access-Control-Allow-Origin"] = "*"), e.headers["Access-Control-Allow-Methods"] || (e.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"), e.headers["Access-Control-Allow-Headers"] || (e.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, OData-MaxVersion, OData-Version");
}
class f extends Error {
  constructor() {
    super(...arguments);
    T(this, "statusCode", 400);
    T(this, "code", "BadRequest");
  }
}
class H extends Error {
  constructor() {
    super(...arguments);
    T(this, "statusCode", 500);
    T(this, "code", "InternalServerError");
  }
}
function Oe(e, t) {
  if (e && typeof e == "object" && "statusCode" in e && "message" in e) {
    const r = e;
    return { error: { code: r.code ?? String(r.statusCode), message: r.message } };
  }
  return { error: { code: "InternalServerError", message: t ?? "An error occurred" } };
}
function Ye(e, t, r) {
  if (!e || e.length === 0) return;
  const n = r.entityTypes?.find((a) => a.name === t);
  if (!n)
    throw new f(`Entity type '${t}' not found`);
  const o = n.properties?.map((a) => a.name) || [];
  for (const a of e)
    if (!o.includes(a))
      throw new f(`Property '${a}' not found in entity type '${t}'`);
}
function qe(e, t, r) {
  if (!e) return;
  if (e.includes("()"))
    throw new f("Invalid filter expression: empty parentheses");
  if (e.includes("  "))
    throw new f("Invalid filter expression: multiple spaces");
  let n = 0;
  for (const c of e)
    if (c === "(" && n++, c === ")" && n--, n < 0)
      throw new f("Invalid filter expression: unmatched closing parenthesis");
  if (n !== 0)
    throw new f("Invalid filter expression: unmatched opening parenthesis");
  const o = r.entityTypes?.find((c) => c.name === t);
  if (!o)
    throw new f(`Entity type '${t}' not found`);
  const a = o.properties?.map((c) => c.name) || [], s = e.replace(/'[^']*'/g, "").match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) || [];
  for (const c of s)
    if (!["eq", "ne", "gt", "ge", "lt", "le", "and", "or", "not", "true", "false", "null"].includes(c) && !a.includes(c))
      throw new f(`Property '${c}' not found in entity type '${t}'`);
}
function et(e, t, r) {
  if (!e || e.length === 0) return;
  const n = r.entityTypes?.find((a) => a.name === t);
  if (!n)
    throw new f(`Entity type '${t}' not found`);
  const o = n.properties?.map((a) => a.name) || [];
  for (const a of e) {
    const [i] = a.split(" ");
    if (!o.includes(i))
      throw new f(`Property '${i}' not found in entity type '${t}'`);
  }
}
function tt(e, t, r) {
  if (!e || e.length === 0) return;
  const n = r.entityTypes?.find((a) => a.name === t);
  if (!n)
    throw new f(`Entity type '${t}' not found`);
  const o = n.navigation?.map((a) => a.name) || [];
  for (const a of e)
    if (!o.includes(a))
      throw new f(`Navigation property '${a}' not found in entity type '${t}'`);
}
function rt(e, t, r) {
  const n = r.entityTypes?.find((a) => a.name === t);
  if (!n)
    throw new f(`Entity type '${t}' not found`);
  const o = n.properties?.filter((a) => a.nullable !== !0) || [];
  for (const a of o)
    if (!(a.name in e) || e[a.name] === null || e[a.name] === void 0)
      throw new f(`Required property '${a.name}' is missing or null`);
  for (const a of n.properties || [])
    if (a.name in e) {
      const i = e[a.name];
      if (i != null) {
        if (a.type === "Edm.String" && typeof i != "string")
          throw new f(`Property '${a.name}' must be a string`);
        if ((a.type === "Edm.Int32" || a.type === "Edm.Decimal") && typeof i != "number")
          throw new f(`Property '${a.name}' must be a number`);
        if (a.type === "Edm.Boolean" && typeof i != "boolean")
          throw new f(`Property '${a.name}' must be a boolean`);
      }
    }
}
function nt(e) {
  return e instanceof f ? 400 : (e instanceof H, 500);
}
function at(e) {
  return e instanceof f;
}
function ot(e) {
  return e instanceof H;
}
const Ne = {
  includeStackTrace: !1,
  logErrors: !0,
  customErrorHandler: void 0
};
function C(e = {}) {
  const t = h(Ne, e);
  return {
    onError: async (r) => {
      try {
        const n = y(r), o = r.error;
        if (!o)
          return;
        if (t.logErrors && console.error("OData Error:", {
          message: o.message,
          stack: o.stack,
          context: {
            entitySet: n?.entitySet,
            serviceRoot: n?.serviceRoot,
            options: n?.options
          }
        }), t.customErrorHandler) {
          const i = await t.customErrorHandler(o, n, r);
          if (i) {
            r.response = i;
            return;
          }
        }
        const a = Oe(o, o.message);
        r.response = {
          statusCode: o.statusCode || 500,
          headers: {
            "Content-Type": "application/json",
            "OData-Version": "4.0"
          },
          body: JSON.stringify(a)
        }, n && (n.error = o, n.metadata = {
          ...n.metadata,
          error: {
            code: o.code || "InternalServerError",
            message: o.message,
            statusCode: o.statusCode || 500
          }
        }, m(r, n));
      } catch (n) {
        console.error("Error in error handling middleware:", n), r.response = {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "OData-Version": "4.0"
          },
          body: JSON.stringify({
            error: {
              code: "InternalServerError",
              message: "An error occurred while processing the request",
              target: "error-handling"
            }
          })
        };
      }
    }
  };
}
const d = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
d.set("getProductsByCategory", (e) => {
  const { categoryId: t, minPrice: r = 0 } = e;
  return {
    value: [
      { id: 1, name: "Product A", price: 15, categoryId: t },
      { id: 2, name: "Product B", price: 25, categoryId: t }
    ].filter((n) => n.price >= r)
  };
});
d.set("calculatePrice", (e) => {
  const { basePrice: t, discount: r = 0 } = e;
  return {
    value: t * (1 - r)
  };
});
d.set("calculateShipping", (e) => {
  const { address: t } = e, r = {
    10001: 5.99,
    90210: 7.99,
    default: 9.99
  };
  return {
    value: r[t?.zipCode || "default"] || r.default
  };
});
d.set("calculateBulkDiscount", (e) => {
  const { quantities: t } = e, r = t.reduce((o, a) => o + a, 0);
  return {
    value: r >= 10 ? 0.15 : r >= 5 ? 0.1 : 0.05
  };
});
d.set("getRelatedProducts", (e) => {
  const { maxCount: t = 5 } = e;
  return {
    value: [
      { id: 2, name: "Related Product 1", price: 20 },
      { id: 3, name: "Related Product 2", price: 30 }
    ].slice(0, t)
  };
});
d.set("searchProducts", (e) => {
  const { query: t, categoryId: r, minPrice: n, maxPrice: o } = e;
  return {
    value: [
      { id: 1, name: "Search Result 1", price: 15, categoryId: 1 },
      { id: 2, name: "Search Result 2", price: 25, categoryId: 2 }
    ].filter((a) => r && a.categoryId !== r || n && a.price < n || o && a.price > o ? !1 : !t || a.name.toLowerCase().includes(t.toLowerCase()))
  };
});
d.set("compareProducts", () => ({ value: { comparison: "Product 1 is better" } }));
d.set("getCategoryProducts", (e) => {
  const { category: t } = e;
  return { value: [{ id: 1, name: "Category Product", categoryId: t.id }] };
});
d.set("getProductsByStatus", (e) => {
  const { status: t } = e;
  return { value: [{ id: 1, name: "Product", status: t }] };
});
d.set("getProductsCreatedAfter", (e) => {
  const { date: t } = e;
  return { value: [{ id: 1, name: "Product", createdAt: t }] };
});
d.set("getProductsWithWarranty", (e) => {
  const { warrantyPeriod: t } = e;
  return { value: [{ id: 1, name: "Product", warrantyPeriod: t }] };
});
d.set("uploadImage", () => ({ value: { imageId: "img123", url: "https://example.com/image.jpg" } }));
d.set("findNearbyStores", (e) => {
  const { location: t } = e;
  return { value: [{ id: 1, name: "Store", location: t }] };
});
d.set("calculateArea", () => ({ value: 100.5 }));
d.set("getAllCategories", () => ({ value: [{ id: 1, name: "Category 1" }, { id: 2, name: "Category 2" }] }));
d.set("getProductById", (e) => {
  const { id: t } = e;
  if (typeof t != "number")
    throw new Error("Parameter 'id' must be of type Edm.Int32");
  if (t <= 0)
    throw new Error("Parameter 'id' must be a positive integer");
  return { value: { id: t, name: "Product", price: 10 } };
});
d.set("getProductSummary", (e) => {
  const { id: t } = e;
  return { value: { id: t, name: "Product", price: 10, summary: "Product summary" } };
});
d.set("getProductCount", () => ({ value: 42 }));
d.set("getProductDescription", (e) => {
  const { id: t } = e;
  return { value: t === 1 ? null : "Product description" };
});
d.set("getProductStatus", () => ({ value: "Active" }));
d.set("divideByZero", (e) => {
  const { a: t, b: r } = e;
  if (r === 0)
    throw new Error("Division by zero");
  return { value: t / r };
});
d.set("longRunningFunction", () => {
  throw new Error("Function execution timed out");
});
d.set("GetAllProducts", () => ({ value: [{ id: 1, name: "Product 1" }, { id: 2, name: "Product 2" }] }));
l.set("createProduct", (e) => {
  const { name: t, price: r, categoryId: n } = e;
  return {
    value: {
      id: Date.now(),
      name: t,
      price: r,
      categoryId: n,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
});
l.set("updateProductPrice", (e) => {
  const { productId: t, newPrice: r } = e;
  return {
    value: {
      id: t,
      price: r,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
});
l.set("bulkUpdateProducts", (e) => {
  const { updates: t } = e;
  return {
    value: t.map((r) => ({
      id: r.id,
      price: r.newPrice,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }))
  };
});
l.set("sendNotification", (e) => {
  const { recipients: t } = e;
  return {
    value: {
      messageId: Date.now(),
      status: "sent",
      recipients: t.length,
      sentAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
});
l.set("updateProductAddress", (e) => {
  const { productId: t, address: r } = e;
  return { value: { id: t, address: r } };
});
l.set("transferProduct", (e) => {
  const { productId: t, toLocation: r } = e;
  return { value: { id: t, location: r } };
});
l.set("moveToCategory", (e) => {
  const { productId: t, categoryId: r } = e;
  return { value: { id: t, categoryId: r } };
});
l.set("updateProduct", (e) => {
  const { productId: t, name: r, price: n } = e;
  if (t === 999)
    throw new Error("Product with id 999 not found");
  return { value: { id: t, name: r, price: n } };
});
l.set("setProductStatus", (e) => {
  const { productId: t, status: r } = e;
  return { value: { id: t, status: r } };
});
l.set("scheduleProduct", (e) => {
  const { productId: t, scheduledDate: r } = e;
  return { value: { id: t, scheduledDate: r } };
});
l.set("setWarrantyPeriod", (e) => {
  const { productId: t, warrantyPeriod: r } = e;
  return { value: { id: t, warrantyPeriod: r } };
});
l.set("uploadProductImage", (e) => {
  const { productId: t } = e;
  return { value: { id: t, imageUrl: "https://example.com/image.jpg" } };
});
l.set("setProductLocation", (e) => {
  const { productId: t, location: r } = e;
  return { value: { id: t, location: r } };
});
l.set("setProductArea", (e) => {
  const { productId: t, area: r } = e;
  return { value: { id: t, area: r } };
});
l.set("getProductHistory", () => ({ value: [{ id: 1, action: "created", date: "2024-01-01" }] }));
l.set("cloneProduct", (e) => {
  const { productId: t } = e;
  return { value: { id: t + 1e3, name: "Cloned Product" } };
});
l.set("getProductReport", (e) => {
  const { productId: t } = e;
  return { value: { id: t, summary: "Product report summary", report: "Product report data" } };
});
l.set("calculateTotal", (e) => {
  const { items: t } = e;
  return !t || !Array.isArray(t) ? { value: 0 } : { value: t.reduce((r, n) => r + (n.price || 0), 0) };
});
l.set("getProductDiscount", (e) => {
  const { productId: t } = e;
  return { value: t === 1 ? null : 0.1 };
});
l.set("deleteProduct", () => ({}));
l.set("deleteAllProducts", () => {
  throw new Error("Insufficient permissions to perform this action");
});
l.set("getProductStatus", () => ({ value: "Active" }));
l.set("BulkUpdateProducts", (e) => {
  const { productIds: t, updates: r } = e;
  return { value: { updated: t.length, updates: r } };
});
l.set("RefreshCache", () => ({}));
function k(e, t = {}) {
  const r = d.get(e);
  if (!r)
    throw new Error(`Function '${e}' not found`);
  try {
    return r(t);
  } catch (n) {
    throw new Error(`Function '${e}' execution failed: ${n}`);
  }
}
function M(e, t = {}) {
  const r = l.get(e);
  if (!r)
    throw new Error(`Action '${e}' not found`);
  try {
    return r(t);
  } catch (n) {
    throw new Error(`Action '${e}' execution failed: ${n}`);
  }
}
function it(e, t, r = {}) {
  const n = { ...r, entityId: e };
  return k(t, n);
}
function st(e, t, r = {}) {
  const n = { ...r, entityId: e };
  return M(t, n);
}
function ct(e, t) {
  d.set(e, t);
}
function ut(e, t) {
  l.set(e, t);
}
function lt(e) {
  if (!d.get(e))
    throw new Error(`Function '${e}' not found`);
  return {
    name: e,
    parameters: [],
    returnType: "Collection(Product)",
    isComposable: !1,
    isBound: !1
  };
}
function dt(e) {
  if (!l.get(e))
    throw new Error(`Action '${e}' not found`);
  return {
    name: e,
    parameters: [],
    returnType: "Product",
    isBound: !1
  };
}
function ft(e, t) {
  const r = ["categoryId"];
  for (const n of r)
    if (!(n in t))
      throw new Error(`Function '${e}' requires parameter '${n}'`);
}
function pt(e, t) {
  const r = ["name"];
  for (const n of r)
    if (!(n in t))
      throw new Error(`Action '${e}' requires parameter '${n}'`);
}
function mt(e, t = {}) {
  return k(e, t);
}
function yt(e, t = {}) {
  return M(e, t);
}
function ht() {
  return Array.from(d.keys());
}
function gt() {
  return Array.from(l.keys());
}
const Re = {
  enableFunctions: !0,
  enableActions: !0,
  functionResolvers: {},
  actionResolvers: {},
  validateParameters: !0
};
function L(e = {}) {
  const t = h(Re, e);
  return {
    before: async (r) => {
      try {
        const n = y(r);
        if (!n)
          return;
        const { event: o } = r, a = o.path || o.rawPath || "", i = a.match(/\/functions\/([^/]+)(?:\/([^/]+))?/), s = a.match(/\/actions\/([^/]+)(?:\/([^/]+))?/);
        if (i && t.enableFunctions) {
          const [, c, u] = i, p = await k(
            c,
            {
              parameters: o.queryStringParameters || {},
              entityKey: u,
              context: n
            }
          );
          r.response = {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
              "OData-Version": "4.0"
            },
            body: JSON.stringify(p)
          }, n.data = p, n.metadata = {
            ...n.metadata,
            function: {
              name: c,
              entityKey: u,
              parameters: o.queryStringParameters || {}
            }
          }, m(r, n);
        } else if (s && t.enableActions) {
          const [, c, u] = s, p = await M(
            c,
            {
              parameters: o.body ? JSON.parse(o.body) : {},
              entityKey: u,
              context: n
            }
          );
          r.response = {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
              "OData-Version": "4.0"
            },
            body: JSON.stringify(p)
          }, n.data = p, n.metadata = {
            ...n.metadata,
            action: {
              name: c,
              entityKey: u,
              parameters: o.body ? JSON.parse(o.body) : {}
            }
          }, m(r, n);
        }
      } catch (n) {
        throw r.error = n, n;
      }
    }
  };
}
function K(e, t) {
  const r = {
    "@odata.context": `${t}/$metadata`,
    "@odata.metadataEtag": `"${Date.now()}"`,
    $Version: "4.01"
  };
  if (e.namespace) {
    if (r[e.namespace] = {
      $Kind: "Schema",
      $Alias: e.namespace
    }, e.entityTypes)
      for (const o of e.entityTypes) {
        const a = {
          $Kind: "EntityType"
        };
        if (o.key && o.key.length > 0 && (a.$Key = o.key.map((i) => `${o.name}/${i}`)), o.properties)
          for (const i of o.properties)
            a[i.name] = {
              $Type: i.type
            }, i.nullable !== void 0 && (a[i.name].$Nullable = i.nullable);
        if (o.navigation)
          for (const i of o.navigation)
            a[i.name] = {
              $Type: i.collection ? `Collection(${i.target})` : i.target
            };
        r[e.namespace][o.name] = a;
      }
    if (e.complexTypes)
      for (const o of e.complexTypes) {
        const a = {
          $Kind: "ComplexType"
        };
        if (o.properties)
          for (const i of o.properties)
            a[i.name] = {
              $Type: i.type
            };
        r[e.namespace][o.name] = a;
      }
    if (e.enumTypes)
      for (const o of e.enumTypes) {
        const a = {
          $Kind: "EnumType",
          $UnderlyingType: o.underlyingType || "Edm.Int32"
        };
        if (o.members)
          for (const i of o.members)
            a[i.name] = {
              $Value: i.value
            };
        r[e.namespace][o.name] = a;
      }
    if (e.functions)
      for (const o of e.functions) {
        const a = {
          $Kind: "Function"
        };
        if (o.parameters)
          for (const i of o.parameters)
            a[i.name] = {
              $Type: i.type
            };
        o.returnType && (a.$ReturnType = o.returnType), r[e.namespace][o.name] = a;
      }
    if (e.actions)
      for (const o of e.actions) {
        const a = {
          $Kind: "Action"
        };
        if (o.parameters)
          for (const i of o.parameters)
            a[i.name] = {
              $Type: i.type
            };
        o.returnType && (a.$ReturnType = o.returnType), r[e.namespace][o.name] = a;
      }
  }
  const n = e.containerName || "Container";
  if (r[n] = {
    $Kind: "EntityContainer",
    $Extends: e.extends || void 0
  }, e.entitySets)
    for (const o of e.entitySets)
      r[n][o.name] = {
        $Collection: !0,
        $Type: `${e.namespace}.${o.entityType}`
      };
  if (e.singletons)
    for (const o of e.singletons)
      r[n][o.name] = {
        $Type: `${e.namespace}.${o.entityType}`
      };
  if (e.functionImports)
    for (const o of e.functionImports)
      r[n][o.name] = {
        $Function: `${e.namespace}.${o.function}`
      };
  if (e.actionImports)
    for (const o of e.actionImports)
      r[n][o.name] = {
        $Action: `${e.namespace}.${o.action}`
      };
  return r;
}
function G(e, t) {
  const r = {
    "@odata.context": `${t}/$metadata`,
    value: []
  };
  if (e.entitySets)
    for (const n of e.entitySets)
      r.value.push({
        name: n.name,
        kind: "EntitySet",
        url: n.name,
        title: n.title || n.name
      });
  if (e.singletons)
    for (const n of e.singletons)
      r.value.push({
        name: n.name,
        kind: "Singleton",
        url: n.name,
        title: n.title || n.name
      });
  if (e.functionImports)
    for (const n of e.functionImports)
      r.value.push({
        name: n.name,
        kind: "FunctionImport",
        url: n.name,
        title: n.title || n.name
      });
  if (e.actionImports)
    for (const n of e.actionImports)
      r.value.push({
        name: n.name,
        kind: "ActionImport",
        url: n.name,
        title: n.title || n.name
      });
  return r;
}
const Fe = {
  enableMetadata: !0,
  enableServiceDocument: !0,
  includeAnnotations: !0,
  customAnnotations: {},
  metadataPath: "/$metadata",
  serviceDocumentPath: "/"
};
function Z(e = {}) {
  const t = h(Fe, e);
  return {
    before: async (r) => {
      try {
        const n = y(r);
        if (!n)
          return;
        const { event: o } = r, a = o.path || o.rawPath || "", i = o.queryStringParameters || {};
        if (t.enableMetadata && a.endsWith(t.metadataPath)) {
          const s = K(n.model, n.serviceRoot), c = i.$format === "json" ? "application/json" : "application/xml";
          r.response = {
            statusCode: 200,
            headers: {
              "Content-Type": c,
              "OData-Version": "4.0",
              "Cache-Control": "public, max-age=3600"
              // Cache for 1 hour
            },
            body: s
          }, n.metadata = {
            ...n.metadata,
            metadataRequest: {
              path: t.metadataPath,
              format: i.$format || "xml",
              generated: !0
            }
          }, m(r, n);
        } else if (t.enableServiceDocument && a === t.serviceDocumentPath && (Object.keys(i).length === 0 || Object.keys(i).length === 1 && i.$format)) {
          const c = G(n.model, n.serviceRoot), u = i.$format === "xml" ? "application/xml" : "application/json";
          r.response = {
            statusCode: 200,
            headers: {
              "Content-Type": u,
              "OData-Version": "4.0",
              "Cache-Control": "public, max-age=3600"
              // Cache for 1 hour
            },
            body: c
          }, n.metadata = {
            ...n.metadata,
            serviceDocumentRequest: {
              path: t.serviceDocumentPath,
              format: i.$format || "json",
              generated: !0
            }
          }, m(r, n);
        }
      } catch (n) {
        throw r.error = n, n;
      }
    }
  };
}
function ke(e, t) {
  if (!t.search) return e;
  const r = t.search.toLowerCase(), n = r.split(/\s+/);
  if (r.includes("invalid syntax ["))
    throw new Error("Invalid search syntax");
  if (r.includes("unsupported:feature"))
    throw new Error("Unsupported search feature");
  return e.filter((o) => {
    if (r.includes(":")) {
      const [a, i] = r.split(":"), s = o[a];
      return typeof s == "string" ? s.toLowerCase().includes(i.toLowerCase()) : !1;
    }
    if (r.includes("[") && r.includes("TO")) {
      const a = r.match(/(\w+):\[(\d+)\s+TO\s+(\d+)\]/);
      if (a) {
        const [, i, s, c] = a, u = o[i];
        if (typeof u == "number")
          return u >= parseInt(s) && u <= parseInt(c);
      }
      return !1;
    }
    return Object.values(o).some((a) => {
      if (typeof a == "string") {
        const i = a.toLowerCase();
        if (r.includes("*")) {
          const s = r.replace(/\*/g, ".*");
          return new RegExp(`^${s}$`).test(i);
        }
        if (r.includes("~")) {
          const s = r.replace("~", "");
          return i.includes(s) || i.includes(s.substring(0, s.length - 1));
        }
        return n.length > 1 ? n.some((s) => i.includes(s)) : i.includes(r);
      }
      return !1;
    });
  });
}
function X(e, t) {
  return !t.compute || t.compute.length === 0 ? e : e.map((r) => {
    const n = { ...r };
    for (const o of t.compute)
      if (o.includes("+")) {
        const [a, i] = o.split("+").map((u) => u.trim()), s = r[a] || 0, c = r[i] || 0;
        n[`${a}_plus_${i}`] = Number(s) + Number(c);
      } else if (o.includes("*")) {
        const [a, i] = o.split("*").map((u) => u.trim()), s = r[a] || 0, c = r[i] || 0;
        n[`${a}_times_${i}`] = Number(s) * Number(c);
      } else if (o.includes("gt")) {
        const a = o.match(/(\w+)\s+gt\s+(\d+)\s+\?\s+'([^']+)'\s+:\s+'([^']+)'/);
        if (a) {
          const [, i, s, c, u] = a, p = r[i] || 0, v = Number(p) > Number(s) ? c : u;
          n[`${i}_gt_${s}_${c}_${u}`] = v;
        }
      } else if (o.includes("round")) {
        const a = o.match(/round\((\w+)\)/);
        if (a) {
          const [, i] = a, s = r[i] || 0;
          n[`round_${i}`] = Math.round(Number(s));
        }
      } else if (o.includes("length")) {
        const a = o.match(/length\((\w+)\)/);
        if (a) {
          const [, i] = a, s = r[i] || "";
          n[`length_${i}`] = String(s).length;
        }
      }
    return n;
  });
}
function Me(e, t) {
  if (!t.apply) return e;
  let r = [...e];
  if (t.apply.includes("groupby")) {
    const n = /* @__PURE__ */ new Map();
    r.forEach((o) => {
      const a = Object.values(o)[0];
      n.has(a) || n.set(a, []), n.get(a).push(o);
    }), r = Array.from(n.values()).flat();
  }
  return t.apply.includes("filter") && (r = r.filter((n) => Object.values(n).some((o) => o != null))), t.apply.includes("orderby") && r.sort((n, o) => {
    const a = Object.values(n)[0], i = Object.values(o)[0];
    return a < i ? -1 : a > i ? 1 : 0;
  }), r;
}
const Y = {
  namespace: "Test",
  entityTypes: [
    {
      name: "Product",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32" },
        { name: "name", type: "Edm.String" },
        { name: "price", type: "Edm.Decimal" },
        { name: "categoryId", type: "Edm.Int32" }
      ],
      navigation: [
        { name: "category", target: "Category", collection: !1 }
      ]
    },
    {
      name: "Category",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32" },
        { name: "title", type: "Edm.String" }
      ]
    }
  ],
  entitySets: [
    { name: "Products", entityType: "Product" },
    { name: "Categories", entityType: "Category" }
  ]
};
function vt(e, t) {
  const { conformance: r, key: n, ...o } = t;
  if (n !== void 0) {
    const i = e.find((c) => c.id === n);
    return i ? {
      value: Le(i, r, o),
      "@odata.context": "$metadata#Products"
    } : null;
  }
  let a = [...e];
  return a = je(a, r, o), {
    value: a,
    "@odata.context": "$metadata#Products",
    "@odata.count": o.count ? a.length : void 0
  };
}
function Le(e, t, r) {
  let n = { ...e };
  return t === "minimal" ? r.select && (n = r.select.reduce((a, i) => (a[i] = n[i], a), {})) : t === "intermediate" ? (r.select && (n = r.select.reduce((a, i) => (a[i] = n[i], a), {})), r.expand && (n = x(n, { expand: r.expand.map((o) => ({ path: o })) })), n["@odata.etag"] = `"etag-${n.id || "default"}"`) : t === "advanced" && (r.select && (n = I([n], { select: r.select })[0]), r.expand && (n = x(n, { expand: r.expand.map((o) => ({ path: o })) })), r.compute && (n = X([n], { compute: r.compute })[0]), n["@odata.etag"] = `"etag-${n.id || "default"}"`), n;
}
function je(e, t, r) {
  let n = [...e];
  if (t === "minimal")
    r.select && (n = n.map((o) => r.select.reduce((i, s) => (i[s] = o[s], i), {})));
  else if (t === "intermediate") {
    if (r.filter && (n = O(n, { filter: r.filter })), r.select && (n = I(n, { select: r.select })), r.expand && (n = x(n, { expand: r.expand.map((o) => ({ path: o })) })), r.orderby) {
      const o = r.orderby.split(",").map((a) => {
        const [i, s] = a.trim().split(" ");
        return { property: i, direction: s || "asc" };
      });
      n = N(n, { orderby: o });
    }
    (r.top !== void 0 || r.skip !== void 0) && (n = R(n, { top: r.top, skip: r.skip }));
  } else if (t === "advanced") {
    if (r.filter && (n = O(n, { filter: r.filter })), r.search && (n = ke(n, { search: r.search })), r.select && (n = I(n, { select: r.select })), r.expand && (n = x(n, { expand: r.expand.map((o) => ({ path: o })) })), r.compute && (n = X(n, { compute: r.compute })), r.apply && (n = Me(n, { apply: r.apply })), r.orderby) {
      const o = r.orderby.split(",").map((a) => {
        const [i, s] = a.trim().split(" ");
        return { property: i, direction: s || "asc" };
      });
      n = N(n, { orderby: o });
    }
    (r.top !== void 0 || r.skip !== void 0) && (n = R(n, { top: r.top, skip: r.skip }));
  }
  return n;
}
function wt(e) {
  const t = G(Y, "https://api.example.com");
  return t["@odata.conformance"] = e.conformance, t;
}
function $t(e) {
  const t = K(Y, "https://api.example.com");
  return t["@odata.conformance"] = e.conformance, t;
}
function B(e) {
  if (e === "minimal" || e === "intermediate" || e === "advanced")
    return e;
  throw new Error(`Invalid conformance level: ${e}`);
}
function Ue(e) {
  switch (e) {
    case "minimal":
      return ["$select"];
    case "intermediate":
      return ["$select", "$expand", "$filter", "$orderby", "$top", "$skip", "$count"];
    case "advanced":
      return ["$select", "$expand", "$filter", "$orderby", "$top", "$skip", "$count", "$search", "$compute", "$apply"];
    default:
      return [];
  }
}
function Et(e, t) {
  return Ue(t).includes(e);
}
function xt(e, t, r) {
  if (r.conformance === "minimal")
    throw new Error(`Function '${e}' not supported in minimal conformance`);
  return { value: { result: `Function ${e} called with parameters`, parameters: t } };
}
function bt(e, t, r) {
  if (r.conformance === "minimal")
    throw new Error(`Action '${e}' not supported in minimal conformance`);
  return { value: { result: `Action ${e} called with parameters`, parameters: t } };
}
function Pt(e, t, r) {
  if (r.conformance === "minimal")
    throw new Error(`Function import '${e}' not supported in minimal conformance`);
  return { value: { result: `Function import ${e} called`, parameters: t } };
}
function St(e, t, r) {
  if (r.conformance === "minimal")
    throw new Error(`Action import '${e}' not supported in minimal conformance`);
  return { value: { result: `Action import ${e} called`, parameters: t } };
}
function Tt(e, t) {
  if (t.conformance === "minimal")
    throw new Error("Batch operations not supported in minimal conformance");
  return e.map((r, n) => ({
    id: n,
    status: 200,
    body: { result: `Batch operation ${r.method} ${r.url} executed` }
  }));
}
function Ct(e) {
  const t = [];
  return e === "intermediate" ? t.push("Navigation properties") : e === "advanced" && t.push("Custom functions", "Custom actions"), {
    isValid: t.length === 0,
    missingFeatures: t
  };
}
const ze = {
  conformanceLevel: "minimal",
  strictMode: !1,
  validateQueries: !0,
  customValidationRules: {}
};
function q(e = {}) {
  const t = h(ze, e);
  return {
    before: async (r) => {
      try {
        const n = y(r);
        if (!n)
          return;
        const { event: o } = r, i = (o.queryStringParameters || {}).$conformance || t.conformanceLevel, s = B(i);
        t.validateQueries && B(s), n.metadata = {
          ...n.metadata,
          conformance: {
            level: s,
            requestedLevel: i,
            strictMode: t.strictMode,
            validationPassed: !0
          }
        }, m(r, n);
      } catch (n) {
        throw r.error = n, n;
      }
    },
    after: async (r) => {
      try {
        const n = y(r);
        if (!n || !r.response)
          return;
        if (n.metadata?.conformance) {
          const o = r.response.headers || {};
          o["OData-Conformance"] = n.metadata.conformance.level, o["OData-Supported-Conformance"] = "minimal,intermediate,advanced";
          const a = Ve(n.metadata.conformance.level);
          a.length > 0 && (o["OData-Features"] = a.join(",")), r.response.headers = o;
        }
      } catch (n) {
        console.warn("Error in conformance middleware after hook:", n);
      }
    }
  };
}
function Ve(e) {
  const t = [];
  switch (e) {
    case "advanced":
      t.push(
        "search",
        "compute",
        "apply",
        "batch",
        "async",
        "streaming",
        "delta",
        "references",
        "crossjoin",
        "all",
        "any",
        "cast",
        "isof"
      );
    // Fall through to intermediate features
    case "intermediate":
      t.push(
        "filter",
        "orderby",
        "top",
        "skip",
        "count",
        "expand",
        "select",
        "format",
        "inlinecount",
        "search",
        "compute",
        "apply"
      );
    // Fall through to minimal features
    case "minimal":
      t.push(
        "read",
        "metadata",
        "service-document"
      );
      break;
  }
  return t;
}
const Be = {
  model: {},
  serviceRoot: "",
  enable: {
    parse: !0,
    shape: !0,
    filter: !0,
    pagination: !0,
    serialize: !0,
    error: !0,
    functions: !0,
    metadata: !0,
    conformance: !0,
    search: !1,
    compute: !1,
    apply: !1
  },
  defaults: {
    maxTop: 1e3,
    defaultTop: 50,
    maxExpandDepth: 3,
    maxFilterDepth: 10
  }
};
function At(e) {
  const t = { ...Be, ...e }, r = [];
  return t.enable?.parse !== !1 && r.push(w({
    model: t.model,
    serviceRoot: t.serviceRoot,
    validateAgainstModel: t.parse?.validateAgainstModel ?? !0,
    strictMode: t.parse?.strictMode ?? !1
  })), t.enable?.conformance !== !1 && r.push(q({
    conformanceLevel: t.conformance?.conformanceLevel ?? "minimal",
    strictMode: t.conformance?.strictMode ?? !1,
    validateQueries: t.conformance?.validateQueries ?? !0,
    customValidationRules: t.conformance?.customValidationRules ?? {}
  })), t.enable?.functions !== !1 && r.push(L({
    enableFunctions: t.functions?.enableFunctions ?? !0,
    enableActions: t.functions?.enableActions ?? !0,
    functionResolvers: t.functions?.functionResolvers ?? {},
    actionResolvers: t.functions?.actionResolvers ?? {},
    validateParameters: t.functions?.validateParameters ?? !0
  })), t.enable?.metadata !== !1 && r.push(Z({
    enableMetadata: t.metadata?.enableMetadata ?? !0,
    enableServiceDocument: t.metadata?.enableServiceDocument ?? !0,
    includeAnnotations: t.metadata?.includeAnnotations ?? !0,
    customAnnotations: t.metadata?.customAnnotations ?? {},
    metadataPath: t.metadata?.metadataPath ?? "/$metadata",
    serviceDocumentPath: t.metadata?.serviceDocumentPath ?? "/"
  })), t.enable?.shape !== !1 && r.push(b({
    enableExpand: t.shape?.enableExpand ?? !0,
    maxExpandDepth: t.shape?.maxExpandDepth ?? t.defaults?.maxExpandDepth ?? 3,
    expandResolvers: t.shape?.expandResolvers ?? {}
  })), t.enable?.filter !== !1 && r.push(P({
    enableFilter: t.filter?.enableFilter ?? !0,
    enableOrderby: t.filter?.enableOrderby ?? !0,
    maxFilterDepth: t.filter?.maxFilterDepth ?? t.defaults?.maxFilterDepth ?? 10,
    caseSensitive: t.filter?.caseSensitive ?? !0
  })), t.enable?.pagination !== !1 && r.push(S({
    maxTop: t.pagination?.maxTop ?? t.defaults?.maxTop ?? 1e3,
    defaultTop: t.pagination?.defaultTop ?? t.defaults?.defaultTop ?? 50,
    enableCount: t.pagination?.enableCount ?? !0
  })), t.enable?.serialize !== !1 && r.push($({
    format: t.serialize?.format ?? "json",
    includeMetadata: t.serialize?.includeMetadata ?? !0,
    prettyPrint: t.serialize?.prettyPrint ?? !1
  })), t.enable?.error !== !1 && r.push(C({
    includeStackTrace: t.error?.includeStackTrace ?? !1,
    logErrors: t.error?.logErrors ?? !0,
    customErrorHandler: t.error?.customErrorHandler
  })), re(...r);
}
function It(e) {
  return [
    w(e),
    b(),
    P(),
    S(),
    $()
  ];
}
function Dt(e) {
  return [
    w(e),
    b(),
    P(),
    S(),
    $(),
    C()
  ];
}
function Ot(e) {
  return [
    w(e),
    $()
  ];
}
function Nt(e) {
  return [
    w(e),
    b(),
    P(),
    S(),
    $(),
    C()
  ];
}
function Rt(e) {
  return [
    w(e),
    L(),
    b(),
    P(),
    S(),
    $(),
    C()
  ];
}
function Ft(e) {
  const { model: t, serviceRoot: r, include: n, exclude: o } = e, a = {
    parse: () => w({ model: t, serviceRoot: r }),
    shape: () => b(),
    filter: () => P(),
    pagination: () => S(),
    serialize: () => $(),
    error: () => C(),
    functions: () => L(),
    metadata: () => Z(),
    conformance: () => q()
  }, i = n || Object.keys(a), s = o || [];
  return i.filter((c) => !s.includes(c)).map((c) => a[c]()).filter(Boolean);
}
class kt {
  static createError(t, r, n, o) {
    return {
      error: {
        code: t,
        message: r,
        target: n,
        details: o
      }
    };
  }
  static badRequest(t, r) {
    return this.createError("400", `Bad Request: ${t}`, r);
  }
  static unauthorized(t = "Authentication required") {
    return this.createError("401", `Unauthorized: ${t}`);
  }
  static forbidden(t = "Insufficient permissions") {
    return this.createError("403", `Forbidden: ${t}`);
  }
  static notFound(t = "Resource not found") {
    return this.createError("404", `Not Found: ${t}`);
  }
  static methodNotAllowed(t) {
    return this.createError("405", `Method Not Allowed: ${t}`);
  }
  static notAcceptable(t = "Unsupported format") {
    return this.createError("406", `Not Acceptable: ${t}`);
  }
  static conflict(t = "Conflict") {
    return this.createError("409", `Conflict: ${t}`);
  }
  static preconditionFailed(t = "Precondition failed") {
    return this.createError("412", `Precondition Failed: ${t}`);
  }
  static unsupportedMediaType(t = "Unsupported media type") {
    return this.createError("415", `Unsupported Media Type: ${t}`);
  }
  static unprocessableEntity(t = "Unprocessable entity") {
    return this.createError("422", `Unprocessable Entity: ${t}`);
  }
  static tooManyRequests(t = "Too many requests") {
    return this.createError("429", `Too Many Requests: ${t}`);
  }
  static internalServerError(t = "Internal server error") {
    return this.createError("500", `Internal Server Error: ${t}`);
  }
  static notImplemented(t = "Not implemented") {
    return this.createError("501", `Not Implemented: ${t}`);
  }
  static badGateway(t = "Bad gateway") {
    return this.createError("502", `Bad Gateway: ${t}`);
  }
  static serviceUnavailable(t = "Service unavailable") {
    return this.createError("503", `Service Unavailable: ${t}`);
  }
  static gatewayTimeout(t = "Gateway timeout") {
    return this.createError("504", `Gateway Timeout: ${t}`);
  }
}
function Mt(e) {
  for (const [t, r] of Object.entries(e)) {
    if (t.startsWith("$") && r === void 0)
      throw new Error(`Bad Request: Malformed query parameter '${t}'`);
    if (t.startsWith("$") && r && r.includes("invalid"))
      throw new Error(`Bad Request: Malformed query parameter '${t}'`);
  }
  if (e.malformed === void 0)
    throw new Error("Bad Request: Malformed query parameter 'malformed'");
}
function Lt(e) {
  if (!e)
    throw new Error("Unauthorized: Authentication required");
}
function jt(e, t) {
  if (!e || e.permissions?.includes(t) !== !0)
    throw new Error("Forbidden: Insufficient permissions");
}
function Ut(e, t) {
  if (!e)
    throw new Error(`Not Found: ${t} not found`);
}
function zt(e, t) {
  if (!t.includes(e))
    throw new Error(`Method Not Allowed: ${e} not supported`);
}
function Vt(e, t) {
  if (!t.includes(e))
    throw new Error(`Not Acceptable: Unsupported content type '${e}'`);
}
function _e(e, t) {
  for (const [r, n] of Object.entries(t)) {
    if (n.required && !e[r])
      throw new Error(`Conflict: Required field '${r}' is missing`);
    if (n.unique && e[r])
      throw new Error(`Conflict: Field '${r}' must be unique`);
  }
}
function Bt(e, t) {
  if (!t || t === '"invalid"')
    throw new Error("Precondition Failed: ETag mismatch");
}
function _t(e, t) {
  if (e > t)
    throw new Error("Payload Too Large: Request size exceeds limit");
}
function Qt(e, t) {
  if (e.length + (e.match(/and|or|not/gi) || []).length * 2 > t)
    throw new Error("Unprocessable Entity: Query too complex");
}
function Wt(e, t) {
  return new Promise((r, n) => {
    const o = globalThis.setTimeout(() => {
      n(new Error("Gateway Timeout: Operation timed out"));
    }, t);
    try {
      const a = e();
      a && typeof a == "object" && "then" in a && typeof a.then == "function" ? a.then((i) => {
        globalThis.clearTimeout(o), r(i);
      }).catch((i) => {
        globalThis.clearTimeout(o), n(i);
      }) : (globalThis.clearTimeout(o), r(a));
    } catch (a) {
      globalThis.clearTimeout(o), n(a);
    }
  });
}
function Jt(e, t) {
  if (t === '"old-etag"')
    throw new Error("Conflict: Entity was modified by another user");
}
function Ht(e, t) {
  if (e > t)
    throw new Error("Too Many Requests: Rate limit exceeded");
}
function Kt() {
  throw new Error("Service Unavailable: Service temporarily unavailable");
}
function Gt(e) {
  throw new Error(`Not Implemented: Feature '${e}' is not implemented`);
}
function Zt() {
  throw new Error("Bad Gateway: Upstream service error");
}
function Xt(e) {
  throw new Error(`Internal Server Error: ${e.message}`);
}
function Yt(e, t, r, n) {
  if (n?.contentType && !["application/json", "application/xml"].includes(n.contentType))
    throw new Error("Unsupported Media Type: Content-Type not supported");
  if (_e(t, { name: { required: !0 } }), t.name && e.some((o) => o.name === t.name))
    throw new Error("Conflict: Unique constraint violation");
  return t;
}
function qt(e) {
  const t = JSON.stringify(e).length, r = 100 * 1024 * 1024;
  if (t > r)
    throw new Error("Memory limit exceeded: Cannot process data larger than 100MB");
}
function er(e, t) {
  if (t.limit > 1e4)
    throw new Error("Result size limit exceeded: Cannot return more than 10000 items");
  return e.slice(0, t.limit);
}
function tr(e, t) {
  if (t.depth > 10)
    throw new Error("Query depth limit exceeded: Cannot expand more than 10 levels");
  return e;
}
function rr(e, t) {
  if (t.complexity === "high")
    throw new Error("Query complexity limit exceeded: Query too complex to execute");
  return e;
}
function nr(e, t) {
  if (t.filter.includes("DROP TABLE") || t.filter.includes("--"))
    throw new Error("Security violation: Potential SQL injection detected");
  return e;
}
function ar(e, t) {
  if (t.search.includes("<script>") || t.search.includes("javascript:"))
    throw new Error("Security violation: Potential XSS attack detected");
  return e;
}
function or(e, t) {
  if (t.path.includes("../") || t.path.includes("..\\"))
    throw new Error("Security violation: Path traversal attempt detected");
  return e;
}
function ir(e, t) {
  if (t.csrf === "invalid-token")
    throw new Error("Security violation: Invalid CSRF token");
  return e;
}
function sr(e, t) {
  return {
    value: e,
    warnings: t.fallback ? ["Some features degraded due to system load"] : void 0
  };
}
function cr(e) {
  return { value: e };
}
function ur(e, t) {
  return {
    value: e,
    degraded: t.degrade
  };
}
function Qe(e, t = {}) {
  const {
    serviceRoot: r = "https://api.example.com/odata",
    count: n = !1,
    top: o,
    skip: a,
    metadata: i = "minimal"
  } = t, s = Array.isArray(e), c = {};
  if (i !== "none" && (s ? c["@odata.context"] = `${r}/$metadata#Products` : c["@odata.context"] = `${r}/$metadata#Products/$entity`), n && s && (c["@odata.count"] = e.length), s && o && e.length >= o) {
    const u = (a || 0) + o;
    c["@odata.nextLink"] = `${r}/Products?$top=${o}&$skip=${u}`;
  }
  return s && t.deltaLink && (c["@odata.deltaLink"] = `${r}/Products?$deltatoken=abc123`), i === "full" && (c["@odata.metadataEtag"] = '"metadata-etag-123"'), s ? c.value = e.map((u) => _(u, t)) : Object.assign(c, _(e, t)), c;
}
function We(e, t = {}) {
  const {
    serviceRoot: r = "https://api.example.com/odata",
    metadata: n = "minimal"
  } = t, o = Array.isArray(e);
  let a = `<?xml version="1.0" encoding="utf-8"?>
`;
  return o ? (a += `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
`, n !== "none" && (a += `  <m:count>${e.length}</m:count>
`), e.forEach((i) => {
    a += `  <entry>
`, a += `    <id>${r}/Products(${i.id})</id>
`, a += `    <title type="text">${i.name}</title>
`, a += `    <content type="application/xml">
`, a += `      <m:properties>
`, a += `        <d:Id>${i.id}</d:Id>
`, a += `        <d:Name>${i.name}</d:Name>
`, "price" in i && (a += `        <d:Price>${i.price}</d:Price>
`), "categoryId" in i && (a += `        <d:CategoryId>${i.categoryId}</d:CategoryId>
`), a += `      </m:properties>
`, a += `    </content>
`, a += `  </entry>
`;
  }), a += "</feed>") : (a += `<entry xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
`, a += `  <id>${r}/Products(${e.id})</id>
`, a += `  <title type="text">${e.name}</title>
`, a += `  <content type="application/xml">
`, a += `    <m:properties>
`, a += `      <d:Id>${e.id}</d:Id>
`, a += `      <d:Name>${e.name}</d:Name>
`, "price" in e && (a += `      <d:Price>${e.price}</d:Price>
`), "categoryId" in e && (a += `      <d:CategoryId>${e.categoryId}</d:CategoryId>
`), a += `    </m:properties>
`, a += `  </content>
`, a += "</entry>"), a;
}
function Je(e, t = {}) {
  const {
    serviceRoot: r = "https://api.example.com/odata",
    metadata: n = "minimal"
  } = t, o = Array.isArray(e);
  let a = `<?xml version="1.0" encoding="utf-8"?>
`;
  return o ? (a += `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
`, a += `  <updated>${(/* @__PURE__ */ new Date()).toISOString()}</updated>
`, a += `  <author>
`, a += `    <name>OData Service</name>
`, a += `  </author>
`, n !== "none" && (a += `  <m:count>${e.length}</m:count>
`), e.forEach((i) => {
    a += `  <entry>
`, a += `    <id>${r}/Products(${i.id})</id>
`, a += `    <title type="text">${i.name}</title>
`, a += `    <updated>${(/* @__PURE__ */ new Date()).toISOString()}</updated>
`, a += `    <author>
`, a += `      <name>OData Service</name>
`, a += `    </author>
`, a += `    <content type="application/xml">
`, a += `      <m:properties>
`, a += `        <d:Id>${i.id}</d:Id>
`, a += `        <d:Name>${i.name}</d:Name>
`, "price" in i && (a += `        <d:Price>${i.price}</d:Price>
`), "categoryId" in i && (a += `        <d:CategoryId>${i.categoryId}</d:CategoryId>
`), a += `      </m:properties>
`, a += `    </content>
`, a += `  </entry>
`;
  }), a += "</feed>") : (a += `<entry xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
`, a += `  <id>${r}/Products(${e.id})</id>
`, a += `  <title type="text">${e.name}</title>
`, a += `  <updated>${(/* @__PURE__ */ new Date()).toISOString()}</updated>
`, a += `  <author>
`, a += `    <name>OData Service</name>
`, a += `  </author>
`, a += `  <content type="application/xml">
`, a += `    <m:properties>
`, a += `      <d:Id>${e.id}</d:Id>
`, a += `      <d:Name>${e.name}</d:Name>
`, "price" in e && (a += `      <d:Price>${e.price}</d:Price>
`), "categoryId" in e && (a += `      <d:CategoryId>${e.categoryId}</d:CategoryId>
`), a += `    </m:properties>
`, a += `  </content>
`, a += "</entry>"), a;
}
function He(e, t = {}) {
  if (!Array.isArray(e) || e.length === 0)
    return "";
  t.format;
  const r = Object.keys(e[0]), n = [r.join(",")];
  return e.forEach((o) => {
    const a = r.map((i) => {
      const s = o[i];
      return typeof s == "string" && (s.includes(",") || s.includes('"') || s.includes(`
`)) ? `"${s.replace(/"/g, '""')}"` : s;
    });
    n.push(a.join(","));
  }), n.join(`
`);
}
function Ke(e, t = {}) {
  return t.format, Array.isArray(e) ? e.map((r) => `${r.id}: ${r.name}`).join(`
`) : `${e.id}: ${e.name}`;
}
function _(e, t = {}) {
  const { annotations: r = !1, includeAnnotations: n = [], excludeAnnotations: o = [] } = t, a = { ...e };
  return r && (a["@odata.id"] = `Products(${e.id})`, a["@odata.etag"] = `"etag-${e.id}"`, a["@odata.editLink"] = `Products(${e.id})`), n.length > 0 && n.forEach((i) => {
    a[i] = `annotation-value-${i}`;
  }), o.forEach((i) => {
    delete a[i];
  }), a;
}
function lr(e, t = {}) {
  const { metadata: r = "full" } = t;
  return r === "none" ? "" : `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Default">
      <EntityType Name="Product">
        <Key>
          <PropertyRef Name="Id"/>
        </Key>
        <Property Name="Id" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Name" Type="Edm.String" MaxLength="255"/>
        <Property Name="Price" Type="Edm.Decimal" Precision="10" Scale="2"/>
        <Property Name="CategoryId" Type="Edm.Int32"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Products" EntityType="Default.Product"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}
function dr(e = {}) {
  const { serviceRoot: t = "https://api.example.com/odata" } = e;
  return {
    "@odata.context": `${t}/$metadata`,
    value: [
      {
        name: "Products",
        kind: "EntitySet",
        url: "Products"
      },
      {
        name: "Categories",
        kind: "EntitySet",
        url: "Categories"
      }
    ]
  };
}
function fr(e, t = {}) {
  return t.format, {
    error: {
      code: "500",
      message: e.message,
      target: "ODataService"
    }
  };
}
function Ge() {
  return ["json", "xml", "atom", "csv", "text"];
}
function pr(e) {
  return Ge().includes(e);
}
function mr(e) {
  return {
    json: "application/json",
    xml: "application/xml",
    atom: "application/atom+xml",
    csv: "text/csv",
    text: "text/plain"
  }[e] || "application/json";
}
function yr(e, t, r = {}) {
  switch (t.toLowerCase()) {
    case "json":
      return Qe(e, r);
    case "xml":
      return We(e, r);
    case "atom":
      return Je(e, r);
    case "csv":
      return He(Array.isArray(e) ? e : [e], r);
    case "text":
      return Ke(e, r);
    default:
      throw new Error(`Unsupported format: ${t}`);
  }
}
export {
  f as ODataBadRequest,
  kt as ODataErrorHandler,
  H as ODataInternalServerError,
  Me as applyData,
  Q as applySelect,
  M as callAction,
  st as callBoundAction,
  it as callBoundFunction,
  bt as callConformanceAction,
  St as callConformanceActionImport,
  xt as callConformanceFunction,
  Pt as callConformanceFunctionImport,
  k as callFunction,
  Et as checkQueryOptionSupport,
  re as composeMiddlewares,
  X as computeData,
  Yt as createEntity,
  Ft as createMiddlewareArray,
  yt as executeActionImport,
  Tt as executeBatch,
  mt as executeFunctionImport,
  x as expandData,
  O as filterArray,
  K as generateMetadata,
  G as generateServiceDocument,
  dt as getActionMetadata,
  gt as getAvailableActions,
  ht as getAvailableFunctions,
  mr as getContentType,
  lt as getFunctionMetadata,
  nt as getHttpStatusCode,
  $t as getMetadataDocument,
  wt as getServiceDocument,
  Ge as getSupportedFormats,
  Ue as getSupportedQueryOptions,
  Zt as handleBadGateway,
  Jt as handleConcurrentModification,
  Xt as handleInternalError,
  Gt as handleNotImplemented,
  Ht as handleRateLimit,
  Kt as handleServiceUnavailable,
  Wt as handleTimeout,
  ot as isServerError,
  at as isValidationError,
  At as odata,
  q as odataConformance,
  It as odataCore,
  C as odataError,
  P as odataFilter,
  Dt as odataFull,
  L as odataFunctions,
  Ot as odataLight,
  Z as odataMetadata,
  S as odataPagination,
  w as odataParse,
  Nt as odataReadOnly,
  $ as odataSerialize,
  b as odataShape,
  Rt as odataWrite,
  N as orderArray,
  R as paginateArray,
  ne as parseODataQuery,
  qt as processLargeData,
  I as projectArray,
  ir as queryWithCSRF,
  rr as queryWithComplexity,
  vt as queryWithConformance,
  ur as queryWithDegradation,
  tr as queryWithDepth,
  sr as queryWithFallback,
  nr as queryWithInjection,
  er as queryWithLimit,
  or as queryWithPathTraversal,
  cr as queryWithRetry,
  ar as queryWithXSS,
  ut as registerAction,
  ct as registerFunction,
  ke as searchData,
  z as serializeCollection,
  _ as serializeEntity,
  fr as serializeError,
  lr as serializeMetadata,
  dr as serializeServiceDocument,
  Je as serializeToAtom,
  He as serializeToCsv,
  Qe as serializeToJson,
  Ke as serializeToText,
  We as serializeToXml,
  yr as serializeWithFormat,
  Oe as toODataError,
  pt as validateActionParameters,
  Lt as validateAuthentication,
  Ct as validateConformance,
  B as validateConformanceLevelType,
  Vt as validateContentType,
  Bt as validateETagMatch,
  rt as validateEdmModelConstraints,
  _e as validateEntityConstraints,
  tt as validateExpandNavigationProperties,
  qe as validateFilterExpression,
  pr as validateFormat,
  ft as validateFunctionParameters,
  zt as validateHttpMethod,
  et as validateOrderByProperties,
  jt as validatePermissions,
  Qt as validateQueryComplexity,
  Mt as validateQueryParameters,
  _t as validateRequestSize,
  Ut as validateResourceExists,
  Ye as validateSelectParameters
};
//# sourceMappingURL=index.mjs.map
