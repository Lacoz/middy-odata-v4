export declare const PRODUCTS: {
    id: number;
    name: string;
    price: number;
    categoryId: number;
}[];
export declare const CATEGORIES: {
    id: number;
    title: string;
}[];
export declare const USERS: {
    id: number;
    name: string;
    email: string;
    address: {
        street: string;
        city: string;
        zipCode: string;
    };
    tags: string[];
}[];
export declare const SUPPLIERS: {
    id: number;
    name: string;
    address: {
        city: string;
    };
}[];
