# DynamoDB Data Provider Example

This example demonstrates how to connect the `middy-odata-v4` middleware to a DynamoDB table using the AWS SDK v3 document client. It focuses on a serverless-friendly developer experience: every command you need to bootstrap, seed, and smoke-test the handler locally is provided, and the OData middleware is configured to expose a feature-complete entity set backed by DynamoDB.

## Features

- Real DynamoDB integration using the document client
- Automatic table bootstrap and seed data via `pnpm run bootstrap`
- Local invocation script (`pnpm run demo`) that simulates an API Gateway event
- OData configuration with filtering, pagination, metadata and response shaping enabled
- Environment variable driven configuration so you can point at DynamoDB Local, LocalStack or AWS

## Prerequisites

- Node.js 18+
- `pnpm`
- A DynamoDB endpoint. You can use:
  - **DynamoDB Local**: `docker run -p 8000:8000 amazon/dynamodb-local`
  - **LocalStack** with DynamoDB enabled
  - **AWS account** with credentials in your shell

## Installation

```bash
pnpm install
```

## Configure the environment

| Variable | Default | Description |
| --- | --- | --- |
| `TABLE_NAME` | `ODataUsers` | DynamoDB table that stores the sample users |
| `AWS_REGION` | `us-east-1` | Region used by the SDK |
| `DYNAMODB_ENDPOINT` | *(unset)* | Override when talking to DynamoDB Local/LocalStack |

When using DynamoDB Local in Docker, set `DYNAMODB_ENDPOINT=http://localhost:8000`.

## Bootstrap data

Create the table and load a few rows:

```bash
pnpm run bootstrap
```

The script is idempotent – it creates the table if necessary, waits for it to become `ACTIVE`, and then upserts the sample data.

## Run a local smoke test

Execute the handler with a synthetic API Gateway event:

```bash
pnpm run demo
```

The script prints the OData-formatted response body so you can quickly verify filtering, pagination, and metadata features.

## Deploying to AWS Lambda

1. Package the TypeScript handler using your preferred bundler (esbuild, webpack, etc.)
2. Deploy the compiled handler and include the same environment variables
3. Grant the Lambda execution role read access to the DynamoDB table

The handler is defined in [`index.ts`](./index.ts) and demonstrates how to plug a DynamoDB-backed data provider into the middleware with minimal boilerplate.
