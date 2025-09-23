import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import middy from "@middy/core";
import { odata, EdmModel } from "middy-odata-v4";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME ?? "ODataUsers";
const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;

const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  ...(DYNAMODB_ENDPOINT ? { endpoint: DYNAMODB_ENDPOINT } : {}),
});

const documentClient = DynamoDBDocumentClient.from(dynamoClient);

export interface UserEntity {
  id: string;
  displayName: string;
  email: string;
  joinDate: string;
  isActive: boolean;
  tags?: string[];
}

const model: EdmModel = {
  namespace: "DynamoUsers",
  entityTypes: [
    {
      name: "User",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.String", nullable: false },
        { name: "displayName", type: "Edm.String", nullable: false },
        { name: "email", type: "Edm.String", nullable: false },
        { name: "joinDate", type: "Edm.DateTimeOffset", nullable: false },
        { name: "isActive", type: "Edm.Boolean", nullable: false },
        { name: "tags", type: "Collection(Edm.String)" }
      ],
      annotations: {
        "@Org.OData.Capabilities.V1.FilterFunctions": ["contains", "startswith", "endswith"],
        "@Org.OData.Capabilities.V1.TopSupported": true,
        "@Org.OData.Capabilities.V1.SkipSupported": true
      }
    }
  ],
  entitySets: [
    {
      name: "Users",
      entityType: "User",
      annotations: {
        "@Org.OData.Capabilities.V1.NavigationRestrictions": { FilterFunctions: ["contains"] }
      }
    }
  ]
};

const baseHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 501,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "No explicit route matched the request. The OData middleware should have produced the response.",
      path: event.path
    })
  };
};

export const handler = middy(baseHandler).use(odata({
  model,
  serviceRoot: "https://api.example.com/odata/dynamodb",
  routing: {
    enableRouting: true,
    strictMode: true,
    dataProviders: {
      Users: async (): Promise<UserEntity[]> => {
        const result = await documentClient.send(new ScanCommand({ TableName: TABLE_NAME, Limit: 500 }));
        const items = result.Items ?? [];
        return items.map(item => ({
          id: String(item.id),
          displayName: String(item.displayName ?? item.name ?? ""),
          email: String(item.email ?? ""),
          joinDate: String(item.joinDate ?? new Date().toISOString()),
          isActive: Boolean(item.isActive ?? false),
          tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag)) : undefined
        }));
      }
    }
  },
  enable: {
    metadata: true,
    conformance: true,
    filter: true,
    pagination: true,
    shape: true,
    serialize: true
  },
  pagination: {
    maxTop: 50
  }
}));
