# HTTP Data Provider Example

This example proxies two public HTTP APIs through the `middy-odata-v4` middleware:

1. **TripPin OData service** – already exposes data in OData JSON. We fetch, normalize, and surface it through our own EDM.
2. **JSONPlaceholder REST service** – returns plain JSON. We adapt the payload into an OData entity set.

The goal is to show how you can reuse existing services without duplicating data storage.

## Highlights

- Uses the native `fetch` API (Node.js 18+) to call remote services
- Demonstrates mapping both OData-native and plain REST responses into your EDM
- Includes a local demo script that exercises two routes (`/People` and `/Todos`)
- Shows how to enrich the EDM with annotations for better client discovery

## Prerequisites

- Node.js 18+
- `pnpm`
- Outbound network access (the demo hits public internet services)

## Install & Run

```bash
pnpm install
pnpm run demo
```

The demo invokes the Lambda handler twice:

- `/People?$select=userName,firstName,lastName,city&$top=3`
- `/Todos?$filter=completed eq false&$orderby=title&$top=5`

It prints the serialized OData payload for both responses so you can inspect the transformed data.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `TRIPPIN_ROOT` | `https://services.odata.org/V4/TripPinServiceRW/` | Base URL of the upstream OData service |
| `JSON_PLACEHOLDER_ROOT` | `https://jsonplaceholder.typicode.com` | Base URL of the REST API |
| `SERVICE_ROOT` | `https://api.example.com/odata/http` | Service root used in the `@odata.context` metadata |

If your environment blocks outbound traffic, set the variables to point at local mocks before running the demo.

## Deploying

Deploy the compiled handler as usual. Because the example performs outbound HTTP calls, make sure your Lambda has internet access (NAT or VPC endpoints) and consider adding caching to stay within upstream rate limits.
