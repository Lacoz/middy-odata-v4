export const PRODUCTS = [
  { id: 1, name: "A", price: 10.5, categoryId: 1 },
  { id: 2, name: "B", price: 7.0, categoryId: 2 },
  { id: 3, name: "C", price: 12.0, categoryId: 1 },
];

export const CATEGORIES = [
  { id: 1, title: "Cat1" },
  { id: 2, title: "Cat2" },
];

export const USERS = [
  { 
    id: 1, 
    name: "John Doe", 
    email: "john@example.com",
    address: {
      street: "123 Main St",
      city: "New York",
      zipCode: "10001"
    },
    tags: ["admin", "user"]
  },
  { 
    id: 2, 
    name: "Jane Smith", 
    email: "jane@example.com",
    address: {
      street: "456 Oak Ave",
      city: "Los Angeles",
      zipCode: "90210"
    },
    tags: ["user"]
  }
];

export const SUPPLIERS = [
  { id: 1, name: "TechCorp", address: { city: "San Francisco" } },
  { id: 2, name: "GadgetInc", address: { city: "Seattle" } }
];
