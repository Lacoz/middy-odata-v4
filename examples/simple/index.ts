import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { EdmModel, generateMetadata, generateServiceDocument } from "middy-odata-v4";

// Simple User data
const users = [
  { id: 1, name: "Alice", email: "alice@example.com", age: 30, active: true },
  { id: 2, name: "Bob", email: "bob@example.com", age: 24, active: false },
  { id: 3, name: "Charlie", email: "charlie@example.com", age: 35, active: true }
];

// Simple OData model
const model: EdmModel = {
  namespace: "SimpleExample",
  entityTypes: [{
    name: "User",
    key: ["id"],
    properties: [
      { name: "id", type: "Edm.Int32", nullable: false },
      { name: "name", type: "Edm.String" },
      { name: "email", type: "Edm.String" },
      { name: "age", type: "Edm.Int32", nullable: false },
      { name: "active", type: "Edm.Boolean", nullable: false }
    ]
  }],
  entitySets: [{ name: "Users", entityType: "User" }]
};

// Main Lambda handler
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const path = event.path;

  // OData metadata endpoint
  if (path === '/$metadata') {
    const metadata = generateMetadata(model, 'https://api.example.com/odata');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'OData-Version': '4.01' },
      body: JSON.stringify(metadata)
    };
  }

  // Service document
  if (path === '/') {
    const serviceDoc = generateServiceDocument(model, 'https://api.example.com/odata');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'OData-Version': '4.01' },
      body: JSON.stringify(serviceDoc)
    };
  }

  // Users endpoint
  if (path === '/Users') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: users })
    };
  }

  // Not found
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: { code: 'NotFound', message: 'Not found' } })
  };
};