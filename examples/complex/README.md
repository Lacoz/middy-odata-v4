# Complex OData Example

This example demonstrates advanced usage of middy-odata-v4 with multiple related entities, navigation properties, and complex business logic.

## Features

- Multiple entity types (Products, Categories, Suppliers, Orders, OrderItems)
- Navigation properties and relationships
- Complex filtering and expansion
- Multi-entity routing
- Advanced OData query options
- Real-world e-commerce scenario

## Entity Model

### Products
- Basic product information
- Links to categories and suppliers
- Stock management
- Timestamps

### Categories
- Hierarchical category structure
- Parent-child relationships
- Product associations

### Suppliers
- Supplier contact information
- Active/inactive status
- Product associations

### Orders
- Customer information
- Order status tracking
- Date management
- Order item relationships

### OrderItems
- Order-product relationships
- Quantity and pricing
- Links to orders and products

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the project:
   \`\`\`bash
   npm run build
   \`\`\`

3. Deploy to AWS Lambda or run locally

## Example Queries

### Products

\`\`\`bash
# Get all products
GET /products

# Get products with price > 100
GET /products?$filter=price gt 100

# Get in-stock products only
GET /products?$filter=inStock eq true

# Get products with category and supplier info
GET /products?$expand=category,supplier

# Get specific product fields
GET /products?$select=id,name,price&$filter=inStock eq true

# Sort products by price descending
GET /products?$orderby=price desc

# Paginate products
GET /products?$top=10&$skip=20&$count=true
\`\`\`

### Categories

\`\`\`bash
# Get all categories
GET /categories

# Get categories with their products
GET /categories?$expand=products

# Get category hierarchy
GET /categories?$expand=parentCategory,subCategories
\`\`\`

### Orders

\`\`\`bash
# Get all orders
GET /orders

# Get orders by status
GET /orders?$filter=status eq shipped

# Get orders with order items
GET /orders?$expand=orderItems

# Get orders with full details
GET /orders?$expand=orderItems($expand=product)
\`\`\`

### OrderItems

\`\`\`bash
# Get all order items
GET /orderitems

# Get order items with product details
GET /orderitems?$expand=product

# Get order items with order details
GET /orderitems?$expand=order

# Get order items for specific order
GET /orderitems?$filter=orderId eq 1&$expand=product
\`\`\`

## Response Examples

### Products with Expansion

\`\`\`json
{
  "@odata.context": "https://api.example.com/odata/$metadata#Products",
  "value": [
    {
      "id": 1,
      "name": "MacBook Pro",
      "price": 2499.99,
      "category": {
        "id": 2,
        "name": "Computers",
        "description": "Computers and laptops"
      },
      "supplier": {
        "id": 1,
        "name": "TechCorp",
        "contactEmail": "orders@techcorp.com"
      }
    }
  ]
}
\`\`\`

### Orders with Order Items

\`\`\`json
{
  "@odata.context": "https://api.example.com/odata/$metadata#Orders",
  "value": [
    {
      "id": 1,
      "customerName": "John Doe",
      "totalAmount": 2549.98,
      "status": "shipped",
      "orderItems": [
        {
          "id": 1,
          "productId": 1,
          "quantity": 1,
          "unitPrice": 2499.99,
          "totalPrice": 2499.99
        },
        {
          "id": 2,
          "productId": 2,
          "quantity": 1,
          "unitPrice": 49.99,
          "totalPrice": 49.99
        }
      ]
    }
  ]
}
\`\`\`

## Advanced Features

### Multi-Entity Routing
The handler automatically routes requests to the appropriate entity set based on the URL path.

### Navigation Property Expansion
Supports expanding related entities with nested query options.

### Complex Filtering
Implements various filter expressions for different data types.

### Pagination with Count
Supports $top, $skip, and $count for efficient data retrieval.

### Field Selection
Allows clients to request only the fields they need.

## Business Logic

The example includes realistic business logic:

- **Stock Management**: Products have stock quantities and availability
- **Order Processing**: Orders have status tracking and date management
- **Supplier Management**: Suppliers can be active or inactive
- **Category Hierarchy**: Categories can have parent-child relationships
- **Pricing**: Order items track unit prices and total prices

This demonstrates how to build a production-ready OData service with complex relationships and business rules.
