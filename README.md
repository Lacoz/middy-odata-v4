# middy-odata-v4

[![CI](https://github.com/Lacoz/middy-odata-v4/actions/workflows/ci.yml/badge.svg)](https://github.com/Lacoz/middy-odata-v4/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/middy-odata-v4.svg)](https://badge.fury.io/js/middy-odata-v4)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

Middy middleware for AWS Lambda that parses and applies OData v4.01 query options and produces OData-compliant responses. This repository starts with a complete, test-first plan and suite to verify OData 4.01 core behaviors relevant to typical REST-backed collections.

- Middy third-party middlewares reference: [Third-party middlewares](https://middy.js.org/docs/middlewares/third-party/)
- OData 4.01 Protocol: [OASIS OData V4.01 Part 1: Protocol](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html)

## Test plan (documented first)

This test plan targets a pragmatic subset of OData v4.01 that is broadly useful in serverless APIs. Each test describes expected inputs/outputs and observable behavior from the middleware when attached to a Lambda handler.

### 1) Query option parsing

Covers decoding and validation of query options from API Gateway events.

- $select
  - Parses comma-separated property paths
  - Rejects empty selections and invalid identifiers
  - Supports selection of nested properties (path segments)
- $expand
  - Parses navigation properties with nested options
  - Supports nested $select, $filter, $orderby, $top, $skip inside $expand items
  - Validates expand targets against EDM model
- $filter
  - Supports logical operators: and, or, not
  - Comparison operators: eq, ne, gt, ge, lt, le
  - String functions: startswith, endswith, contains
  - Math/date literals and nulls
  - Parameter aliasing (e.g., $filter=Name eq @p1&@p1=Alice)
  - Precedence and parentheses
- $orderby
  - Parses multi-terms with direction (asc|desc)
  - Validates selected properties exist
- $top, $skip
  - Coerces to integers, validates ranges (non-negative)
- $count
  - Parses boolean true/false
- $search (ignored by default)
  - Accepted but returns validation error unless explicitly enabled
- $format (ignored by default)
  - Accepted values: json (default); non-json rejected
- $compute (optional)
  - Rejected unless enabled; validates computed aliases
- $apply (aggregation)
  - Rejected unless explicitly enabled

Expected outcome: structured `odata` object attached to request context, or a 400 error with an OData error payload.

### 2) Data shaping: $select, $expand

- Applies projection to plain JSON objects/arrays
- For $expand:
  - Invokes provided resolvers for navigation props
  - Applies nested query options to expanded collections
  - Prevents N+1 via batched resolver interface (contract tested with mocks)

### 3) Filtering, ordering, pagination

- $filter:
  - Evaluates expression against item objects
  - Supports null handling and type coercions (string/number/bool/date)
- $orderby:
  - Stable multi-key sort
  - Null ordering consistent with OData defaults
- $top/$skip:
  - Applies after filtering and ordering
  - Edge cases: $top=0, $skip beyond length
- $count=true:
  - Returns total count before pagination

### 4) Serialization and response shape

For a collection result:
- JSON object with `value` array
- Optional `@odata.count` when `$count=true`
- Optional `@odata.nextLink` when pagination indicates more results
- `@odata.context` produced from service root and entity set

For a single entity:
- JSON object of the entity with `@odata.context`

For errors:
- OData error format `{ "error": { "code": string, "message": string, "target"?: string, "details"?: [...] } }`
- Correct HTTP status codes for validation vs server errors

### 5) EDM model validation

- Rejects selections/filters on properties not in EDM
- Validates types in $filter comparisons
- Validates navigation properties in $expand

### 6) Middleware behavior

- Compatible with Middy use: `middy(handler).use(odataMiddleware(options))`
- Works with API Gateway v1/v2 events (REST and HTTP APIs)
- Exposes parsed options on `request.internal.odata` and helpers
- Allows user handler to provide raw dataset or an async iterator
- Respects context timeouts; short-circuits heavy $expand when near timeout

### 7) Configuration toggles

- Enable/disable advanced options: $compute, $apply, $search
- Max page size; default top; hard limit for top
- Case sensitivity toggle for property names (default case-sensitive per model)
- Custom `@odata.context` base URL resolver
- Error redaction toggle for production

### 8) Security/robustness

- Guards against prototype pollution during parsing
- Prevents pathological expressions via depth/length limits
- Timeouts and circuit-breakers for resolvers

## Current Implementation Status

✅ **Completed**: Modular middleware architecture with comprehensive test suite
✅ **Completed**: Basic query parsing for $select, $orderby, $top, $skip, $count
✅ **Completed**: Basic $filter parsing (evaluation partially implemented)
✅ **Completed**: Basic $expand structure (functionality limited)
✅ **Completed**: OData response serialization and error handling
✅ **Completed**: Middleware composition and configuration system

🔄 **In Progress**: Full OData v4.01 functionality implementation
- $filter evaluation needs completion
- $expand navigation property resolution needs implementation
- $search, $compute, $apply are disabled by default (minimal implementation)

⚠️ **Note**: Some advanced features are still being implemented

## Architecture

This library provides two approaches for using OData middleware:

### 1. Pre-composed Middleware (Recommended)

The main `odata()` middleware provides all OData functionality in a single, easy-to-use package:

```ts
import { odata } from "middy-odata-v4";

const handler = middy(baseHandler)
  .use(odata({
    model: EDM_MODEL,
    serviceRoot: "https://api.example.com/odata",
    enable: {
      functions: true,
      metadata: true,
      conformance: true,
    },
    defaults: {
      maxTop: 1000,
      defaultTop: 50,
    },
  }));
```

### 2. Individual Middlewares (Advanced)

For fine-grained control, you can use individual middlewares:

```ts
import { 
  odataParse, 
  odataShape, 
  odataFilter, 
  odataPagination, 
  odataSerialize,
  odataError 
} from "middy-odata-v4";

const handler = middy(baseHandler)
  .use(odataParse({ model: EDM_MODEL, serviceRoot: "https://api.example.com/odata" }))
  .use(odataShape({ enableExpand: true }))
  .use(odataFilter({ caseSensitive: false }))
  .use(odataPagination({ maxTop: 100 }))
  .use(odataSerialize({ prettyPrint: true }))
  .use(odataError({ logErrors: true }));
```

### 3. Convenience Middleware Arrays

Pre-configured middleware combinations for common use cases:

```ts
import { odataCore, odataFull, odataLight } from "middy-odata-v4";

// Core functionality (parsing, shaping, filtering, pagination, serialization)
const handler = middy(baseHandler)
  .use(...odataCore({ model: EDM_MODEL, serviceRoot: "https://api.example.com/odata" }));

// Full functionality including error handling
const handler = middy(baseHandler)
  .use(...odataFull({ model: EDM_MODEL, serviceRoot: "https://api.example.com/odata" }));

// Lightweight (parsing and serialization only)
const handler = middy(baseHandler)
  .use(...odataLight({ model: EDM_MODEL, serviceRoot: "https://api.example.com/odata" }));
```

## Quick Start

```bash
npm install middy-odata-v4 @middy/core
```

```ts
import middy from "@middy/core";
import { odata, type EdmModel } from "middy-odata-v4";

const model: EdmModel = {
  namespace: "MyApp",
  entityTypes: [{
    name: "User",
    key: ["id"],
    properties: [
      { name: "id", type: "Edm.Int32" },
      { name: "name", type: "Edm.String" },
      { name: "email", type: "Edm.String" },
    ],
  }],
  entitySets: [{ name: "Users", entityType: "User" }],
};

const handler = middy(async (event) => {
  const { options } = event.internal.odata;
  
  // Your data logic here
  const users = await getUsers(options);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      "@odata.context": `${event.internal.odata.serviceRoot}/$metadata#Users`,
      value: users,
    }),
  };
}).use(odata({ model, serviceRoot: "https://api.example.com/odata" }));

