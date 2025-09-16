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

**Note**: The `deploy` script creates a `docker-test/deployment/` directory for testing. This is a build artifact and can be safely deleted.

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