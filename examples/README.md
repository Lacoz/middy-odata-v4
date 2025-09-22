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

## Data Sources Example

**Location**: `data-sources/`

Demonstrates how to mix multiple backends behind the same OData surface:
- DynamoDB-backed entity set with `$filter`/`$top` hints pushed into Scan
- Plain REST/JSON service that relies on the middleware for shaping & filtering
- Upstream OData HTTP service where query options are forwarded verbatim
- Local runner that simulates API Gateway for quick demos

**Perfect for**: Integration-heavy workloads, progressive migration to OData, showcasing optimisation hooks

## Getting Started

1. Choose an example that matches your needs
2. Navigate to the example directory
3. Install dependencies: \`npm install\`
4. Build the project: \`npm run build\`
5. Deploy to AWS Lambda or run locally

## Example Comparison

| Feature | Simple | Data Sources | Complex |
|---------|--------|--------------|---------|
| Entity Types | 1 (Users) | 3 (Users, Tasks, RemoteProducts) | 5 (Products, Categories, Suppliers, Orders, OrderItems) |
| Navigation Properties | None | None (focus on sourcing) | Multiple relationships |
| Filtering | Basic string matching | DynamoDB filter push-down + middleware filtering | Advanced expressions |
| Expansion | Not implemented | Not showcased | Full $expand support |
| Routing | Single endpoint | Multi-entity routing with contextual providers | Multi-entity routing |
| Business Logic | Minimal | Integration-focused | Real-world scenarios |
| External Services | None | DynamoDB + HTTP + OData service | In-memory fixtures |
| Local Tooling | Basic logs | Local runner + fixtures | Build & deploy scripts |
| Use Case | Learning, simple APIs | Data federation, integration demos | Production, complex systems |

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
