import type { Product } from '@/types';

// Demo products used when Supabase is not connected
export const demoProducts: Product[] = [
    {
        id: '1', internal_code: '0001', supplier_code: null, name: 'Alface Crespa Orgânica', description: 'Alface crespa fresca, cultivada sem agrotóxicos.',
        price: 4.50, cost_price: 0, category: 'Verduras', stock_qty: 50, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '2', internal_code: '0002', supplier_code: null, name: 'Tomate Italiano Orgânico', description: 'Tomate italiano maduro, perfeito para molhos.',
        price: 8.90, cost_price: 0, category: 'Legumes', stock_qty: 40, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '3', internal_code: '0003', supplier_code: null, name: 'Cenoura Orgânica (maço)', description: 'Maço de cenouras frescas e crocantes.',
        price: 6.50, cost_price: 0, category: 'Legumes', stock_qty: 35, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '4', internal_code: '0004', supplier_code: null, name: 'Banana Prata Orgânica (kg)', description: 'Banana prata madura, rica em potássio.',
        price: 7.90, cost_price: 0, category: 'Frutas', stock_qty: 60, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '5', internal_code: '0005', supplier_code: null, name: 'Maçã Fuji Orgânica (kg)', description: 'Maçã fuji doce e suculenta.',
        price: 12.90, cost_price: 0, category: 'Frutas', stock_qty: 30, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '6', internal_code: '0006', supplier_code: null, name: 'Ovos Caipira (dúzia)', description: 'Ovos de galinha caipira, criação livre.',
        price: 15.90, cost_price: 0, category: 'Proteínas', stock_qty: 25, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '7', internal_code: '0007', supplier_code: null, name: 'Mel Puro Orgânico (500g)', description: 'Mel silvestre puro, sem aditivos.',
        price: 28.00, cost_price: 0, category: 'Mercearia', stock_qty: 20, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '8', internal_code: '0008', supplier_code: null, name: 'Granola Artesanal (300g)', description: 'Granola crocante com castanhas e frutas secas.',
        price: 18.50, cost_price: 0, category: 'Mercearia', stock_qty: 30, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1517093728432-a0440f8d45af?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '9', internal_code: '0009', supplier_code: null, name: 'Suco Verde Detox (500ml)', description: 'Suco prensado a frio com couve, maçã e gengibre.',
        price: 14.90, cost_price: 0, category: 'Bebidas', stock_qty: 15, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '10', internal_code: '0010', supplier_code: null, name: 'Pão Integral Artesanal', description: 'Pão integral feito com farinha orgânica e fermentação natural.',
        price: 12.00, cost_price: 0, category: 'Padaria', stock_qty: 10, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '11', internal_code: '0011', supplier_code: null, name: 'Queijo Minas Frescal', description: 'Queijo minas artesanal, fresco e leve.',
        price: 22.00, cost_price: 0, category: 'Laticínios', stock_qty: 12, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '12', internal_code: '0012', supplier_code: null, name: 'Manteiga Orgânica (200g)', description: 'Manteiga de leite orgânico, sem conservantes.',
        price: 16.50, cost_price: 0, category: 'Laticínios', stock_qty: 18, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '13', internal_code: '0013', supplier_code: null, name: 'Café Orgânico Torrado (250g)', description: 'Café especial torrado artesanalmente.',
        price: 24.90, cost_price: 0, category: 'Bebidas', stock_qty: 22, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '14', internal_code: '0014', supplier_code: null, name: 'Abobrinha Orgânica (kg)', description: 'Abobrinha verde fresca, ideal para refogados.',
        price: 9.50, cost_price: 0, category: 'Legumes', stock_qty: 25, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
    {
        id: '15', internal_code: '0015', supplier_code: null, name: 'Espinafre Orgânico (maço)', description: 'Espinafre fresco, rico em ferro.',
        price: 5.90, cost_price: 0, category: 'Verduras', stock_qty: 20, is_active: true, show_in_catalog: true,
        image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop',
        created_at: '', updated_at: '',
    },
];

export const categories = [
    'Todas',
    'Verduras',
    'Legumes',
    'Frutas',
    'Proteínas',
    'Mercearia',
    'Bebidas',
    'Padaria',
    'Laticínios',
];
