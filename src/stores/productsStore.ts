import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { demoProducts, categories as defaultCategories } from '@/data/products';
import type { Product } from '@/types';

interface ProductsState {
    products: Product[];
    categories: string[];
    isLoading: boolean;
    error: string | null;
    fetchProducts: () => Promise<void>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    createProduct: (product: Omit<Product, 'id' | 'internal_code' | 'created_at' | 'updated_at'>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
}

function extractCategories(products: Product[]): string[] {
    return ['Todas', ...new Set(products.map((p) => p.category))];
}

export const useProductsStore = create<ProductsState>((set, get) => ({
    products: [],
    categories: defaultCategories,
    isLoading: false,
    error: null,

    fetchProducts: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) {
                console.error('Supabase products error:', error);
                set({ products: demoProducts, categories: defaultCategories, isLoading: false, error: error.message });
                return;
            }

            if (!data || data.length === 0) {
                set({ products: demoProducts, categories: defaultCategories, isLoading: false });
                return;
            }

            const products: Product[] = data.map((p: any) => ({
                id: p.id,
                internal_code: p.internal_code || '',
                supplier_code: p.supplier_code || null,
                name: p.name,
                description: p.description || '',
                price: Number(p.price),
                cost_price: Number(p.cost_price) || 0,
                image_url: p.image_url || '',
                category: p.category,
                stock_qty: p.stock_qty,
                is_active: p.is_active,
                show_in_catalog: p.show_in_catalog,
                feature_badge: p.feature_badge || 'none',
                created_at: p.created_at,
                updated_at: p.updated_at,
            }));

            set({ products, categories: extractCategories(products), isLoading: false });
        } catch (err: any) {
            console.error('Failed to fetch products:', err);
            set({ products: demoProducts, categories: defaultCategories, isLoading: false, error: err.message });
        }
    },

    updateProduct: async (id, updates) => {
        // Optimistic update
        set((state) => ({
            products: state.products.map((p) =>
                p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
            ),
        }));

        const { error } = await supabase
            .from('products')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Error updating product:', error);
            // Revert by refetching
            get().fetchProducts();
        }
    },

    createProduct: async (product) => {
        // Auto-generate next internal_code
        const existing = get().products;
        const maxCode = existing.reduce((max, p) => {
            const num = parseInt(p.internal_code, 10);
            return !isNaN(num) && num > max ? num : max;
        }, 0);
        const nextCode = String(maxCode + 1).padStart(4, '0');

        const { data, error } = await supabase
            .from('products')
            .insert({
                internal_code: nextCode,
                supplier_code: product.supplier_code || null,
                name: product.name,
                description: product.description || null,
                price: product.price,
                cost_price: product.cost_price || 0,
                category: product.category,
                stock_qty: product.stock_qty,
                image_url: product.image_url || null,
                is_active: product.is_active,
                show_in_catalog: product.show_in_catalog,
                feature_badge: product.feature_badge || 'none',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating product:', error);
            return;
        }

        if (data) {
            const newProduct: Product = {
                id: data.id,
                internal_code: data.internal_code || nextCode,
                supplier_code: data.supplier_code || null,
                name: data.name,
                description: data.description || '',
                price: Number(data.price),
                cost_price: Number(data.cost_price) || 0,
                image_url: data.image_url || '',
                category: data.category,
                stock_qty: data.stock_qty,
                is_active: data.is_active,
                show_in_catalog: data.show_in_catalog,
                feature_badge: data.feature_badge || 'none',
                created_at: data.created_at,
                updated_at: data.updated_at,
            };
            set((state) => ({
                products: [newProduct, ...state.products],
                categories: extractCategories([newProduct, ...state.products]),
            }));
        }
    },

    deleteProduct: async (id) => {
        // Optimistic remove
        set((state) => ({
            products: state.products.filter((p) => p.id !== id),
        }));

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            get().fetchProducts();
        }
    },
}));
