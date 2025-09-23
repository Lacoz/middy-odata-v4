# Examples

This directory contains example implementations of middy-odata-v4 middleware for AWS Lambda.

## Simple Example

**Location**: \`simple/\`

A basic example demonstrating:
- Single entity type (Users)
- Basic OData query options
- Simple filtering and pagination
- API Gateway integration

**Perfect for**: Getting started, learning the basics, simple APIs

## Complex Example

**Location**: \`complex/\`

An advanced example demonstrating:
- Multiple related entities (Products, Categories, Suppliers, Orders, OrderItems)
- Navigation properties and relationships
- Complex filtering and expansion
- Multi-entity routing
- Real-world e-commerce scenario

**Perfect for**: Production applications, complex data models, learning advanced features

## DynamoDB Data Provider

**Location**: `dynamodb/`

Demonstrates routing directly against a DynamoDB table using the AWS SDK v3 document client.

- One command (`pnpm run bootstrap`) to create and seed the table
- Local invocation script for repeatable smoke tests
- Shows how to enable pagination, filtering, and metadata for document data
- Environment-driven configuration so you can target DynamoDB Local, LocalStack, or AWS

## SQLite Catalog Example

**Location**: `sqlite/`

Uses a lightweight SQLite database generated from a TypeScript script to power a product catalog with navigation properties.

- Bootstrap script builds the `.db` file on demand (no binaries in git)
- Demonstrates `$expand`, `$select`, and navigation bindings between `Products` and `Categories`
- Highlights the shape middleware with relational data

## HTTP Data Provider Bridge

**Location**: `http-providers/`

Proxies two public services – the TripPin OData sample service and JSONPlaceholder REST API – through a single OData endpoint.

- Fetches upstream OData JSON and plain REST responses
- Normalizes payloads into your EDM model
- Provides a demo script that invokes `/People` and `/Todos` with query options
- Great starting point for façade APIs that combine multiple sources

## Getting Started

1. Choose an example that matches your needs
2. Navigate to the example directory
3. Install dependencies: \`npm install\`
4. Build the project: \`npm run build\`
5. Deploy to AWS Lambda or run locally

## Example Comparison

| Feature | Simple | Complex | DynamoDB | SQLite | HTTP Providers |
|---------|--------|---------|----------|--------|----------------|
| Entity Types | 1 (Users) | 5 (Products, Categories, Suppliers, Orders, OrderItems) | 1 (User) | 2 (Products, Categories) | 2 (People, Todos) |
| Data Source | In-memory array | In-memory relational graph | DynamoDB table | SQLite database | Public HTTP APIs |
| Navigation Properties | None | Multiple relationships | None | Products ↔ Categories | None |
| Filtering | Basic string matching | Advanced expressions | Document scan + OData filter | SQL-backed filters | Remote payload filtering |
| Expansion | Not implemented | Full $expand support | Not applicable | `$expand=Category` | Not applicable |
| Routing | Single endpoint | Multi-entity routing | Auto entity set routing | Auto entity set routing | Auto entity set routing |
| Business Logic | Minimal | Real-world scenarios | Document-to-EDM mapping | SQL query translation | HTTP response normalization |
| Use Case | Learning, simple APIs | Production, complex systems | Serverless with DynamoDB | Local prototyping & relational data | API façade / aggregation |

## Common Patterns

Both examples demonstrate these common patterns:

- **EDM Model Definition**: How to define your data model
- **Middleware Configuration**: Setting up the OData middleware
- **Query Processing**: Handling OData query options
- **Response Formatting**: Returning OData-compliant responses
- **Error Handling**: Proper error responses
- **TypeScript Integration**: Full type safety

## Next Steps

After exploring the examples:

1. **Customize the EDM model** for your data
2. **Implement your business logic** in the handler functions
3. **Add database integration** (replace mock data)
4. **Deploy to AWS Lambda** with API Gateway
5. **Test with OData clients** like Postman or OData Explorer

## Support

For questions about the examples or the middleware:

- Check the main README for detailed documentation
- Review the test files for additional usage patterns
- Open an issue for bugs or feature requests
