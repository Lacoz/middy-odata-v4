import middy from "@middy/core";
import { odata, generateMetadata, generateServiceDocument } from "middy-odata-v4";
// Mock data
const users = [
    { id: 1, name: "Alice", email: "alice@example.com", age: 30, active: true },
    { id: 2, name: "Bob", email: "bob@example.com", age: 24, active: false },
    { id: 3, name: "Charlie", email: "charlie@example.com", age: 35, active: true }
];
// Simple EDM model
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
// Main Lambda handler
export const handler = async (event) => {
    const path = event.path;
    const method = event.httpMethod;
    // Handle CORS
    if (method === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' },
            body: ''
        };
    }
    try {
        // Route requests
        if (path === '/$metadata') {
            const metadata = generateMetadata(model, 'https://api.example.com/odata');
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'OData-Version': '4.01' },
                body: JSON.stringify(metadata)
            };
        }
        if (path === '/') {
            const serviceDoc = generateServiceDocument(model, 'https://api.example.com/odata');
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'OData-Version': '4.01' },
                body: JSON.stringify(serviceDoc)
            };
        }
        if (path === '/Users') {
            if (method === 'GET') {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: users })
                };
            }
        }
        return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { code: 'NotFound', message: 'Not found' } })
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { code: 'InternalServerError', message: 'Server error' } })
        };
    }
};
// Apply OData middleware
export const odataHandler = middy(handler).use(odata({
    model,
    serviceRoot: 'https://api.example.com/odata',
    enable: { metadata: true, conformance: true },
    defaults: { maxTop: 100 }
}));
