import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { EdmModel, odata } from "middy-odata-v4";
import middy from "@middy/core";

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

// Base handler - now much simpler!
const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
  // Debug logging
  console.log('Base handler called with path:', event.path);
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));
  
  // The routing middleware will handle everything automatically
  // This handler is only called if no route matches
  // Return a 444 response to verify Middy is working
  return {
    statusCode: 444,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'No route matched - Middy is working' })
  };
};

// Configure the OData middleware with automatic routing and data providers
export const handler = middy(baseHandler).use(odata({
  model,
  serviceRoot: "https://api.example.com/odata",
  routing: {
    dataProviders: {
      // Automatically provide data for the Users entity set
      Users: () => users
    },
    enableRouting: true,
    strictMode: false
  },
  enable: {
    metadata: false,
    conformance: false,
    filter: false,
    pagination: false,
    shape: false,
    serialize: false
  }
}));