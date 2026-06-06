import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface CashRegisterSession {
    id: string;
    opened_at: string;
    closed_at: string | null;
    opened_by: string;
    opening_balance: number;
    closing_cash: number | null;
    closing_pix: number | null;
    closing_debit: number | null;
    closing_credit: number | null;
    expected_cash: number | null;
    expected_pix: number | null;
    expected_debit: number | null;
    expected_credit: number | null;
    total_orders: number;
    total_orders_pdv: number;
    total_orders_online: number;
    total_items_sold: number;
    total_sales: number;
    status: 'open' | 'closed';
    notes: string | null;
}

export interface SalesSummary {
    totalOrders: number;
    totalOrdersPdv: number;
    totalOrdersOnline: number;
    totalItemsSold: number;
    totalSales: number;
    byCash: number;
    byPix: number;
    byDebit: number;
    byCredit: number;
    cancelledOrders: number;
    cancelledAmount: number;
    byPayLater: number;
}

interface CashRegisterState {
    currentSession: CashRegisterSession | null;
    isLoading: boolean;

    /** Fetches the currently open session (if any) */
    fetchCurrentSession: () => Promise<void>;

    /** Opens a new register session */
    openRegister: (openingBalance: number, userName: string) => Promise<boolean>;

    /** Closes the current session with counted values and summary */
    closeRegister: (
        closingData: {
            closing_cash: number;
            closing_pix: number;
            closing_debit: number;
            closing_credit: number;
        },
        summary: SalesSummary,
        notes?: string
    ) => Promise<boolean>;

    /** Gets sales summary from orders made during the current session */
    getSessionSalesSummary: () => Promise<SalesSummary>;
}

export const useCashRegisterStore = create<CashRegisterState>((set, get) => ({
    currentSession: null,
    isLoading: false,

    fetchCurrentSession: async () => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('cash_register_sessions')
                .select('*')
                .eq('status', 'open')
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error fetching cash register session:', error);
                set({ currentSession: null, isLoading: false });
                return;
            }

            set({
                currentSession: data
                    ? {
                        ...data,
                        opening_balance: Number(data.opening_balance),
                        closing_cash: data.closing_cash != null ? Number(data.closing_cash) : null,
                        closing_pix: data.closing_pix != null ? Number(data.closing_pix) : null,
                        closing_debit: data.closing_debit != null ? Number(data.closing_debit) : null,
                        closing_credit: data.closing_credit != null ? Number(data.closing_credit) : null,
                        expected_cash: data.expected_cash != null ? Number(data.expected_cash) : null,
                        expected_pix: data.expected_pix != null ? Number(data.expected_pix) : null,
                        expected_debit: data.expected_debit != null ? Number(data.expected_debit) : null,
                        expected_credit: data.expected_credit != null ? Number(data.expected_credit) : null,
                        total_orders: Number(data.total_orders),
                        total_orders_pdv: Number(data.total_orders_pdv),
                        total_orders_online: Number(data.total_orders_online),
                        total_items_sold: Number(data.total_items_sold),
                        total_sales: Number(data.total_sales),
                    }
                    : null,
                isLoading: false,
            });
        } catch (err) {
            console.error('Error fetching cash register session:', err);
            set({ currentSession: null, isLoading: false });
        }
    },

    openRegister: async (openingBalance, userName) => {
        try {
            const { data, error } = await supabase
                .from('cash_register_sessions')
                .insert({
                    opening_balance: openingBalance,
                    opened_by: userName,
                    status: 'open',
                })
                .select()
                .single();

            if (error || !data) {
                console.error('Error opening register:', error);
                return false;
            }

            set({
                currentSession: {
                    ...data,
                    opening_balance: Number(data.opening_balance),
                    closing_cash: null,
                    closing_pix: null,
                    closing_debit: null,
                    closing_credit: null,
                    expected_cash: null,
                    expected_pix: null,
                    expected_debit: null,
                    expected_credit: null,
                    total_orders: 0,
                    total_orders_pdv: 0,
                    total_orders_online: 0,
                    total_items_sold: 0,
                    total_sales: 0,
                },
            });
            return true;
        } catch (err) {
            console.error('Error opening register:', err);
            return false;
        }
    },

    closeRegister: async (closingData, summary, notes) => {
        const session = get().currentSession;
        if (!session) return false;

        try {
            const { error } = await supabase
                .from('cash_register_sessions')
                .update({
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                    closing_cash: closingData.closing_cash,
                    closing_pix: closingData.closing_pix,
                    closing_debit: closingData.closing_debit,
                    closing_credit: closingData.closing_credit,
                    expected_cash: summary.byCash,
                    expected_pix: summary.byPix,
                    expected_debit: summary.byDebit,
                    expected_credit: summary.byCredit,
                    total_orders: summary.totalOrders,
                    total_orders_pdv: summary.totalOrdersPdv,
                    total_orders_online: summary.totalOrdersOnline,
                    total_items_sold: summary.totalItemsSold,
                    total_sales: summary.totalSales,
                    notes: notes || null,
                })
                .eq('id', session.id);

            if (error) {
                console.error('Error closing register:', error);
                return false;
            }

            set({ currentSession: null });
            return true;
        } catch (err) {
            console.error('Error closing register:', err);
            return false;
        }
    },

    getSessionSalesSummary: async (): Promise<SalesSummary> => {
        const session = get().currentSession;
        const empty: SalesSummary = {
            totalOrders: 0,
            totalOrdersPdv: 0,
            totalOrdersOnline: 0,
            totalItemsSold: 0,
            totalSales: 0,
            byCash: 0,
            byPix: 0,
            byDebit: 0,
            byCredit: 0,
            cancelledOrders: 0,
            cancelledAmount: 0,
            byPayLater: 0,
        };
        if (!session) return empty;

        try {
            // Get all orders created after the session was opened
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*, order_items(quantity)')
                .gte('created_at', session.opened_at);

            if (error || !orders) return empty;

            let totalOrders = 0;
            let totalOrdersPdv = 0;
            let totalOrdersOnline = 0;
            let totalItemsSold = 0;
            let totalSales = 0;
            let byCash = 0;
            let byPix = 0;
            let byDebit = 0;
            let byCredit = 0;
            let cancelledOrders = 0;
            let cancelledAmount = 0;
            let byPayLater = 0;

            for (const order of orders) {
                const amount = Number(order.total_amount) || 0;

                // Cancelled orders: count separately, do not affect cash closing totals
                if (order.status === 'cancelled') {
                    cancelledOrders++;
                    cancelledAmount += amount;
                    continue;
                }

                totalOrders++;
                totalSales += amount;

                if (order.type === 'pdv') totalOrdersPdv++;
                else totalOrdersOnline++;

                const items = (order as any).order_items || [];
                for (const item of items) {
                    totalItemsSold += Number(item.quantity) || 0;
                }

                switch (order.payment_method) {
                    case 'cash':
                        byCash += amount;
                        break;
                    case 'pix':
                        byPix += amount;
                        break;
                    case 'debit':
                        byDebit += amount;
                        break;
                    case 'credit':
                        byCredit += amount;
                        break;
                    case 'pay_later':
                        byPayLater += amount;
                        break;
                }
            }

            return {
                totalOrders,
                totalOrdersPdv,
                totalOrdersOnline,
                totalItemsSold,
                totalSales,
                byCash,
                byPix,
                byDebit,
                byCredit,
                cancelledOrders,
                cancelledAmount,
                byPayLater,
            };
        } catch (err) {
            console.error('Error getting sales summary:', err);
            return empty;
        }
    },
}));
