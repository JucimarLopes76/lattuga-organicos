import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/types';

interface CustomersState {
    customers: Customer[];
    isLoading: boolean;
    error: string | null;
    fetchCustomers: () => Promise<void>;
    createCustomer: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<void>;
    updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    findCustomerByPhone: (phone: string) => Promise<Customer | null>;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
    customers: [],
    isLoading: false,
    error: null,

    fetchCustomers: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching customers:', error);
                set({ isLoading: false, error: error.message });
                return;
            }

            const customers: Customer[] = (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone || null,
                email: c.email || null,
                address: c.address || null,
                created_at: c.created_at,
            }));

            set({ customers, isLoading: false });
        } catch (err: any) {
            console.error('Failed to fetch customers:', err);
            set({ isLoading: false, error: err.message });
        }
    },

    createCustomer: async (customer) => {
        const { data, error } = await supabase
            .from('customers')
            .insert({
                name: customer.name,
                phone: customer.phone || null,
                email: customer.email || null,
                address: customer.address || null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating customer:', error);
            return;
        }

        if (data) {
            const newCustomer: Customer = {
                id: data.id,
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                created_at: data.created_at,
            };
            set((state) => ({
                customers: [newCustomer, ...state.customers],
            }));
        }
    },

    updateCustomer: async (id, updates) => {
        // Optimistic update
        set((state) => ({
            customers: state.customers.map((c) =>
                c.id === id ? { ...c, ...updates } : c
            ),
        }));

        const { error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating customer:', error);
            get().fetchCustomers();
        }
    },

    deleteCustomer: async (id) => {
        // Optimistic remove
        set((state) => ({
            customers: state.customers.filter((c) => c.id !== id),
        }));

        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting customer:', error);
            get().fetchCustomers();
        }
    },

    findCustomerByPhone: async (phone) => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
            created_at: data.created_at,
        };
    },
}));
