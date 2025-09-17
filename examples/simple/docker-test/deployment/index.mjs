import { odata } from "middy-odata-v4";
import middy from "@middy/core";
// Simple User data
const users = [
    { id: 1, name: "Alice", email: "alice@example.com", age: 30, active: true },
    { id: 2, name: "Bob", email: "bob@example.com", age: 24, active: false },
    { id: 3, name: "Charlie", email: "charlie@example.com", age: 35, active: true }
];
// Simple OData model
const model = {
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
// Clean handler - the middleware handles all OData logic
const baseHandler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    console.log('Query parameters:', event.queryStringParameters);
    console.log('Raw query string:', event.rawQueryString);
    console.log('Request context:', event.requestContext);
    // Debug: Test URLSearchParams parsing
    if (event.rawQueryString) {
        const parsedFromRaw = Object.fromEntries(new URLSearchParams(event.rawQueryString));
        console.log('Parsed from rawQueryString:', parsedFromRaw);
    }
    // Extract the path to determine which entity set to return
    // Lambda URLs use rawPath, API Gateway uses path
    const path = event.rawPath || event.path || '/';
    console.log('Extracted path:', path);
    // Return the appropriate data - middleware will handle filtering, sorting, etc.
    if (path.startsWith('/Users')) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: users })
        };
    }
    // For other paths, return empty - middleware will handle metadata, etc.
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    };
};
// Configure the OData middleware - it handles all the complex logic
export const handler = middy(baseHandler).use(odata({
    model,
    serviceRoot: "https://api.example.com/odata",
    enable: {
        metadata: true,
        conformance: true,
        filter: true,
        pagination: true,
        shape: true,
        serialize: true
    }
}));
