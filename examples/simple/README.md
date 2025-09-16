# Simple OData Example

A basic example demonstrating `middy-odata-v4` middleware with AWS Lambda.

## Features

- **Single Entity**: Users with CRUD operations
- **OData Queries**: `$select`, `$filter`, `$orderby`, `$top`, `$skip`, `$count`
- **Metadata Service**: Auto-generated from EDM model
- **TypeScript**: Full type safety

## Quick Start

```bash
npm install
npm run build
npm run deploy
```

## API Endpoints

- `GET /Users` - Get all users
- `GET /Users/{id}` - Get specific user
- `POST /Users` - Create user
- `PUT /Users/{id}` - Update user
- `DELETE /Users/{id}` - Delete user
- `GET /$metadata` - OData metadata
- `GET /` - Service document

## Example Queries

```bash
# Filter active users
GET /Users?$filter=active eq true

# Select specific fields
GET /Users?$select=id,name,email

# Sort and paginate
GET /Users?$orderby=name asc&$top=5&$skip=10

# Count users
GET /Users?$count=true
```

## User Entity

| Property | Type | Description |
|----------|------|-------------|
| id | Int32 | Primary key |
| name | String | Full name |
| email | String | Email address |
| age | Int32 | Age |
| active | Boolean | Active status |
| createdAt | DateTimeOffset | Creation date |

## Next Steps

1. Replace mock data with database
2. Add validation and authentication
3. Explore the [complex example](../complex/) for advanced features