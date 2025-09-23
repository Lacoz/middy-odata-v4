# SQLite Catalog Example

This example shows how to back the OData middleware with a lightweight SQLite database. A TypeScript bootstrap script generates a local database file on demand, so no binary artifacts are checked into source control. The handler demonstrates shape, expand, and aggregation-friendly metadata for a miniature product catalog.

## Why SQLite?

- Zero external services – perfect for local prototyping
- Easy to bundle with Lambda layers or container images
- Predictable SQL queries that translate nicely to OData entity types

## Included tooling

- `pnpm run create-db` builds the database using [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)
- `pnpm run demo` executes the Lambda handler locally with a sample `$expand` and `$filter`
- EDM model covers navigation between `Products` and `Categories`, exposing annotations that light up more of the OData standard

## Setup

```bash
pnpm install
pnpm run create-db
```

The database is created at `data/catalog.db`. The `.gitignore` in this folder keeps it out of version control.

## Local smoke test

```bash
pnpm run demo
```

The script prints the JSON body produced by the middleware so you can verify `$expand`, `$select`, and pagination features against real SQL data.

## Deploying

1. Bundle `index.ts` with your Lambda build (esbuild, webpack, etc.)
2. Package the `catalog.db` file as part of the artifact or regenerate it in a Lambda init hook
3. Ensure the handler can read the file path referenced in `SQLITE_PATH`

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SQLITE_PATH` | `./data/catalog.db` | Location of the SQLite database file |
| `SERVICE_ROOT` | `https://api.example.com/odata/sqlite` | Base URL for OData context metadata |

The handler is located in [`index.ts`](./index.ts) and uses a shared connection pool for all requests to minimize cold-start overhead.
