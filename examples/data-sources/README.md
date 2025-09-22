# Data Sources Example

This example demonstrates how `middy-odata-v4` can aggregate data from three very different backends while presenting a single OData-compliant interface.

- **DynamoDB (Users)** – reads from a DocumentClient table and pushes simple `$filter`/`$top` hints to the scan request.
- **Plain JSON HTTP API (Tasks)** – fetches data from a non-OData REST endpoint and lets the middleware apply `$filter`, `$orderby`, and `$select` locally.
- **Upstream OData service (RemoteProducts)** – forwards the parsed query options to the public [OData demo service](https://services.odata.org/) and normalises the payload.

The middleware now passes the parsed query context to every data provider, so each backend can choose to optimise queries, push pagination, or ignore options as needed.

## Prerequisites

- Node.js 18+ (for built-in `fetch` support)
- `pnpm` (matching the version used in the root project)
- Optional AWS credentials if you want to read from a real DynamoDB table

Environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `USERS_TABLE` | DynamoDB table that stores user rows | _unset → uses in-memory fixtures_ |
| `AWS_REGION` | Region for DynamoDB client | `us-east-1` |
| `TASK_SERVICE_URL` | Plain HTTP endpoint returning JSON todos | `https://jsonplaceholder.typicode.com/todos` |
| `ODATA_SERVICE_URL` | Upstream OData service base URL | `https://services.odata.org/V4/OData/OData.svc` |

## Install & run locally

```bash
pnpm install
pnpm run local
```

The `local` script compiles the TypeScript sources and invokes `local-run.ts`, which simulates three API Gateway requests:

1. `/Users?$top=2&$filter=isActive eq true` – tries DynamoDB first, falls back to fixtures if unavailable.
2. `/Tasks?$orderby=completed desc&$top=3` – hydrates from a plain REST API and lets the OData middleware do the rest.
3. `/RemoteProducts?$select=ID,Name,Price&$top=2` – forwards query options to the remote OData demo service.

Each response printed to the console is a complete OData payload (including `@odata.context`) produced by the middleware.

## Deploying behind API Gateway

When deployed to API Gateway + Lambda, the handler exported from `index.ts` automatically routes paths that match your entity set names:

- `GET /Users?...` → DynamoDB-backed provider
- `GET /Tasks?...` → HTTP JSON provider
- `GET /RemoteProducts?...` → Upstream OData provider

Because the providers receive `ODataMiddlewareContext`, they can inspect `context.options` and implement backend-specific optimisation such as:

- Converting `$filter=field eq 'value'` into a DynamoDB `FilterExpression`
- Adjusting pagination limits based on `$top`/`$skip`
- Forwarding `$select`, `$filter`, `$orderby`, `$top`, `$skip`, `$count`, `$compute`, and `$apply` to a remote OData API

## Customising the example

- Replace the fallback fixtures with your own seed data for repeatable demos.
- Extend `applyDynamoFilter` to support richer expression translation or to use Query operations instead of Scan.
- Implement authentication/headers inside `loadTasksFromHttp` or `loadRemoteProductsFromOData` to target internal services.
- Add more entity sets and navigation properties; the updated data-provider contract works with the expand resolver in `odataShape`.

> **Tip:** The upstream call intentionally leaves `$expand` forwarding out of scope to keep the example concise. You can enrich `buildUpstreamQuery` with custom logic if the remote service supports complex expansions.
