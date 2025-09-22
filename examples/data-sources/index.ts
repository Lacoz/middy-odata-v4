import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import middy from "@middy/core";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";
import {
  odata,
  type EdmModel,
  type ODataMiddlewareContext,
  type ODataQueryOptions,
} from "middy-odata-v4";

interface User {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  completed: boolean;
  ownerId: number;
}

interface RemoteProduct {
  ID: number;
  Name: string;
  Description?: string;
  ReleaseDate?: string;
  DiscontinuedDate?: string | null;
  Rating?: number;
  Price?: number;
}

const USERS_TABLE = process.env.USERS_TABLE ?? "";
const TASK_SERVICE_URL =
  process.env.TASK_SERVICE_URL ?? "https://jsonplaceholder.typicode.com/todos";
const ODATA_SERVICE_URL =
  (process.env.ODATA_SERVICE_URL ?? "https://services.odata.org/V4/OData/OData.svc").replace(/\/$/, "");

const dynamoClient = USERS_TABLE
  ? DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" }),
    )
  : null;

const FALLBACK_USERS: User[] = [
  {
    id: "U-100",
    email: "sophia@example.com",
    displayName: "Sophia Rivera",
    isActive: true,
    createdAt: "2024-01-01T12:00:00Z",
  },
  {
    id: "U-101",
    email: "amir@example.com",
    displayName: "Amir Hassan",
    isActive: false,
    createdAt: "2024-02-10T08:30:00Z",
  },
  {
    id: "U-102",
    email: "mina@example.com",
    displayName: "Mina Patel",
    isActive: true,
    createdAt: "2024-03-05T17:45:00Z",
  },
];

const FALLBACK_TASKS: Task[] = [
  { id: 1, title: "Prepare onboarding email", completed: true, ownerId: 101 },
  { id: 2, title: "Verify billing records", completed: false, ownerId: 102 },
  { id: 3, title: "Schedule quarterly sync", completed: false, ownerId: 100 },
];

const FALLBACK_REMOTE_PRODUCTS: RemoteProduct[] = [
  {
    ID: 1,
    Name: "Breadboard",
    Description: "Prototyping board",
    ReleaseDate: "2023-05-01T00:00:00Z",
    Rating: 4.5,
    Price: 12.5,
  },
  {
    ID: 2,
    Name: "Raspberry Pi",
    Description: "Single-board computer",
    ReleaseDate: "2022-11-15T00:00:00Z",
    Rating: 4.8,
    Price: 45,
  },
];

const model: EdmModel = {
  namespace: "DataSources",
  entityTypes: [
    {
      name: "User",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.String", nullable: false },
        { name: "email", type: "Edm.String", nullable: false },
        { name: "displayName", type: "Edm.String", nullable: false },
        { name: "isActive", type: "Edm.Boolean", nullable: false },
        { name: "createdAt", type: "Edm.DateTimeOffset", nullable: false },
      ],
    },
    {
      name: "Task",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32", nullable: false },
        { name: "title", type: "Edm.String", nullable: false },
        { name: "completed", type: "Edm.Boolean", nullable: false },
        { name: "ownerId", type: "Edm.Int32", nullable: false },
      ],
    },
    {
      name: "RemoteProduct",
      key: ["ID"],
      properties: [
        { name: "ID", type: "Edm.Int32", nullable: false },
        { name: "Name", type: "Edm.String", nullable: false },
        { name: "Description", type: "Edm.String" },
        { name: "ReleaseDate", type: "Edm.DateTimeOffset" },
        { name: "DiscontinuedDate", type: "Edm.DateTimeOffset" },
        { name: "Rating", type: "Edm.Double" },
        { name: "Price", type: "Edm.Double" },
      ],
    },
  ],
  entitySets: [
    { name: "Users", entityType: "User" },
    { name: "Tasks", entityType: "Task" },
    { name: "RemoteProducts", entityType: "RemoteProduct" },
  ],
};

const baseHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "The OData middleware handled this request upstream.",
    path: event.rawPath,
  }),
});

export const handler = middy(baseHandler).use(
  odata({
    model,
    serviceRoot: "https://api.example.com/odata", // Replace with your actual API Gateway URL
    routing: {
      enableRouting: true,
      dataProviders: {
        Users: (context) => loadUsersFromDynamo(context),
        Tasks: () => loadTasksFromHttp(),
        RemoteProducts: (context) => loadRemoteProductsFromOData(context),
      },
    },
    enable: {
      metadata: false,
      conformance: true,
    },
  }),
);

