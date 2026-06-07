
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

import type { Order, OrderItem, OrderStatus } from '@/types';
import { useProductsStore } from './productsStore';
import { useFinanceStore } from './financeStore';
import { sendOrderConfirmation } from '@/lib/evolutionApi';

// Helper to deduct stock
const decrementStock = async (items: { product_id: string; quantity: number }[]) => {
    try {
        await Promise.all(
            items.map(async (item) => {
                const { data: product } = await supabase
                    .from('products')
                    .select('stock_qty')
                    .eq('id', item.product_id)
                    .single();

                if (product) {
                    const newStock = Math.max(0, product.stock_qty - item.quantity);
                    await supabase
                        .from('products')
                        .update({ stock_qty: newStock })
                        .eq('id', item.product_id);
                }
            })
        );
        // Refresh products to reflect new stock in UI
        useProductsStore.getState().fetchProducts();
    } catch (err) {
        console.error('Error decrementing stock:', err);
    }
};

// Helper to restore stock on cancellation
const incrementStock = async (items: { product_id: string; quantity: number }[]) => {
    try {
        await Promise.all(
            items.map(async (item) => {
                const { data: product } = await supabase
                    .from('products')
                    .select('stock_qty')
                    .eq('id', item.product_id)
                    .single();

                if (product) {
                    const newStock = product.stock_qty + item.quantity;
                    await supabase
                        .from('products')
                        .update({ stock_qty: newStock })
                        .eq('id', item.product_id);
                }
            })
        );
        // Refresh products to reflect restored stock in UI
        useProductsStore.getState().fetchProducts();
    } catch (err) {
        console.error('Error incrementing stock:', err);
    }
};

export type OrderWithItems = Order & { items: (OrderItem & { product?: any })[] };

interface OrdersState {
    orders: OrderWithItems[];
    isLoading: boolean;

    /** Fetch all orders (with items) from Supabase */
    fetchOrders: () => Promise<void>;

    /** Insert a new order + items into Supabase and prepend to local state */
    addOrder: (
        orderData: Omit<Order, 'id' | 'created_at'>,
        items: { product_id: string; quantity: number; unit_price: number; productName?: string; productCategory?: string }[]
    ) => Promise<string | null>;

    /** Update order status in Supabase and local state */
    updateStatus: (orderId: string, status: Order['status']) => Promise<void>;

    /** Cancel an order, restore stock, and update finance */
    cancelOrder: (orderId: string) => Promise<void>;
    updateOrderFields: (orderId: string, fields: { payment_method?: string; status?: OrderStatus; notes?: string | null }) => Promise<void>;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    orders: [],
    isLoading: false,

