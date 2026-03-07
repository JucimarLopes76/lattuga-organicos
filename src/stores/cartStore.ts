import { create } from 'zustand';
import type { CartItem, Product, DiscountType, PaymentMethod } from '@/types';

interface CartState {
    items: CartItem[];
    discountType: DiscountType;
    discountValue: number;
    surcharge: number;
    paymentMethod: PaymentMethod;

    addItem: (product: Product) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    setDiscountType: (type: DiscountType) => void;
    setDiscountValue: (value: number) => void;
    setSurcharge: (value: number) => void;
    setPaymentMethod: (method: PaymentMethod) => void;
    getSubtotal: () => number;
    getDiscountAmount: () => number;
    getTotal: () => number;
    reset: () => void;
}

const initialState = {
    items: [] as CartItem[],
    discountType: 'value' as DiscountType,
    discountValue: 0,
    surcharge: 0,
    paymentMethod: 'pix' as PaymentMethod,
};

export const useCartStore = create<CartState>((set, get) => ({
    ...initialState,

    addItem: (product: Product) => {
        set((state) => {
            const existing = state.items.find((i) => i.product.id === product.id);
            if (existing) {
                return {
                    items: state.items.map((i) =>
                        i.product.id === product.id
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    ),
                };
            }
            return { items: [...state.items, { product, quantity: 1 }] };
        });
    },

    removeItem: (productId: string) => {
        set((state) => ({
            items: state.items.filter((i) => i.product.id !== productId),
        }));
    },

    updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
            get().removeItem(productId);
            return;
        }
        set((state) => ({
            items: state.items.map((i) =>
                i.product.id === productId ? { ...i, quantity } : i
            ),
        }));
    },

    setDiscountType: (type: DiscountType) => set({ discountType: type }),
    setDiscountValue: (value: number) => set({ discountValue: value }),
    setSurcharge: (value: number) => set({ surcharge: value }),
    setPaymentMethod: (method: PaymentMethod) => set({ paymentMethod: method }),

    getSubtotal: () => {
        return get().items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
        );
    },

    getDiscountAmount: () => {
        const { discountType, discountValue } = get();
        const subtotal = get().getSubtotal();
        if (discountType === 'percentage') {
            return (subtotal * discountValue) / 100;
        }
        return discountValue;
    },

    getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        const { surcharge } = get();
        return Math.max(0, subtotal - discount + surcharge);
    },

    reset: () => set({ ...initialState }),
}));
