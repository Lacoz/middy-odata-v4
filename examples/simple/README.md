# Simple OData Example

A beginner-friendly example showing how to create an OData API with AWS Lambda.

## Quick Start

```bash
pnpm install
pnpm run build
pnpm run deploy
```

## Test Locally

```bash
cd docker-test
./test.sh
```

## Deploy to AWS Lambda

1. Upload `simple-odata-example.zip` to AWS Lambda
2. Set handler to: `index.handler`
3. Set runtime to: Node.js 22.x

**Note**: The `deploy` script creates build artifacts (`deployment/` folder and `*.zip` file) that can be safely deleted after deployment.

## API Endpoints

- `GET /Users` - Get all users
- `GET /$metadata` - OData metadata  
- `GET /` - Service document

## What This Example Shows

- Simple OData model definition
- Basic Lambda handler
- OData metadata generation
- Service document creation
- Error handling