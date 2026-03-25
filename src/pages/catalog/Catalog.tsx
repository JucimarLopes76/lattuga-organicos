import { useState, useMemo, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Check, Search, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useProductsStore } from '@/stores/productsStore';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import { formatCurrency, cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { useSeo } from '@/hooks/useSeo';
import type { Product } from '@/types';

export default function Catalog() {
    useSeo({
        title: 'Catálogo de Produtos | Lattuga Orgânicos',
        description: 'Explore nossa seleção de produtos orgânicos frescos, direto da terra para a sua mesa.'
    });
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todas');
    const addItem = useOnlineCartStore((s) => s.addItem);
    const updateQuantity = useOnlineCartStore((s) => s.updateQuantity);
    const cartItems = useOnlineCartStore((s) => s.items);
    const getSubtotal = useOnlineCartStore((s) => s.getSubtotal);
    const getItemCount = useOnlineCartStore((s) => s.getItemCount);
    const [addedId, setAddedId] = useState<string | null>(null);
    const { products: allProducts, categories, isLoading, fetchProducts } = useProductsStore();

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filteredProducts = useMemo(() => {
        return allProducts.filter((p) => {
            if (!p.show_in_catalog || !p.is_active) return false;
            const matchCat =
                activeCategory === 'Todas' || p.category === activeCategory;
            const matchSearch = p.name
                .toLowerCase()
                .includes(search.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [search, activeCategory, allProducts]);

    const offers = useMemo(() => filteredProducts.filter(p => p.feature_badge === 'offer'), [filteredProducts]);
    const highlights = useMemo(() => filteredProducts.filter(p => p.feature_badge === 'highlight'), [filteredProducts]);
    const normalProducts = useMemo(() => filteredProducts.filter(p => !p.feature_badge || p.feature_badge === 'none'), [filteredProducts]);

    const handleAdd = (product: Product) => {
        addItem(product);
        setAddedId(product.id);
        setTimeout(() => setAddedId(null), 800);
    };

    const renderGrid = (title: string | null, list: Product[], badgeText?: string, badgeColor?: string) => {
        if (list.length === 0) return null;
        return (
            <div className="mb-10">
                {title && <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {list.map((product) => {
                        const inCart = cartItems.find((i) => i.product.id === product.id);
                        const justAdded = addedId === product.id;
                        const currentQty = inCart?.quantity || 0;
                        const remainingStock = Math.max(0, product.stock_qty - currentQty);

                        return (
                            <div
                                key={product.id}
                                className={cn(
                                    "group relative flex flex-col rounded-2xl bg-white shadow-sm hover:shadow-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1",
                                    badgeText === 'Oferta' ? 'border-red-200 shadow-red-100/50' : badgeText === 'Destaque' ? 'border-amber-200' : 'border-gray-100'
                                )}
                            >
                                <div className="relative aspect-square overflow-hidden bg-gray-100">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className={`h-full w-full object-cover transition-transform duration-500 ${remainingStock === 0 ? 'grayscale' : 'group-hover:scale-110'}`}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-gray-300">
                                            <ShoppingBag size={40} />
                                        </div>
                                    )}
                                    {badgeText && (
                                        <span className={cn("absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md z-10", badgeColor)}>
                                            {badgeText === 'Oferta' ? 'Oferta!' : 'Destaque'}
                                        </span>
                                    )}
                                    <span className={`absolute bottom-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm z-10 ${remainingStock === 0 ? 'bg-gray-800 text-white' : remainingStock < 5 ? 'bg-red-100 text-red-700' : 'bg-white/90 text-brand-700'}`}>
                                        {remainingStock === 0 ? 'Esgotado' : `${remainingStock} un`}
                                    </span>
                                </div>

                                <div className="flex flex-1 flex-col p-4">
                                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
                                        {product.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                        {product.description}
                                    </p>
                                    <div className="mt-auto">
                                        <span className={cn("text-lg font-bold block mb-2", badgeText === 'Oferta' ? 'text-red-600' : 'text-brand-600')}>
                                            {formatCurrency(product.price)}
                                        </span>

                                        {inCart ? (
                                            <div className={cn("flex items-center justify-between rounded-lg p-1", badgeText === 'Oferta' ? 'bg-red-50' : 'bg-brand-50')}>
                                                <button
                                                    onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                                                    className={cn("h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-md bg-white shadow-sm hover:text-red-500 transition-colors cursor-pointer", badgeText === 'Oferta' ? 'text-red-600' : 'text-brand-600')}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className={cn("text-sm font-bold min-w-[20px] text-center", badgeText === 'Oferta' ? 'text-red-900' : 'text-brand-900')}>
                                                    {inCart.quantity}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        if (remainingStock > 0) updateQuantity(product.id, inCart.quantity + 1);
                                                    }}
                                                    disabled={remainingStock <= 0}
                                                    className={cn("h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-md text-white shadow-sm transition-colors cursor-pointer", remainingStock > 0 ? (badgeText === 'Oferta' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700') : 'bg-gray-300 cursor-not-allowed')}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleAdd(product)}
                                                disabled={remainingStock <= 0}
                                                className={cn(
                                                    'flex h-9 w-full items-center justify-center rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium gap-1',
                                                    remainingStock <= 0
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : justAdded
                                                            ? (badgeText === 'Oferta' ? 'bg-red-600 text-white scale-[1.02]' : 'bg-brand-600 text-white scale-[1.02]')
                                                            : (badgeText === 'Oferta' ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white active:scale-95' : 'bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white active:scale-95')
                                                )}
                                            >
                                                {remainingStock <= 0 ? (
                                                    <span className="text-xs font-bold">Esgotado</span>
                                                ) : justAdded ? (
                                                    <><Check size={16} /> <span>Adicionado</span></>
                                                ) : (
                                                    <><Plus size={16} /> <span>Adicionar</span></>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 text-white p-8 md:p-12 mb-8">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Leaf size={24} />
                        <span className="text-sm font-medium text-brand-200 uppercase tracking-wide">
                            Produtos Orgânicos
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                        Direto da terra para sua mesa
                    </h1>
                    <p className="text-brand-100 max-w-lg">
                        Produtos frescos, saudáveis e cultivados com carinho. Faça seu
                        pedido e receba em casa ou retire na loja.
                    </p>
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 right-20 h-20 w-20 rounded-full bg-white/5" />
            </div>

            {/* Search + Filters */}
            <div className="space-y-4 mb-6">
                <div className="relative max-w-md">
                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none shadow-sm transition-all"
                    />
                </div>

                <div className="flex flex-wrap gap-2 pb-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                'px-5 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                                activeCategory === cat
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Product Grid */}
                <div className="flex-1 w-full">
                    
                    {renderGrid(
                        offers.length > 0 ? "🔥 Ofertas da Semana" : null, 
                        offers, 
                        "Oferta", 
                        "bg-red-600 animate-pulse"
                    )}
                    
                    {renderGrid(
                        highlights.length > 0 ? "⭐ Destaques Lattuga" : null, 
                        highlights, 
                        "Destaque", 
                        "bg-amber-500"
                    )}
                    
                    {renderGrid(
                        offers.length > 0 || highlights.length > 0 ? "🌿 Outros Produtos" : null, 
                        normalProducts
                    )}

                    {isLoading && allProducts.length === 0 && (
                        <div className="flex items-center justify-center py-20">
                            <Spinner />
                        </div>
                    )}

                    {!isLoading && filteredProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Search size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">Nenhum produto encontrado</p>
                        </div>
                    )}
                </div>

                {/* Desktop Sidebar */}
                <div className="hidden lg:block w-80 sticky top-24 shrink-0 space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-4 text-brand-700">
                            <ShoppingBag size={20} />
                            <h2 className="font-bold text-lg">Seu Carrinho</h2>
                        </div>

                        {cartItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <p className="text-sm">Seu carrinho está vazio</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 mb-4 custom-scrollbar">
                                    {cartItems.map((item) => (
                                        <div key={item.product.id} className="flex gap-3 items-start">
                                            <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                                {item.product.image_url && (
                                                    <img src={item.product.image_url} className="h-full w-full object-cover" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                                                <p className="text-xs text-brand-600 font-semibold">{formatCurrency(item.product.price)}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="text-gray-400 hover:text-red-500 p-0.5">
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="text-gray-400 hover:text-brand-600 p-0.5">
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">
                                                {formatCurrency(item.product.price * item.quantity)}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-gray-100 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm text-gray-500">Total</span>
                                        <span className="text-xl font-bold text-brand-700">{formatCurrency(getSubtotal())}</span>
                                    </div>
                                    <Link to="/checkout" className="block w-full">
                                        <Button className="w-full">Finalizar Pedido</Button>
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar */}
            {cartItems.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 animate-slide-up">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <p className="text-xs text-gray-500">Total</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-gray-900">{formatCurrency(getSubtotal())}</span>
                                <span className="text-sm text-gray-400">/ {getItemCount()} itens</span>
                            </div>
                        </div>
                        <Link to="/cart">
                            <Button size="lg" className="px-8 shadow-brand-500/20 shadow-lg" leftIcon={<ShoppingBag size={20} />}>
                                Ver Carrinho
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
