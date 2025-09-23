import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import middy from "@middy/core";
import { odata, EdmModel } from "middy-odata-v4";

const TRIPPIN_ROOT = process.env.TRIPPIN_ROOT ?? "https://services.odata.org/V4/TripPinServiceRW/";
const JSON_PLACEHOLDER_ROOT = process.env.JSON_PLACEHOLDER_ROOT ?? "https://jsonplaceholder.typicode.com";
const SERVICE_ROOT = process.env.SERVICE_ROOT ?? "https://api.example.com/odata/http";

export interface TripPinPerson {
  userName: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
  emails?: string[];
  city?: string | null;
  country?: string | null;
}

export interface TodoEntity {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

const model: EdmModel = {
  namespace: "HttpBridge",
  entityTypes: [
    {
      name: "TripPinPerson",
      key: ["userName"],
      properties: [
        { name: "userName", type: "Edm.String", nullable: false },
        { name: "firstName", type: "Edm.String", nullable: false },
        { name: "lastName", type: "Edm.String", nullable: false },
        { name: "gender", type: "Edm.String" },
        { name: "emails", type: "Collection(Edm.String)" },
        { name: "city", type: "Edm.String" },
        { name: "country", type: "Edm.String" }
      ],
      annotations: {
        "@Org.OData.Capabilities.V1.TopSupported": true,
        "@Org.OData.Capabilities.V1.SkipSupported": true,
        "@Org.OData.Capabilities.V1.FilterFunctions": ["contains", "startswith"],
        "@Org.OData.Capabilities.V1.CountRestrictions": { Countable: true }
      }
    },
    {
      name: "Todo",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32", nullable: false },
        { name: "title", type: "Edm.String", nullable: false },
        { name: "completed", type: "Edm.Boolean", nullable: false },
        { name: "userId", type: "Edm.Int32", nullable: false }
      ],
      annotations: {
        "@Org.OData.Capabilities.V1.TopSupported": true,
        "@Org.OData.Capabilities.V1.SkipSupported": true,
        "@Org.OData.Capabilities.V1.FilterFunctions": ["eq", "ne"],
        "@Org.OData.Capabilities.V1.CountRestrictions": { Countable: true }
      }
    }
  ],
  entitySets: [
    {
      name: "People",
      entityType: "TripPinPerson",
      title: "TripPin People"
    },
    {
      name: "Todos",
      entityType: "Todo",
      title: "JSONPlaceholder Todos"
    }
  ]
};

const baseHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 501,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "The OData middleware handled this request.",
      path: event.path
    })
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available. Use Node.js 18+ or polyfill it in your runtime.");
  }
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function normalizeTripPinPerson(raw: any): TripPinPerson {
  const address = Array.isArray(raw.AddressInfo) ? raw.AddressInfo[0] : undefined;
  const city = address?.City?.Name ?? null;
  const country = address?.City?.CountryRegion ?? null;

  return {
    userName: String(raw.UserName ?? ""),
    firstName: String(raw.FirstName ?? ""),
    lastName: String(raw.LastName ?? ""),
    gender: raw.Gender ?? null,
    emails: Array.isArray(raw.Emails) ? raw.Emails.map((email: unknown) => String(email)) : undefined,
    city,
    country
  };
}

function normalizeTodo(raw: any): TodoEntity {
  return {
    id: Number(raw.id ?? 0),
    title: String(raw.title ?? ""),
    completed: Boolean(raw.completed),
    userId: Number(raw.userId ?? 0)
  };
}

export const handler = middy(baseHandler).use(odata({
  model,
  serviceRoot: SERVICE_ROOT,
  routing: {
    enableRouting: true,
    strictMode: false,
    dataProviders: {
      People: async (): Promise<TripPinPerson[]> => {
        const payload = await fetchJson<{ value: any[] }>(`${TRIPPIN_ROOT}People?$top=40&$select=UserName,FirstName,LastName,Gender,Emails,AddressInfo`);
        const people = Array.isArray(payload.value) ? payload.value : [];
        return people.map(normalizeTripPinPerson);
      },
      Todos: async (): Promise<TodoEntity[]> => {
        const payload = await fetchJson<any[]>(`${JSON_PLACEHOLDER_ROOT}/todos?_limit=40`);
        return payload.map(normalizeTodo);
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
    maxTop: 20
  }
}));
