import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Eye,
    EyeOff,
    Pencil,
    Trash2,
    Package,
    Upload,
    RefreshCw,
    Wand2,
} from 'lucide-react';
import { generateProductDescription } from '@/services/ai';
import { useProductsStore } from '@/stores/productsStore';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import type { Product } from '@/types';

export default function Products() {
    const {
        products,
        isLoading,
        fetchProducts,
        updateProduct,
        createProduct,
        deleteProduct,
    } = useProductsStore();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formCostPrice, setFormCostPrice] = useState('');
    const [formCategory, setFormCategory] = useState('Verduras');
    const [formStock, setFormStock] = useState('0');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [formShowCatalog, setFormShowCatalog] = useState(true);
    const [formSupplierCode, setFormSupplierCode] = useState('');
    const [formFeatureBadge, setFormFeatureBadge] = useState<'none'|'highlight'|'offer'>('none');
    const [saving, setSaving] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

    // Compute next internal code for new products
    const nextInternalCode = String(
        products.reduce((max, p) => {
            const num = parseInt(p.internal_code, 10);
            return !isNaN(num) && num > max ? num : max;
        }, 0) + 1
    ).padStart(4, '0');

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => {
        setEditingProduct(null);
        setFormName('');
        setFormDescription('');
        setFormPrice('');
        setFormCostPrice('');
        setFormCategory('Verduras');
        setFormStock('0');
        setFormImageUrl('');
        setFormShowCatalog(true);
        setFormSupplierCode('');
        setFormFeatureBadge('none');
        setShowModal(true);
    };

    const openEdit = (p: Product) => {
        setEditingProduct(p);
        setFormName(p.name);
        setFormDescription(p.description || '');
        setFormPrice(p.price.toString());
        setFormCostPrice(p.cost_price?.toString() || '0');
        setFormCategory(p.category);
        setFormStock(p.stock_qty.toString());
        setFormImageUrl(p.image_url || '');
        setFormShowCatalog(p.show_in_catalog);
        setFormSupplierCode(p.supplier_code || '');
        setFormFeatureBadge(p.feature_badge || 'none');
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        if (editingProduct) {
            await updateProduct(editingProduct.id, {
                name: formName,
                description: formDescription,
                price: parseFloat(formPrice) || 0,
                cost_price: parseFloat(formCostPrice) || 0,
                category: formCategory,
                stock_qty: parseInt(formStock) || 0,
                image_url: formImageUrl || null,
                show_in_catalog: formShowCatalog,
                supplier_code: formSupplierCode || null,
                feature_badge: formFeatureBadge,
            });
        } else {
            await createProduct({
                name: formName,
                description: formDescription,
                price: parseFloat(formPrice) || 0,
                cost_price: parseFloat(formCostPrice) || 0,
                category: formCategory,
                stock_qty: parseInt(formStock) || 0,
                image_url: formImageUrl || null,
                is_active: true,
                show_in_catalog: formShowCatalog,
                supplier_code: formSupplierCode || null,
                feature_badge: formFeatureBadge,
            });
        }
        setSaving(false);
        setShowModal(false);
    };

    const handleGenerateDescription = async () => {
        if (!formName) {
            alert('Por favor, preencha o nome do produto primeiro.');
            return;
        }

        setIsGeneratingDescription(true);
        try {
            const description = await generateProductDescription(formName, formCategory);
            setFormDescription(description);
        } catch (error: any) {
            alert(error.message || 'Erro ao gerar descrição');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const toggleCatalog = (p: Product) => {
        updateProduct(p.id, { show_in_catalog: !p.show_in_catalog });
    };

    const toggleActive = (p: Product) => {
        updateProduct(p.id, { is_active: !p.is_active });
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            deleteProduct(id);
        }
    };

    return (
        <div className="p-4 lg:p-6 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
                    <p className="text-sm text-gray-500">
                        {products.length} produtos cadastrados
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RefreshCw size={16} />}
                        onClick={() => fetchProducts()}
                    >
                        Atualizar
                    </Button>
                    <Button onClick={openAdd} leftIcon={<Plus size={18} />}>
                        Novo Produto
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md mb-6">
                <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                />
            </div>

            {/* Loading */}
            {isLoading && products.length === 0 && (
                <div className="flex items-center justify-center py-16">
                    <Spinner />
                </div>
            )}

            {/* Products Table / Grid */}
            {(!isLoading || products.length > 0) && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                        Código
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                        Produto
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                        Categoria
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                        Preço Venda
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">
                                        Estoque
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">
                                        Catálogo
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">
                                        Ativo
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((p) => (
                                    <tr
                                        key={p.id}
                                        className={cn(
                                            'hover:bg-gray-50/50 transition-colors',
                                            !p.is_active && 'opacity-50'
                                        )}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-brand-700 font-mono">{p.internal_code}</span>
                                                {p.supplier_code && (
                                                    <span className="text-[10px] text-gray-400">{p.supplier_code}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {p.image_url ? (
                                                        <img
                                                            src={p.image_url}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                            <Package size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900 text-sm">
                                                    {p.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
                                                {p.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-900 text-sm">
                                            {formatCurrency(p.price)}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                                            {p.stock_qty}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => toggleCatalog(p)}
                                                className="cursor-pointer"
                                                title={p.show_in_catalog ? 'Visível no catálogo' : 'Oculto do catálogo'}
                                            >
                                                {p.show_in_catalog ? (
                                                    <Eye size={18} className="text-brand-600 mx-auto" />
                                                ) : (
                                                    <EyeOff size={18} className="text-gray-400 mx-auto" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => toggleActive(p)}
                                                className={cn(
                                                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
                                                    p.is_active ? 'bg-brand-600' : 'bg-gray-300'
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                                                        p.is_active ? 'translate-x-6' : 'translate-x-1'
                                                    )}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEdit(p)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition cursor-pointer"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {filtered.map((p) => (
                            <div
                                key={p.id}
                                className={cn(
                                    'flex items-center gap-3 p-4',
                                    !p.is_active && 'opacity-50'
                                )}
                            >
                                <div className="h-14 w-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                    {p.image_url ? (
                                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                            <Package size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-bold font-mono">{p.internal_code}</span>
                                        <p className="font-semibold text-gray-800 text-sm truncate">
                                            {p.name}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {p.category} · Estoque: {p.stock_qty}
                                    </p>
                                    <p className="text-sm font-bold text-brand-600">
                                        {formatCurrency(p.price)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => toggleCatalog(p)}
                                        className="p-2 cursor-pointer"
                                    >
                                        {p.show_in_catalog ? (
                                            <Eye size={16} className="text-brand-600" />
                                        ) : (
                                            <EyeOff size={16} className="text-gray-400" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => openEdit(p)}
                                        className="p-2 text-gray-400 cursor-pointer"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Package size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">Nenhum produto encontrado</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add / Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
                size="lg"
            >
                <div className="space-y-4">
                    {/* Codes section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código Interno</label>
                            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono font-bold text-brand-700">
                                {editingProduct ? editingProduct.internal_code : nextInternalCode}
                            </div>
                        </div>
                        <Input
                            label="Cód. Fornecedor"
                            value={formSupplierCode}
                            onChange={(e) => setFormSupplierCode(e.target.value)}
                            placeholder="Ex: FORN-001"
                        />
                    </div>
                    <Input
                        label="Nome"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Nome do produto"
                        required
                    />

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Descrição</label>
                            <button
                                type="button"
                                onClick={handleGenerateDescription}
                                disabled={!formName || isGeneratingDescription}
                                className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Wand2 size={12} />
                                {isGeneratingDescription ? 'Gerando...' : 'Gerar com IA'}
                            </button>
                        </div>
                        <Input
                            label="" // Label is handled above
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Descrição breve"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Preço Custo (R$)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formCostPrice}
                            onChange={(e) => setFormCostPrice(e.target.value)}
                            placeholder="0,00"
                        />
                        <Input
                            label="Preço Venda (R$)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formPrice}
                            onChange={(e) => setFormPrice(e.target.value)}
                            placeholder="0,00"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Estoque"
                            type="number"
                            min="0"
                            value={formStock}
                            onChange={(e) => setFormStock(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Destaque Especial"
                            value={formFeatureBadge}
                            onChange={(e) => setFormFeatureBadge(e.target.value as any)}
                            options={[
                                { value: 'none', label: 'Nenhum' },
                                { value: 'highlight', label: 'Destaque' },
                                { value: 'offer', label: 'Oferta da Semana' },
                            ]}
                        />
                        <Select
                            label="Categoria"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        options={[
                            { value: 'Verduras', label: 'Verduras' },
                            { value: 'Legumes', label: 'Legumes' },
                            { value: 'Frutas', label: 'Frutas' },
                            { value: 'Proteínas', label: 'Proteínas' },
                            { value: 'Mercearia', label: 'Mercearia' },
                            { value: 'Bebidas', label: 'Bebidas' },
                            { value: 'Padaria', label: 'Padaria' },
                            { value: 'Laticínios', label: 'Laticínios' },
                        ]}
                    />
                    <Input
                        label="URL da Imagem"
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        placeholder="https://..."
                        icon={<Upload size={16} />}
                    />
                    <label className="flex items-center gap-3 cursor-pointer">
                        <button
                            type="button"
                            onClick={() => setFormShowCatalog(!formShowCatalog)}
                            className={cn(
                                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
                                formShowCatalog ? 'bg-brand-600' : 'bg-gray-300'
                            )}
                        >
                            <span
                                className={cn(
                                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                                    formShowCatalog ? 'translate-x-6' : 'translate-x-1'
                                )}
                            />
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                            Exibir no catálogo online
                        </span>
                    </label>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setShowModal(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1"
                            disabled={!formName || !formPrice}
                            isLoading={saving}
                        >
                            {editingProduct ? 'Salvar' : 'Criar Produto'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
