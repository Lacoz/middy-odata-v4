import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import middy, { type MiddlewareObj } from "@middy/core";
import {
  type EdmModel,
  type ODataExpandItem,
  type ODataMiddlewareContext,
  type ODataQueryOptions,
  odata,
  odataError,
  odataParse,
} from "middy-odata-v4";

/**
 * DynamoDB integration -------------------------------------------------------
 */

interface DynamoUserRecord {
  pk: string;
  email: string;
  displayName: string;
  createdAt: string;
  status?: string;
}

const USERS_TABLE = process.env.USERS_TABLE ?? "UsersTable";

const dynamoModel: EdmModel = {
  namespace: "DynamoExample",
  entityTypes: [
    {
      name: "User",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.String", nullable: false },
        { name: "email", type: "Edm.String", nullable: false },
        { name: "displayName", type: "Edm.String" },
        { name: "status", type: "Edm.String" },
        { name: "createdAt", type: "Edm.DateTimeOffset" }
      ]
    }
  ],
  entitySets: [
    { name: "Users", entityType: "User" }
  ]
};

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const fallbackHandler = async (): Promise<APIGatewayProxyResultV2> => ({
  statusCode: 404,
  body: JSON.stringify({ message: "No entity set matched" })
});

export const dynamoUsersHandler = middy(fallbackHandler).use(odata({
  model: dynamoModel,
  serviceRoot: process.env.SERVICE_ROOT ?? "https://api.example.com/odata",
  routing: {
    enableRouting: true,
    dataProviders: {
      Users: async () => {
        const response = await documentClient.send(new ScanCommand({ TableName: USERS_TABLE }));
        const items = response.Items ?? [];
        return items.map(item => {
          const record = item as DynamoUserRecord;
          return {
            id: record.pk,
            email: record.email,
            displayName: record.displayName,
            status: record.status ?? "Active",
            createdAt: new Date(record.createdAt).toISOString()
          };
        });
      }
    }
  }
}));

/**
 * HTTP JSON integration ------------------------------------------------------
 */

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  category: string;
  inventory?: number;
}

const catalogModel: EdmModel = {
  namespace: "HttpCatalog",
  entityTypes: [
    {
      name: "Product",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.String", nullable: false },
        { name: "name", type: "Edm.String", nullable: false },
        { name: "price", type: "Edm.Decimal", nullable: false },
        { name: "category", type: "Edm.String" },
        { name: "inventory", type: "Edm.Int32" }
      ]
    }
  ],
  entitySets: [{ name: "Products", entityType: "Product" }]
};

const CATALOG_API = process.env.CATALOG_API ?? "https://example.com/catalog";

export const httpCatalogHandler = middy(fallbackHandler).use(odata({
  model: catalogModel,
  serviceRoot: process.env.CATALOG_SERVICE_ROOT ?? "https://api.example.com/catalog",
  routing: {
    enableRouting: true,
    dataProviders: {
      Products: async () => {
        const response = await fetch(`${CATALOG_API}/products`);
        if (!response.ok) {
          throw new Error(`Upstream catalog responded with ${response.status}`);
        }
        const payload = (await response.json()) as { items: CatalogItem[] };
        return payload.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          inventory: item.inventory ?? 0
        }));
      }
    }
  }
}));

/**
 * OData proxy integration ----------------------------------------------------
 */

type ODataProxyEvent = APIGatewayProxyEventV2 & {
  parsedOData?: ODataMiddlewareContext;
};

const exposeODataOptions: MiddlewareObj = {
  before: async (request) => {
    if (request.internal?.odata) {
      (request.event as ODataProxyEvent).parsedOData = request.internal.odata;
    }
  }
};

const UPSTREAM_ODATA = process.env.UPSTREAM_ODATA ?? "https://services.odata.org/V4/OData/OData.svc";

export const odataProxyHandler = middy<ODataProxyEvent, APIGatewayProxyResultV2>(async (event) => {
  const upstreamUrl = new URL(event.rawPath ?? "/", UPSTREAM_ODATA);
  const sanitizedQuery = serializeQueryOptions(event.parsedOData?.options);
  if (sanitizedQuery.length > 0) {
    upstreamUrl.search = `?${sanitizedQuery}`;
  }

  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    headers: { Accept: "application/json" },
    method: event.requestContext.http?.method ?? "GET"
  });

  const body = await upstreamResponse.text();

  return {
    statusCode: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
      "OData-Version": upstreamResponse.headers.get("odata-version") ?? "4.0"
    },
    body
  };
})
  .use(odataParse({ model: catalogModel, serviceRoot: UPSTREAM_ODATA }))
  .use(exposeODataOptions)
  .use(odataError());

/**
 * Helper utilities -----------------------------------------------------------
 */

function serializeQueryOptions(options?: ODataQueryOptions): string {
  if (!options) {
    return "";
  }

  const parts: string[] = [];
  const push = (key: string, value: string | number | boolean) => {
    parts.push(`${key}=${encodeURIComponent(String(value))}`);
  };

  if (options.select?.length) {
    push("$select", options.select.join(","));
  }
  if (options.filter) {
    push("$filter", options.filter);
  }
  if (options.orderby?.length) {
    const serializedOrderby = options.orderby.map(({ property, direction }) => `${property} ${direction}`).join(",");
    push("$orderby", serializedOrderby);
  }
  if (typeof options.top === "number") {
    push("$top", options.top);
  }
  if (typeof options.skip === "number") {
    push("$skip", options.skip);
  }
  if (typeof options.count === "boolean") {
    push("$count", options.count);
  }
  if (options.search) {
    push("$search", options.search);
  }
  if (options.compute) {
    const computeValue = Array.isArray(options.compute) ? options.compute.join(",") : options.compute;
    push("$compute", computeValue);
  }
  if (options.apply) {
    const applyValue = Array.isArray(options.apply) ? options.apply.join(",") : options.apply;
    push("$apply", applyValue);
  }
  if (options.parameterAliases) {
    for (const [alias, value] of Object.entries(options.parameterAliases)) {
      push(alias, value);
    }
  }
  if (options.expand?.length) {
    parts.push(`$expand=${options.expand.map(serializeExpand).join(",")}`);
  }

  return parts.join("&");
}

function serializeExpand(expand: ODataExpandItem): string {
  if (!expand.options) {
    return expand.path;
  }

  const nested = serializeQueryOptions(expand.options);
  if (!nested) {
    return expand.path;
  }

  return `${expand.path}(${nested.replace(/&/g, ";")})`;
}