    fetchOrders: async () => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*, products(id, name, price, category)), customers(*)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error fetching orders:', error);
                set({ isLoading: false });
                return;
            }

            // Map Supabase response shape to our type
            const orders: OrderWithItems[] = (data || []).map((row: any) => ({
                id: row.id,
                customer_id: row.customer_id,
                type: row.type,
                status: row.status,
                delivery_method: row.delivery_method,
                payment_method: row.payment_method,
                total_amount: Number(row.total_amount),
                discount_amount: Number(row.discount_amount),
                surcharge_amount: Number(row.surcharge_amount),
                delivery_address: row.delivery_address || null,
                created_at: row.created_at,
                customer: row.customers || null, // Map joined customer data
                items: (row.order_items || []).map((item: any) => ({
                    id: item.id,
                    order_id: item.order_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: Number(item.unit_price),
                    product: item.products || null,
                })),
            }));

            set({ orders, isLoading: false });
        } catch (err) {
            console.error('Error fetching orders:', err);
            set({ isLoading: false });
        }
    },

    addOrder: async (orderData, items) => {
        try {
            // 1. Insert order
            const { data: orderRow, error: orderErr } = await supabase
                .from('orders')
                .insert({
                    customer_id: orderData.customer_id || null,
                    type: orderData.type,
                    status: orderData.status,
                    delivery_method: orderData.delivery_method || null,
                    payment_method: orderData.payment_method,
                    total_amount: orderData.total_amount,
                    discount_amount: orderData.discount_amount,
                    surcharge_amount: orderData.surcharge_amount,
                    delivery_address: orderData.delivery_address || null,
                })
                .select()
                .single();

            if (orderErr || !orderRow) {
                console.error('Error inserting order:', orderErr);
                return null;
            }

            const orderId = orderRow.id;

            // 2. Insert order items
            const orderItems = items.map((item) => ({
                order_id: orderId,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
            }));

            const { data: itemRows, error: itemErr } = await supabase
                .from('order_items')
                .insert(orderItems)
                .select();

            if (itemErr) {
                console.error('Error inserting order items:', itemErr);
            }

            // 3. Update local state immediately
            const newOrder: OrderWithItems = {
                id: orderId,
                customer_id: orderData.customer_id || null,
                type: orderData.type,
                status: orderData.status,
                delivery_method: orderData.delivery_method || null,
                payment_method: orderData.payment_method,
                total_amount: orderData.total_amount,
                discount_amount: orderData.discount_amount,
                delivery_address: orderData.delivery_address || null,
                surcharge_amount: orderData.surcharge_amount,
                created_at: orderRow.created_at,
                items: (itemRows || []).map((ir: any, idx: number) => ({
                    id: ir.id,
                    order_id: orderId,
                    product_id: ir.product_id,
                    quantity: ir.quantity,
                    unit_price: Number(ir.unit_price),
                    product: {
                        id: items[idx].product_id,
                        name: items[idx].productName || '',
                        price: items[idx].unit_price,
                        category: items[idx].productCategory || '',
                    } as any,
                })) as any,
            };

            set((state) => ({ orders: [newOrder, ...state.orders] }));
            // 4. Deduct stock immediately for ALL orders
            await decrementStock(items);

            // 5. Automatically create a Freight expense if applicable
            if (orderData.type === 'pdv' && orderData.delivery_method === 'delivery' && orderData.surcharge_amount > 0) {
                try {
                    await useFinanceStore.getState().addExpense({
                        description: `Frete a Pagar - Pedido #${orderId.slice(0, 8)}`,
                        amount: orderData.surcharge_amount,
                        category: 'Operacional',
                        due_date: new Date().toISOString().split('T')[0],
                        status: 'pending',
                        payment_method: null,
                        supplier: null,
                        payment_date: null,
                        proof_url: null,
                        order_id: orderId,
                    });
                } catch (freightErr) {
                    console.error('Failed to auto-generate freight expense:', freightErr);
                    // Non-blocking, the order still succeeded
                }
            }

            return orderId;
        } catch (err) {
            console.error('Error creating order:', err);
            return null;
        }
    },

    updateStatus: async (orderId, status) => {
        // Optimistic update
        set((state) => ({
            orders: state.orders.map((o) =>
                o.id === orderId ? { ...o, status } : o
            ),
        }));

        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);


        if (status === 'accepted') {
            const order = get().orders.find((o) => o.id === orderId);
            if (order) {
                // Send WhatsApp confirmation to customer
                sendOrderConfirmation(order).catch((err) =>
                    console.error('[WhatsApp] Failed to send confirmation:', err)
                );
            }
        }
        if (error) {
            console.error('Error updating order status:', error);
            // Revert on error — refetch
            get().fetchOrders();
        }
    },

    updateOrderFields: async (orderId, fields) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update(fields)
                .eq('id', orderId);
            if (error) throw error;
            set((state) => ({
                orders: state.orders.map((o) =>
                    o.id === orderId ? { ...o, ...fields } : o
                ),
            }));
        } catch (err) {
            console.error('Error updating order fields:', err);
            throw err;
        }
    },

    cancelOrder: async (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;

        // Optimistic update
        set((state) => ({
            orders: state.orders.map((o) =>
                o.id === orderId ? { ...o, status: 'cancelled' as const } : o
            ),
        }));

        const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId);

        if (error) {
            console.error('Error cancelling order:', error);
            // Revert on error — refetch
            get().fetchOrders();
            return;
        }

        // Restore stock for items since they were deducted at order creation
        await incrementStock(order.items);

        // Cancel any expenses linked to this order (e.g. freight)
        try {
            await useFinanceStore.getState().cancelExpensesByOrderId(orderId);
        } catch (_) {
            // Non-blocking
        }

        if (order.status === 'completed' || order.status === 'accepted') {
            // Refresh finance data if the store has been loaded, since cancelling these
            // affects the computed revenue.
            try {
                useFinanceStore.getState().fetchTransactions();
            } catch (_) {
                // Finance store may not have been initialized yet
            }
        }
    },
}));
