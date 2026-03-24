import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { ProductPurchase, Expense } from '@/types';
import { useProductsStore } from './productsStore';
import { useFinanceStore } from './financeStore';

interface PurchasesState {
    productPurchases: Record<string, ProductPurchase[]>;
    isLoading: boolean;
    error: string | null;
    fetchProductHistory: (productId: string) => Promise<void>;
    registerPurchases: (
        purchases: Omit<ProductPurchase, 'id' | 'created_at'>[],
        expenseData: Omit<Expense, 'id' | 'created_at'> | null,
        isInstallment: boolean,
        installmentsCount: number
    ) => Promise<void>;
}

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
    productPurchases: {},
    isLoading: false,
    error: null,

    fetchProductHistory: async (productId) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('product_purchases')
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            set((state) => ({
                productPurchases: {
                    ...state.productPurchases,
                    [productId]: data || [],
                },
                isLoading: false,
            }));
        } catch (error: any) {
            console.error('Failed to fetch purchase history:', error);
            set({ isLoading: false, error: error.message });
        }
    },

    registerPurchases: async (purchases, expenseData, isInstallment, installmentsCount) => {
        set({ isLoading: true, error: null });
        try {
            // 1. Insert history records
            const { error: purchaseError } = await supabase
                .from('product_purchases')
                .insert(purchases);

            if (purchaseError) throw purchaseError;

            // 2. Update Products stock and cost price
            const productsStore = useProductsStore.getState();
            
            // Collect updates
            // In a better approach this would be an RPC or bulk update, 
            // but we'll do concurrent Promise.all for simplicity.
            const updatePromises = purchases.map((purchase) => {
                const existingProduct = productsStore.products.find(p => p.id === purchase.product_id);
                if (!existingProduct) return Promise.resolve();

                const newStock = existingProduct.stock_qty + purchase.quantity;
                // Suggestion approved: update cost price to the new one
                
                return productsStore.updateProduct(purchase.product_id, {
                    stock_qty: newStock,
                    cost_price: purchase.unit_cost
                });
            });
            await Promise.all(updatePromises);

            // 3. Register Expense(s) via FinanceStore
            if (expenseData) {
                const financeStore = useFinanceStore.getState();
                
                if (isInstallment && installmentsCount > 1) {
                    const totalAmount = expenseData.amount;
                    const count = Math.max(2, installmentsCount);
                    const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
                    const remainingAmount = totalAmount - (baseAmount * count);
                    
                    const expensesArr = [];
                    for (let i = 0; i < count; i++) {
                        const date = new Date(expenseData.due_date);
                        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
                        adjustedDate.setMonth(adjustedDate.getMonth() + i);
                        const formattedDate = adjustedDate.toISOString().split('T')[0];
                        
                        const isLast = i === count - 1;
                        const amount = isLast ? Number((baseAmount + remainingAmount).toFixed(2)) : baseAmount;
                        
                        expensesArr.push({
                            ...expenseData,
                            description: `${expenseData.description} (${i + 1}/${count})`,
                            amount,
                            due_date: formattedDate,
                            payment_date: i === 0 ? expenseData.payment_date : null,
                            payment_method: i === 0 ? expenseData.payment_method : null,
                            status: i === 0 ? expenseData.status : 'pending' as const
                        });
                    }
                    await financeStore.addExpenses(expensesArr);
                } else {
                    await financeStore.addExpense(expenseData);
                }
            }

            set({ isLoading: false });
        } catch (error: any) {
            console.error('Failed to register purchases:', error);
            set({ isLoading: false, error: error.message });
            throw error;
        }
    },
}));
