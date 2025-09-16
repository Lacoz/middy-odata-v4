// Middleware execution order
export const MIDDLEWARE_ORDER = [
    "parse",
    "shape",
    "filter",
    "pagination",
    "serialize",
    "error",
    "functions",
    "metadata",
    "conformance"
];
