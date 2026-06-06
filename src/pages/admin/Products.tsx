import { useState, useEffect, useRef } from 'react';
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
import { generateProductDescription, generateProductImage, canGenerateImage, getRemainingGenerations } from '@/services/ai';
import { useProductsStore } from '@/stores/productsStore';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { RegisterPurchaseModal } from '@/components/products/RegisterPurchaseModal';
import { ImportExcelModal } from '@/components/products/ImportExcelModal';
import { usePurchasesStore } from '@/stores/purchasesStore';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

export default function Products() {
    const {
        products,
        isLoading,
        fetchProducts,
        updateProduct,
        createProduct,
        deleteProduct,
        seedMockProducts,
    } = useProductsStore();
    
    // Purchases Store
    const { productPurchases, fetchProductHistory, isLoading: isLoadingHistory } = usePurchasesStore();

    const [search, setSearch] = useState('');
    
    // Derived categories
    const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    const [showModal, setShowModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formCostPrice, setFormCostPrice] = useState('');
    const [formCategory, setFormCategory] = useState('VERDURAS');
    const [formStock, setFormStock] = useState('0');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [formShowCatalog, setFormShowCatalog] = useState(true);
    const [formIsActive, setFormIsActive] = useState(true);
    const [formSupplierCode, setFormSupplierCode] = useState('');
    const [formSupplierName, setFormSupplierName] = useState('');
    const [formIsPackaged, setFormIsPackaged] = useState(false);
    const [formFeatureBadge, setFormFeatureBadge] = useState<'none'|'highlight'|'offer'>('none');
    const [saving, setSaving] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [formImageScenario, setFormImageScenario] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const imageFileRef = useRef<HTMLInputElement>(null);

    // Computed properties for the active form
    const isPackagedItem = formIsPackaged;

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
        setFormCategory('VERDURAS');
        setFormStock('0');
        setFormImageUrl('');
        setFormShowCatalog(true);
        setFormIsActive(true);
        setFormSupplierCode('');
        setFormSupplierName('');
        setFormIsPackaged(false);
        setFormFeatureBadge('none');
        setFormImageScenario('');
        setShowModal(true);
    };

    const openEdit = (p: Product) => {
        setEditingProduct(p);
        fetchProductHistory(p.id);
        setFormName(p.name);
        setFormDescription(p.description || '');
        setFormPrice(p.price.toString());
        setFormCostPrice(p.cost_price?.toString() || '0');
        setFormCategory((p.category || '').toUpperCase());
        setFormStock(p.stock_qty.toString());
        setFormImageUrl(p.image_url || '');
        setFormShowCatalog(p.show_in_catalog);
        setFormIsActive(p.is_active);
        setFormSupplierCode(p.supplier_code || '');
        setFormSupplierName(p.supplier_name || '');
        setFormIsPackaged(p.is_packaged || false);
        setFormFeatureBadge(p.feature_badge || 'none');
        setFormImageScenario('');
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
                is_active: formIsActive,
                supplier_code: formSupplierCode || null,
                supplier_name: formSupplierName || null,
                is_packaged: formIsPackaged,
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
                show_in_catalog: formShowCatalog,
                is_active: formIsActive,
                supplier_code: formSupplierCode || null,
                supplier_name: formSupplierName || null,
                is_packaged: formIsPackaged,
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

    const handleGenerateImage = async () => {        if (!formName) {
            alert('Por favor, preencha o nome do produto primeiro para gerar a imagem.');
            return;
        }

        // Check rate limit before starting
        const rateCheck = canGenerateImage();
        if (!rateCheck.allowed) {
            alert(rateCheck.reason);
            return;
        }

        setIsGeneratingImage(true);
        try {
            const imageUrl = await generateProductImage(formName, formCategory, formIsPackaged, formImageScenario || undefined, formImageUrl || undefined);
            setFormImageUrl(imageUrl);
        } catch (error: any) {
            alert(error.message || 'Erro ao gerar imagem com IA');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!e.target.files) return;
        // Reset input so same file can be selected again if needed
        e.target.value = '';
        if (!file) return;

        // Validate type
        if (!file.type.startsWith('image/')) {
            alert('Arquivo inválido. Selecione apenas imagens (JPG, PNG, WEBP, etc).');
            return;
        }

        // Validate size (5MB max)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert('Imagem muito grande. O tamanho máximo permitido é 5MB.');
            return;
        }

        setIsUploadingImage(true);
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const filePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file, { contentType: file.type, upsert: false });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setFormImageUrl(urlData.publicUrl);
        } catch (err: any) {
            alert(`Erro ao enviar imagem: ${err.message || 'Tente novamente.'}`);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const toggleCatalog = (p: Product) => {
        updateProduct(p.id, { show_in_catalog: !p.show_in_catalog });
    };

    const toggleActive = (p: Product) => {
        updateProduct(p.id, { is_active: !p.is_active });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await deleteProduct(id);
            } catch (err: any) {
                alert(err.message || 'Erro ao excluir o produto.');
            }
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
                    {products.length === 0 && (
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                                if (confirm('Isso vai gerar 5 produtos de teste automaticamente. Confirmar?')) {
                                    seedMockProducts();
                                }
                            }}
                            leftIcon={<Wand2 size={16} />}
                        >
                            Gerar Produtos de Teste
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowPurchaseModal(true)} leftIcon={<Package size={18} />}>
                        Registrar Compra
                    </Button>
                    <Button variant="outline" onClick={() => setShowImportModal(true)} leftIcon={<Upload size={18} />} className="text-brand-700 bg-brand-50 border-brand-200 hover:bg-brand-100 hidden sm:flex">
                        Importar Excel
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
                                                {(p.supplier_name || p.supplier_code) && (
                                                    <span className="text-[10px] text-gray-400">{p.supplier_name || p.supplier_code}</span>
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
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium w-fit">
                                                    {p.category}
                                                </span>
                                                {p.is_packaged ? (
                                                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit uppercase font-bold tracking-wider" title="Produto Industrializado / Empresa">Embalado</span>
                                                ) : (
                                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-fit uppercase font-bold tracking-wider" title="Natural / Fresco">In Natura</span>
                                                )}
                                            </div>
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
                                    'p-4 space-y-2',
                                    !p.is_active && 'opacity-50'
                                )}
                            >
                                {/* Row 1: image + name + actions */}
                                <div className="flex items-start gap-3">
                                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                        {p.image_url ? (
                                            <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                <Package size={22} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm leading-snug">
                                            {p.name}
                                        </p>
                                        <span className="text-[10px] font-bold font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                            #{p.internal_code}
                                        </span>
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex flex-col gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => openEdit(p)}
                                            className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600 transition cursor-pointer"
                                            title="Editar"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={() => toggleCatalog(p)}
                                            className="p-2 rounded-lg bg-gray-100 cursor-pointer"
                                            title={p.show_in_catalog ? 'Visível no catálogo' : 'Oculto do catálogo'}
                                        >
                                            {p.show_in_catalog ? (
                                                <Eye size={15} className="text-brand-600" />
                                            ) : (
                                                <EyeOff size={15} className="text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: category + type + stock */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                                        {p.category}
                                    </span>
                                    {p.is_packaged ? (
                                        <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Embalado</span>
                                    ) : (
                                        <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">In Natura</span>
                                    )}
                                    <span className="text-[10px] text-gray-500 ml-auto">
                                        Estoque: <strong className="text-gray-700">{p.stock_qty}</strong>
                                    </span>
                                </div>

                                {/* Row 3: price */}
                                <p className="text-base font-bold text-brand-600">
                                    {formatCurrency(p.price)}
                                </p>
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
                        <div>
                            <Input
                                label="Categoria"
                                value={formCategory}
                                onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                                list="categories-list"
                                placeholder="Selecione ou digite uma nova..."
                            />
                            <datalist id="categories-list">
                                {categories.filter(c => c !== 'Todas').map(cat => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>
                        </div>
                    </div>
                    <div className="space-y-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100">
                        <h4 className="text-sm font-bold text-brand-900 flex items-center gap-2 mb-2">
                            <Wand2 size={16} className="text-brand-600" />
                            Imagem do Produto
                        </h4>
                        
                        <div className="flex gap-4 items-start">
                            {formImageUrl ? (
                                <div className="h-24 w-24 rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-white flex-shrink-0">
                                    <img src={formImageUrl} alt="Preview" className="h-full w-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-24 w-24 rounded-lg shadow-sm border border-dashed border-gray-300 bg-white flex items-center justify-center flex-shrink-0 text-gray-400">
                                    <Package size={24} />
                                </div>
                            )}

                            <div className="flex-1 space-y-3">
                                <Input
                                    label="URL da Imagem"
                                    value={formImageUrl}
                                    onChange={(e) => setFormImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    icon={<Upload size={16} />}
                                />
                                <input
                                    ref={imageFileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageFileChange}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-dashed border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50"
                                    leftIcon={isUploadingImage ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                    onClick={() => imageFileRef.current?.click()}
                                    disabled={isUploadingImage}
                                >
                                    {isUploadingImage ? 'Enviando...' : 'Enviar do dispositivo'}
                                </Button>
                                <div>
                                    <Input
                                        label="Cenário para IA (Opcional)"
                                        value={formImageScenario}
                                        onChange={(e) => setFormImageScenario(e.target.value)}
                                        placeholder="Ex: frutas em uma cesta, fundo claro..."
                                    />
                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <span className="text-xs text-gray-400">
                                                {getRemainingGenerations()} gerações restantes hoje
                                            </span>
                                            <Button
                                                type="button"
                                                onClick={handleGenerateImage}
                                                disabled={!formName || isGeneratingImage || !canGenerateImage().allowed || isPackagedItem}
                                                variant="outline"
                                                size="sm"
                                                className="bg-white border-brand-200 text-brand-700 hover:bg-brand-50"
                                                leftIcon={isGeneratingImage ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                            >
                                                {isGeneratingImage ? 'Gerando imagem...' : 'Gerar Imagem com IA'}
                                            </Button>
                                        </div>
                                        {isPackagedItem && (
                                            <p className="text-[11px] leading-tight text-amber-600 bg-amber-50 border border-amber-100 p-2 rounded-lg font-medium">
                                                A IA de imagem está <strong>desativada</strong> para produtos embalados/industrializados. Isso evita alucinações onde a IA "inventa" embalagens falsas. Utilize imagens reais do fornecedor.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
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

                        <label className="flex items-center gap-3 cursor-pointer">
                            <button
                                type="button"
                                onClick={() => setFormIsActive(!formIsActive)}
                                className={cn(
                                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
                                    formIsActive ? 'bg-green-600' : 'bg-gray-300'
                                )}
                            >
                                <span
                                    className={cn(
                                        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                                        formIsActive ? 'translate-x-6' : 'translate-x-1'
                                    )}
                                />
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                Produto Ativo (Disponível)
                            </span>
                        </label>
                    </div>

                    {/* Histórico de Aquisições (Only on Edit) */}
                    {editingProduct && (
                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Package size={16} className="text-gray-400" />
                                Histórico de Aquisições (Compras)
                            </h3>
                            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                {isLoadingHistory ? (
                                    <div className="p-4 text-center text-sm text-gray-500">Carregando histórico...</div>
                                ) : (productPurchases[editingProduct.id] || []).length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">Nenhuma compra registrada.</div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 border-b border-gray-200 text-gray-600">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Data</th>
                                                <th className="px-3 py-2 font-medium">Fornecedor</th>
                                                <th className="px-3 py-2 font-medium text-center">Qtd</th>
                                                <th className="px-3 py-2 font-medium text-right">Custo Un.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {(productPurchases[editingProduct.id] || []).map(history => (
                                                <tr key={history.id} className="hover:bg-gray-100/50">
                                                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                                        {new Date(history.created_at).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-900 truncate max-w-[120px]" title={history.supplier}>
                                                        {history.supplier}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-900 text-center font-medium">
                                                        {history.quantity}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-900 text-right font-medium">
                                                        {formatCurrency(history.unit_cost)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

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
            
            <RegisterPurchaseModal 
                isOpen={showPurchaseModal} 
                onClose={() => setShowPurchaseModal(false)} 
            />
            <ImportExcelModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
            />
        </div>
    );
}
