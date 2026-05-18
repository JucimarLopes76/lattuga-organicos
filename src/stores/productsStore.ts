import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { categories as defaultCategories } from '@/data/products';
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
    seedMockProducts: () => Promise<void>;
    bulkUpdateProducts: (updates: { id: string; changes: Partial<Product> }[]) => Promise<void>;
    bulkCreateProducts: (products: Omit<Product, 'id' | 'internal_code' | 'created_at' | 'updated_at'>[]) => Promise<void>;
}

function extractCategories(products: Product[]): string[] {
    const uniqueRaw = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    const sorted = uniqueRaw.sort((a, b) => a.localeCompare(b));
    return ['Todas', ...sorted];
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
                set({ products: [], categories: defaultCategories, isLoading: false, error: error.message });
                return;
            }

            if (!data || data.length === 0) {
                set({ products: [], categories: defaultCategories, isLoading: false });
                return;
            }

            const products: Product[] = data.map((p: any) => ({
                id: p.id,
                internal_code: p.internal_code || '',
                supplier_code: p.supplier_code || null,
                supplier_name: p.supplier_name || null,
                is_packaged: p.is_packaged || false,
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
            set({ products: [], categories: defaultCategories, isLoading: false, error: err.message });
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

    bulkUpdateProducts: async (updates: { id: string; changes: Partial<Product> }[]) => {
        set({ isLoading: true, error: null });
        try {
            const promises = updates.map((u) => 
                supabase.from('products')
                    .update({ ...u.changes, updated_at: new Date().toISOString() })
                    .eq('id', u.id)
            );
            await Promise.all(promises);
            get().fetchProducts();
        } catch (err: any) {
            console.error('Failed to bulk update products:', err);
            set({ isLoading: false, error: err.message });
            throw err;
        }
    },

    bulkCreateProducts: async (productsToCreate) => {
        set({ isLoading: true, error: null });
        try {
            const existing = get().products;
            let maxCode = existing.reduce((max, p) => {
                const num = parseInt(p.internal_code, 10);
                return !isNaN(num) && num > max ? num : max;
            }, 0);

            const inserts = productsToCreate.map((product) => {
                maxCode++;
                const nextCode = String(maxCode).padStart(4, '0');
                return {
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
                };
            });

            const { error } = await supabase.from('products').insert(inserts);

            if (error) {
                throw error;
            }

            await get().fetchProducts();
        } catch (err: any) {
            console.error('Failed to bulk create products:', err);
            set({ isLoading: false, error: err.message });
            throw err;
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
                supplier_name: data.supplier_name || null,
                is_packaged: data.is_packaged || false,
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
        // First check for order items or purchases
        const { data: orderItems, error: idxErr } = await supabase
            .from('order_items')
            .select('id')
            .eq('product_id', id)
            .limit(1);

        const { data: purchases, error: purErr } = await supabase
            .from('product_purchases')
            .select('id')
            .eq('product_id', id)
            .limit(1);

        if (idxErr || purErr) {
            throw new Error('Erro ao verificar histórico do produto.');
        }

        if ((orderItems && orderItems.length > 0) || (purchases && purchases.length > 0)) {
            throw new Error('Não é possível excluir o produto pois ele já possui pedidos ou histórico de compras registrados. Por favor, apenas marque-o como "Inativo".');
        }

        // Optimistic remove
        set((state) => ({
            products: state.products.filter((p) => p.id !== id),
            categories: extractCategories(state.products.filter((p) => p.id !== id)),
        }));

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            get().fetchProducts();
            throw new Error('Falha ao deletar o produto no banco de dados.');
        }
    },

    seedMockProducts: async () => {
        set({ isLoading: true });
        try {
            const dummyProducts = [
                {
                    internal_code: '0001',
                    name: 'Tomate Cereja Orgânico 500g',
                    description: 'Tomates cereja frescos e orgânicos colhidos na fazenda.',
                    price: 15.90,
                    cost_price: 8.50,
                    category: 'Legumes',
                    stock_qty: 0,
                    is_active: true,
                    show_in_catalog: true,
                },
                {
                    internal_code: '0002',
                    name: 'Alface Crespa Orgânica',
                    description: 'Maco de alface crespa sem agrotóxicos.',
                    price: 4.50,
                    cost_price: 2.00,
                    category: 'Verduras',
                    stock_qty: 0,
                    is_active: true,
                    show_in_catalog: true,
                },
                {
                    internal_code: '0003',
                    name: 'Cenoura Orgânica 1kg',
                    description: 'Cenouras selecionadas de alta qualidade.',
                    price: 9.80,
                    cost_price: 5.00,
                    category: 'Legumes',
                    stock_qty: 0,
                    is_active: true,
                    show_in_catalog: true,
                },
                {
                    internal_code: '0004',
                    name: 'Banana Prata Orgânica Penca',
                    description: 'Penca de bananas colhidas no ponto perfeito.',
                    price: 12.00,
                    cost_price: 6.50,
                    category: 'Frutas',
                    stock_qty: 0,
                    is_active: true,
                    show_in_catalog: true,
                },
                {
                    internal_code: '0005',
                    name: 'Morango Orgânico Bandeja 250g',
                    description: 'Morangos doces e suculentos.',
                    price: 18.50,
                    cost_price: 10.00,
                    category: 'Frutas',
                    stock_qty: 0,
                    is_active: true,
                    show_in_catalog: true,
                }
            ];

            const { error } = await supabase.from('products').insert(dummyProducts);
            if (error) throw error;
            
            await get().fetchProducts();
        } catch (err: any) {
            console.error('Failed to seed products:', err.message);
            set({ isLoading: false });
        }
    },
}));
