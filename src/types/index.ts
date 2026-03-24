// ============================================================
// Lattuga Orgânicos — TypeScript Types
// ============================================================

export interface Product {
    id: string;
    internal_code: string;
    supplier_code: string | null;
    name: string;
    description: string | null;
    price: number;
    cost_price: number;
    image_url: string | null;
    category: string;
    stock_qty: number;
    is_active: boolean;
    show_in_catalog: boolean;
    feature_badge: 'none' | 'highlight' | 'offer';
    created_at: string;
    updated_at: string;
    // Joined
    purchases?: ProductPurchase[];
}

export interface ProductPurchase {
    id: string;
    product_id: string;
    supplier: string;
    quantity: number;
    unit_cost: number;
    created_at: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    created_at: string;
}

export type OrderType = 'pdv' | 'online';
export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type DeliveryMethod = 'pickup' | 'delivery';
export type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash';

export interface Order {
    id: string;
    customer_id: string | null;
    type: OrderType;
    status: OrderStatus;
    delivery_method: DeliveryMethod | null;
    payment_method: string | null;
    total_amount: number;
    discount_amount: number;
    surcharge_amount: number;
    delivery_address: string | null;
    created_at: string;
    // Joined
    customer?: Customer;
    items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    // Joined
    product?: Product;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export type DiscountType = 'value' | 'percentage';

export interface CheckoutData {
    discountType: DiscountType;
    discountValue: number;
    surcharge: number;
    paymentMethod: PaymentMethod;
}

export interface CustomerFormData {
    name: string;
    phone: string;
    address: string;
    email: string;
}

export interface OnlineCheckoutData {
    customer: CustomerFormData;
    deliveryMethod: DeliveryMethod;
    paymentMethod: PaymentMethod;
    payNow: boolean;
}

// ============================================================
// Finance Types
// ============================================================

export type TransactionType = 'revenue' | 'expense';
export type ExpenseStatus = 'paid' | 'pending';

export interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    supplier: string | null;
    due_date: string; // YYYY-MM-DD
    payment_date: string | null; // YYYY-MM-DD
    payment_method: string | null;
    proof_url: string | null;
    status: ExpenseStatus;
    created_at: string;
}

export interface FinancialTransaction {
    id: string;
    type: TransactionType;
    date: string; // created_at for Order, due_date for Expense
    description: string;
    amount: number;
    category: string;
    status: string; // 'completed' | 'paid' | 'pending'
    original: Order | Expense; // Reference to original object
}
