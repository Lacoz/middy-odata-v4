import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import middy from "@middy/core";
import Database from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { odata, EdmModel } from "middy-odata-v4";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SQLITE_PATH = process.env.SQLITE_PATH ?? resolve(__dirname, "data", "catalog.db");
const SERVICE_ROOT = process.env.SERVICE_ROOT ?? "https://api.example.com/odata/sqlite";

function createConnection() {
  return new Database(SQLITE_PATH, { readonly: true });
}

type Connection = ReturnType<typeof createConnection>;

let connection: Connection | undefined;

function getConnection(): Connection {
  if (!connection) {
    connection = createConnection();
  }
  return connection;
}

export interface ProductEntity {
  id: number;
  sku: string;
  name: string;
  price: number;
  inventory: number;
  releaseDate: string;
  categoryId: number;
  discontinued: boolean;
}

export interface CategoryEntity {
  id: number;
  name: string;
  description?: string | null;
}

const model: EdmModel = {
  namespace: "SqliteCatalog",
  entityTypes: [
    {
      name: "Product",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32", nullable: false },
        { name: "sku", type: "Edm.String", nullable: false },
        { name: "name", type: "Edm.String", nullable: false },
        { name: "price", type: "Edm.Decimal", nullable: false },
        { name: "inventory", type: "Edm.Int32", nullable: false },
        { name: "releaseDate", type: "Edm.DateTimeOffset", nullable: false },
        { name: "categoryId", type: "Edm.Int32", nullable: false },
        { name: "discontinued", type: "Edm.Boolean", nullable: false }
      ],
      navigation: [
        {
          name: "Category",
          target: "Category",
          annotations: {
            "@Org.OData.Capabilities.V1.FilterFunctions": ["contains"],
            "@Org.OData.Capabilities.V1.NavigationType": "Single"
          }
        }
      ],
      annotations: {
        "@Org.OData.Capabilities.V1.TopSupported": true,
        "@Org.OData.Capabilities.V1.SkipSupported": true,
        "@Org.OData.Capabilities.V1.FilterFunctions": ["contains", "startswith", "endswith"],
        "@Org.OData.Capabilities.V1.CountRestrictions": { Countable: true }
      }
    },
    {
      name: "Category",
      key: ["id"],
      properties: [
        { name: "id", type: "Edm.Int32", nullable: false },
        { name: "name", type: "Edm.String", nullable: false },
        { name: "description", type: "Edm.String" }
      ],
      navigation: [
        {
          name: "Products",
          target: "Product",
          collection: true
        }
      ]
    }
  ],
  entitySets: [
    {
      name: "Products",
      entityType: "Product",
      navigationBindings: [{ path: "Category", target: "Categories" }]
    },
    {
      name: "Categories",
      entityType: "Category",
      navigationBindings: [{ path: "Products", target: "Products" }]
    }
  ]
};

const baseHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 501,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "The OData middleware handles routing for this example.",
      path: event.path
    })
  };
};

function loadProducts(): ProductEntity[] {
  const db = getConnection();
  const rows = db.prepare<ProductEntity>(`
    SELECT id, sku, name, price, inventory, releaseDate, categoryId, discontinued
    FROM products
  `).all();
  return rows.map(row => ({
    ...row,
    discontinued: Boolean(row.discontinued)
  }));
}

function loadCategories(): CategoryEntity[] {
  const db = getConnection();
  const rows = db.prepare<CategoryEntity>(`
    SELECT id, name, description
    FROM categories
  `).all();
  return rows;
}

export const handler = middy(baseHandler).use(odata({
  model,
  serviceRoot: SERVICE_ROOT,
  routing: {
    enableRouting: true,
    strictMode: true,
    dataProviders: {
      Products: async () => loadProducts(),
      Categories: async () => loadCategories()
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
    maxTop: 25
  }
}));
