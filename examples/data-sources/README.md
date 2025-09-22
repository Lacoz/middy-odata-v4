# Data Source Integration Examples

This example project shows how to connect `middy-odata-v4` middleware to real data stores. It contains three Lambda handler samples:

1. **DynamoDB-backed entity set** – wraps a table that has no native OData support and exposes it as an OData collection.
2. **HTTP JSON bridge** – hydrates an entity set from a REST/HTTP endpoint that returns plain JSON.
3. **OData proxy** – forwards validated query options to an upstream OData service while keeping the Middy middleware in charge of validation and error handling.

Each scenario demonstrates how to compose the middleware and how to work with the parsed query options.

## Getting started

```bash
pnpm install
pnpm build
```

> The example uses the root package via `file:../../` so it always reflects the local source code changes.

## Handlers

| Handler | Description |
|---------|-------------|
| `dynamoUsersHandler` | Scans a DynamoDB table, maps the raw items to the EDM model and lets the OData middleware handle query options, shaping and serialization. |
| `httpCatalogHandler` | Calls a plain JSON HTTP API (no OData) and projects the response into the configured entity set. |
| `odataProxyHandler` | Parses OData options locally, rebuilds a sanitized query string and forwards it to an upstream OData-compliant service such as the public OData demo service. |

The code is heavily commented and highlights the extension points you can adapt for your own projects (custom mappers, caching, pagination, error translation and more).