export { handler };
```

## Individual Middlewares

The library provides the following individual middlewares that can be used independently:

### `odataParse`
Parses query parameters and sets up OData context.

```ts
import { odataParse } from "middy-odata-v4";

.use(odataParse({
  model: EDM_MODEL,
  serviceRoot: "https://api.example.com/odata",
  validateAgainstModel: true,
  strictMode: false,
}))
```

### `odataShape`
Applies `$select` and `$expand` transformations to response data.

```ts
import { odataShape } from "middy-odata-v4";

.use(odataShape({
  enableExpand: true,
  maxExpandDepth: 3,
  expandResolvers: {
    "Users": async (ids) => await getUsersByIds(ids),
  },
}))
```

### `odataFilter`
Applies `$filter` and `$orderby` to response data.

```ts
import { odataFilter } from "middy-odata-v4";

.use(odataFilter({
  enableFilter: true,
  enableOrderby: true,
  caseSensitive: true,
}))
```

### `odataPagination`
Handles `$top`, `$skip`, and `$count` operations.

```ts
import { odataPagination } from "middy-odata-v4";

.use(odataPagination({
  maxTop: 1000,
  defaultTop: 50,
  enableCount: true,
}))
```

### `odataSerialize`
Formats responses according to OData standards.

```ts
import { odataSerialize } from "middy-odata-v4";

