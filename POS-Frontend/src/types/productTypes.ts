export interface Category {
    _id: string;
    name: string;
}

export interface Product {
    _id: string;
    stockId:string;
    isActive:boolean;
    barcode: string;
    name: string;
    price: number;
    totalQuantity: number;
    costPrice: number;
    category: Category;
    imageUrl: string;
}

export interface StockItem {
    _id: string;
    barcode: string;
    totalQuantity:number;
    salePrice:number;
    costPrice:number;
    status: string;
    supplier: string;
    productId: Product;
    isActive:string;
    threshold?: number;
    name: string;
    imageUrl: string;
    updatedAt: string;
    location: string;
    category: string;
   
}

export interface PaymentItem {
    barcode: string;
    name: string;
    price: number;
    totalQuantity: number;
    subtotal: number;
}

export interface PaymentData {
    saleId: string;
    employeeName: string;
    paymentMethod: "เงินสด" | "โอนเงิน" | "บัตรเครดิต" | "QR Code";
    amount: number;
    amountReceived: number;
    change: number;
    items: PaymentItem[];
}
