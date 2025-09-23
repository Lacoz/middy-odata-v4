import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, "..", "data", "catalog.db");

mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

const createStatements = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  inventory INTEGER NOT NULL DEFAULT 0,
  releaseDate TEXT NOT NULL,
  categoryId INTEGER NOT NULL,
  discontinued INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);
`;

db.exec(createStatements);

db.exec("DELETE FROM products;");
db.exec("DELETE FROM categories;");

const insertCategory = db.prepare(
  "INSERT INTO categories (id, name, description) VALUES (@id, @name, @description)"
);
const insertProduct = db.prepare(`
  INSERT INTO products (id, sku, name, price, inventory, releaseDate, categoryId, discontinued)
  VALUES (@id, @sku, @name, @price, @inventory, @releaseDate, @categoryId, @discontinued)
`);

const categories = [
  { id: 1, name: "Laptops", description: "Portable computers for work and play" },
  { id: 2, name: "Monitors", description: "High-resolution external displays" },
  { id: 3, name: "Accessories", description: "Keyboards, mice and peripherals" }
];

const products = [
  {
    id: 1,
    sku: "LPT-13-PRO",
    name: "AetherBook Pro 13",
    price: 1699,
    inventory: 24,
    releaseDate: "2023-03-15T10:00:00.000Z",
    categoryId: 1,
    discontinued: 0
  },
  {
    id: 2,
    sku: "LPT-15-AIR",
    name: "AetherBook Air 15",
    price: 1299,
    inventory: 41,
    releaseDate: "2024-01-08T09:00:00.000Z",
    categoryId: 1,
    discontinued: 0
  },
  {
    id: 3,
    sku: "MON-27-4K",
    name: "NebulaView 27\" 4K Monitor",
    price: 549,
    inventory: 60,
    releaseDate: "2022-11-20T12:00:00.000Z",
    categoryId: 2,
    discontinued: 0
  },
  {
    id: 4,
    sku: "ACC-MSE-ELITE",
    name: "QuantumMouse Elite",
    price: 99,
    inventory: 120,
    releaseDate: "2021-08-05T15:30:00.000Z",
    categoryId: 3,
    discontinued: 0
  },
  {
    id: 5,
    sku: "ACC-KB-MECH",
    name: "AuroraKey Mechanical Keyboard",
    price: 149,
    inventory: 75,
    releaseDate: "2020-05-18T08:00:00.000Z",
    categoryId: 3,
    discontinued: 1
  }
];

db.transaction(() => {
  for (const category of categories) {
    insertCategory.run(category);
  }
  for (const product of products) {
    insertProduct.run(product);
  }
})();

db.close();

console.log(`SQLite database created at ${dbPath}`);