.use(odataSerialize({
  format: "json",
  includeMetadata: true,
  prettyPrint: false,
}))
```

### `odataError`
Handles errors and formats them according to OData standards.

```ts
import { odataError } from "middy-odata-v4";

.use(odataError({
  includeStackTrace: false,
  logErrors: true,
  customErrorHandler: async (error, context, request) => {
    // Custom error handling logic
    return null; // Return null to use default handling
  },
}))
```

### `odataFunctions`
Handles OData function and action calls.

```ts
import { odataFunctions } from "middy-odata-v4";

.use(odataFunctions({
  enableFunctions: true,
  enableActions: true,
  functionResolvers: {
    "GetTopProducts": async (params) => await getTopProducts(params.count),
  },
  actionResolvers: {
    "ResetPassword": async (params) => await resetPassword(params.userId),
  },
}))
```

### `odataMetadata`
Provides OData metadata endpoints (`$metadata` and service document).

```ts
import { odataMetadata } from "middy-odata-v4";

.use(odataMetadata({
  enableMetadata: true,
  enableServiceDocument: true,
  includeAnnotations: true,
  metadataPath: "/$metadata",
  serviceDocumentPath: "/",
}))
```

### `odataConformance`
Manages OData conformance levels and validation.

```ts
import { odataConformance } from "middy-odata-v4";

.use(odataConformance({
  conformanceLevel: "minimal", // "minimal" | "intermediate" | "advanced"
  strictMode: false,
  validateQueries: true,
}))
```

## Configuration

```ts
const middleware = odata({
  model: myEdmModel,
  serviceRoot: "https://api.example.com/odata",
  enable: { compute: false, apply: false, search: false },
  defaults: { maxTop: 1000, defaultTop: 50 },
});
```

## Supported Query Options

✅ **Fully Implemented**:
- `$select` - Field selection
- `$orderby` - Sorting
- `$top` / `$skip` - Pagination
- `$count` - Include total count

🔄 **Partially Implemented**:
- `$filter` - Basic parsing, evaluation needs completion
- `$expand` - Structure exists, navigation resolution needs implementation

⚠️ **Minimal Implementation** (disabled by default):
- `$search` - Basic structure only
- `$compute` - Basic structure only  
- `$apply` - Basic structure only

## Examples

- **[Simple Example](examples/simple/)** - Basic user management API
- **[Complex Example](examples/complex/)** - E-commerce system with multiple entities

## Implementation Status

✅ **Completed**: Modular middleware architecture, basic query parsing, response serialization, error handling

🔄 **In Progress**: Full OData v4.01 functionality implementation
- Complete $filter expression evaluation
- Implement $expand navigation property resolution
- Enhance $search, $compute, $apply functionality
- Replace placeholder tests with actual implementations

### Next Steps
- **Core Features**: Complete $filter and $expand implementations
- **Advanced Features**: Implement $search, $compute, $apply
- **Testing**: Enhance test coverage for advanced features
- **Documentation**: Update examples to reflect actual capabilities

## References

- Middy Third-party middleware list: https://middy.js.org/docs/middlewares/third-party/
- OData v4.01 Protocol: https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html


## Publishing

This package uses [semantic-release](https://github.com/semantic-release/semantic-release) for automatic versioning and publishing to npm.

### How it works

- **Automatic Versioning**: Version numbers are determined by conventional commit messages
- **Automatic Publishing**: New versions are automatically published to npm when pushed to `main`
- **Changelog Generation**: CHANGELOG.md is automatically updated with release notes

### Commit Message Format

Use conventional commits for automatic versioning:

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)  
- `BREAKING CHANGE:` - Breaking changes (major version bump)
- `chore:` - Maintenance tasks (no version bump)

### Manual Release

To trigger a release manually:

```bash
pnpm release
```

### First Release

The first release will be version `0.0.1` and will be published automatically when:
1. Code is pushed to the `main` branch
2. All tests pass
3. NPM_TOKEN is configured in GitHub secrets
