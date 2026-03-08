
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Order, Expense, FinancialTransaction } from '@/types';

interface FinanceState {
    transactions: FinancialTransaction[];
    expenses: Expense[];
    isLoading: boolean;
    error: string | null;
    summary: {
        totalRevenue: number;
        totalExpense: number;
        balance: number;
    };

    fetchTransactions: (startDate?: Date, endDate?: Date) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
    transactions: [],
    expenses: [],
    isLoading: false,
    error: null,
    summary: {
        totalRevenue: 0,
        totalExpense: 0,
        balance: 0,
    },

    fetchTransactions: async (startDate, endDate) => {
        set({ isLoading: true, error: null });
        try {
            // 1. Fetch Completed Orders (Revenue)
            let queryOrders = supabase
                .from('orders')
                .select('*, items:order_items(product:products(name))') // customized join if needed
                .in('status', ['completed', 'cancelled'])
                .order('created_at', { ascending: false });

            if (startDate) queryOrders = queryOrders.gte('created_at', startDate.toISOString());
            if (endDate) queryOrders = queryOrders.lte('created_at', endDate.toISOString());

            const { data: orders, error: ordersError } = await queryOrders;
            if (ordersError) throw ordersError;

            // 2. Fetch Expenses
            let queryExpenses = supabase
                .from('expenses')
                .select('*')
                .order('due_date', { ascending: false });

            if (startDate) queryExpenses = queryExpenses.gte('due_date', startDate.toISOString());
            if (endDate) queryExpenses = queryExpenses.lte('due_date', endDate.toISOString());

            const { data: expenses, error: expensesError } = await queryExpenses;
            if (expensesError) throw expensesError;

            // 3. Merge and Transform
            const orderTransactions: FinancialTransaction[] = (orders || []).map(o => ({
                id: o.id,
                type: 'revenue',
                date: o.created_at,
                description: `Pedido #${o.id.slice(0, 8)}`,
                amount: o.total_amount,
                category: 'Venda',
                status: o.status === 'cancelled' ? 'cancelled' : 'completed',
                original: o as Order
            }));

            const expenseTransactions: FinancialTransaction[] = (expenses || []).map(e => ({
                id: e.id,
                type: 'expense',
                date: e.due_date, // Use due_date for sorting/display usually
                description: e.description,
                amount: Number(e.amount),
                category: e.category,
                status: e.status,
                original: e as Expense
            }));

            const allTransactions = [...orderTransactions, ...expenseTransactions].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            // 4. Calculate Summary (exclude cancelled from revenue)
            const totalRevenue = orderTransactions
                .filter(t => t.status !== 'cancelled')
                .reduce((acc, t) => acc + Number(t.amount), 0);
            const totalExpense = expenseTransactions.reduce((acc, t) => acc + Number(t.amount), 0);

            set({
                transactions: allTransactions,
                expenses: (expenses as Expense[]) || [],
                summary: {
                    totalRevenue,
                    totalExpense,
                    balance: totalRevenue - totalExpense
                },
                isLoading: false
            });

        } catch (error: any) {
            console.error('Error fetching finance data:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    addExpense: async (expenseData) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase.from('expenses').insert([expenseData]);
            if (error) throw error;
            await get().fetchTransactions(); // Refresh
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    deleteExpense: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
            await get().fetchTransactions(); // Refresh
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    updateExpense: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase.from('expenses').update(updates).eq('id', id);
            if (error) throw error;
            await get().fetchTransactions(); // Refresh
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    }
}));