async function loadUsersFromDynamo(
  context: ODataMiddlewareContext,
): Promise<User[]> {
  if (!dynamoClient || !USERS_TABLE) {
    return FALLBACK_USERS;
  }

  const params: ScanCommandInput = { TableName: USERS_TABLE };
  applyDynamoFilter(params, context.options);

  if (typeof context.options.top === "number") {
    const total =
      typeof context.options.skip === "number"
        ? context.options.top + context.options.skip
        : context.options.top;
    if (total > 0) {
      params.Limit = total;
    }
  }

  try {
    const result = await dynamoClient.send(new ScanCommand(params));
    let items = (result.Items ?? []) as User[];

    if (typeof context.options.skip === "number" && context.options.skip > 0) {
      items = items.slice(context.options.skip);
    }
    if (typeof context.options.top === "number") {
      items = items.slice(0, context.options.top);
    }

    return items.length > 0 ? items : FALLBACK_USERS;
  } catch (error) {
    console.warn("[Users] DynamoDB scan failed, falling back to fixture data", error);
    return FALLBACK_USERS;
  }
}

async function loadTasksFromHttp(): Promise<Task[]> {
  try {
    const response = await fetch(TASK_SERVICE_URL);
    if (!response.ok) {
      throw new Error(`Task service responded with ${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      id: number;
      title: string;
      completed: boolean;
      userId: number;
    }>;

    return payload.map((item) => ({
      id: item.id,
      title: item.title,
      completed: item.completed,
      ownerId: item.userId,
    }));
  } catch (error) {
    console.warn("[Tasks] HTTP service unavailable, falling back to fixtures", error);
    return FALLBACK_TASKS;
  }
}

async function loadRemoteProductsFromOData(
  context: ODataMiddlewareContext,
): Promise<RemoteProduct[]> {
  const query = buildUpstreamQuery(context.options);
  const url = `${ODATA_SERVICE_URL}/Products${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Upstream OData service responded with ${response.status}`);
    }

    const payload = (await response.json()) as
      | { value?: RemoteProduct[] }
      | RemoteProduct[];

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload.value && Array.isArray(payload.value)) {
      return payload.value;
    }

    return FALLBACK_REMOTE_PRODUCTS;
  } catch (error) {
    console.warn(
      "[RemoteProducts] Upstream OData call failed, using fixture payload",
      error,
    );
    return FALLBACK_REMOTE_PRODUCTS;
  }
}

function applyDynamoFilter(
  params: ScanCommandInput,
  options: ODataQueryOptions,
): void {
  const filter = options.filter;
  if (!filter) return;

  const eqMatch = /^\s*([A-Za-z0-9_]+)\s+eq\s+(.+)\s*$/.exec(filter);
  if (!eqMatch) return;

  const [, property, rawValue] = eqMatch;
  const parsedValue = parsePrimitive(rawValue);
  if (parsedValue === undefined) {
    return;
  }

  params.FilterExpression = "#field = :value";
  params.ExpressionAttributeNames = { "#field": property };
  params.ExpressionAttributeValues = { ":value": parsedValue };
}

function parsePrimitive(value: string): string | number | boolean | null | undefined {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed === "null") {
    return null;
  }
  if (trimmed === "true" || trimmed === "false") {
    return trimmed === "true";
  }
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }
  return undefined;
}

function buildUpstreamQuery(options: ODataQueryOptions): string {
  const params = new URLSearchParams();

  if (options.select?.length) {
    params.set("$select", options.select.join(","));
  }
  if (options.filter) {
    params.set("$filter", options.filter);
  }
  if (options.orderby?.length) {
    const parts = options.orderby.map((term) =>
      term.direction ? `${term.property} ${term.direction}` : term.property,
    );
    params.set("$orderby", parts.join(","));
  }
  if (typeof options.top === "number") {
    params.set("$top", options.top.toString());
  }
  if (typeof options.skip === "number") {
    params.set("$skip", options.skip.toString());
  }
  if (typeof options.count === "boolean") {
    params.set("$count", String(options.count));
  }
  if (options.search) {
    params.set("$search", options.search);
  }
  if (options.compute) {
    const compute = Array.isArray(options.compute)
      ? options.compute.join(",")
      : options.compute;
    if (compute) {
      params.set("$compute", compute);
    }
  }
  if (options.apply) {
    const apply = Array.isArray(options.apply)
      ? options.apply.join(",")
      : options.apply;
    if (apply) {
      params.set("$apply", apply);
    }
  }

  return params.toString();
}
