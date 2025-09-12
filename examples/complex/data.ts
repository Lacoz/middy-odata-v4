export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  supplierId: number;
  inStock: boolean;
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  parentCategoryId?: number;
}

export interface Supplier {
  id: number;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  active: boolean;
}

export interface Order {
  id: number;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  orderDate: string;
  shippedDate?: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Sample data
export const categories: Category[] = [
  { id: 1, name: "Electronics", description: "Electronic devices and accessories" },
  { id: 2, name: "Computers", description: "Computers and laptops", parentCategoryId: 1 },
  { id: 3, name: "Accessories", description: "Computer accessories", parentCategoryId: 1 },
  { id: 4, name: "Books", description: "Books and literature" },
  { id: 5, name: "Fiction", description: "Fiction books", parentCategoryId: 4 },
];

export const suppliers: Supplier[] = [
  { id: 1, name: "TechCorp", contactEmail: "orders@techcorp.com", contactPhone: "+1-555-0101", address: "123 Tech St, Silicon Valley, CA", active: true },
  { id: 2, name: "BookWorld", contactEmail: "orders@bookworld.com", contactPhone: "+1-555-0102", address: "456 Book Ave, New York, NY", active: true },
  { id: 3, name: "OldSupplier", contactEmail: "orders@oldsupplier.com", contactPhone: "+1-555-0103", address: "789 Old St, Chicago, IL", active: false },
];

export const products: Product[] = [
  { id: 1, name: "MacBook Pro", description: "Apple MacBook Pro 16-inch", price: 2499.99, categoryId: 2, supplierId: 1, inStock: true, stockQuantity: 10, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: 2, name: "Wireless Mouse", description: "Bluetooth wireless mouse", price: 49.99, categoryId: 3, supplierId: 1, inStock: true, stockQuantity: 50, createdAt: "2024-01-02T00:00:00Z", updatedAt: "2024-01-02T00:00:00Z" },
  { id: 3, name: "JavaScript Guide", description: "Complete guide to JavaScript", price: 29.99, categoryId: 5, supplierId: 2, inStock: true, stockQuantity: 25, createdAt: "2024-01-03T00:00:00Z", updatedAt: "2024-01-03T00:00:00Z" },
  { id: 4, name: "Gaming Keyboard", description: "Mechanical gaming keyboard", price: 129.99, categoryId: 3, supplierId: 1, inStock: false, stockQuantity: 0, createdAt: "2024-01-04T00:00:00Z", updatedAt: "2024-01-04T00:00:00Z" },
  { id: 5, name: "TypeScript Handbook", description: "Official TypeScript handbook", price: 39.99, categoryId: 5, supplierId: 2, inStock: true, stockQuantity: 15, createdAt: "2024-01-05T00:00:00Z", updatedAt: "2024-01-05T00:00:00Z" },
];

export const orders: Order[] = [
  { id: 1, customerName: "John Doe", customerEmail: "john@example.com", totalAmount: 2549.98, status: "shipped", orderDate: "2024-01-10T10:00:00Z", shippedDate: "2024-01-11T14:30:00Z" },
  { id: 2, customerName: "Jane Smith", customerEmail: "jane@example.com", totalAmount: 69.98, status: "processing", orderDate: "2024-01-12T15:30:00Z" },
  { id: 3, customerName: "Bob Johnson", customerEmail: "bob@example.com", totalAmount: 39.99, status: "delivered", orderDate: "2024-01-08T09:15:00Z", shippedDate: "2024-01-09T11:00:00Z" },
];

export const orderItems: OrderItem[] = [
  { id: 1, orderId: 1, productId: 1, quantity: 1, unitPrice: 2499.99, totalPrice: 2499.99 },
  { id: 2, orderId: 1, productId: 2, quantity: 1, unitPrice: 49.99, totalPrice: 49.99 },
  { id: 3, orderId: 2, productId: 2, quantity: 1, unitPrice: 49.99, totalPrice: 49.99 },
  { id: 4, orderId: 2, productId: 3, quantity: 1, unitPrice: 29.99, totalPrice: 29.99 },
  { id: 5, orderId: 3, productId: 5, quantity: 1, unitPrice: 39.99, totalPrice: 39.99 },
];
