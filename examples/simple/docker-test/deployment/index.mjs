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
// Base handler - now much simpler!
const baseHandler = async (event) => {
    // The routing middleware will handle everything automatically
    // This handler is only called if no route matches
    return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Not found' })
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
        metadata: true,
        conformance: true,
        filter: true,
        pagination: true,
        shape: true,
        serialize: true
    }
}));
