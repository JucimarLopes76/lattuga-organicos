import { useMemo, useEffect } from 'react';
import { ShoppingBag, Leaf, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import { Spinner } from '@/components/ui/Spinner';
import { useSeo } from '@/hooks/useSeo';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function Offers() {
    const { category } = useParams<{ category?: string }>();
    
    // SEO setup
    const seoTitle = category 
        ? `Ofertas de ${category.charAt(0).toUpperCase() + category.slice(1)} Orgânicos | Lattuga`
        : 'Ofertas da Semana | Lattuga Orgânicos';
        
    const seoDesc = category
        ? `Aproveite as melhores ofertas da semana para ${category} orgânicos. Frescos e direto da terra para sua mesa.`
        : 'Confira nossas ofertas da semana. Produtos orgânicos com preços especiais, cultivados com carinho para você.';

    useSeo({ title: seoTitle, description: seoDesc });

    const { products: allProducts, isLoading, fetchProducts } = useProductsStore();
    const { items: cartItems, addItem, updateQuantity, getSubtotal, getItemCount } = useOnlineCartStore();

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const offersByCategory = useMemo(() => {
        const offers = allProducts.filter(p => p.show_in_catalog && p.is_active && p.feature_badge === 'offer');
        
        let filteredOffers = offers;
        if (category) {
            filteredOffers = offers.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }

        // Group by category
        const groups: Record<string, typeof offers> = {};
        for (const p of filteredOffers) {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        }
        
        return groups;
    }, [allProducts, category]);

    const handleAdd = (product: any, setAddedId: any) => {
        addItem(product);
        setAddedId(product.id);
        setTimeout(() => setAddedId(null), 800);
    };

    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white p-8 md:p-12 mb-8">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Leaf size={24} />
                        <span className="text-sm font-medium text-red-100 uppercase tracking-wide">
                            Preços Especiais
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-2">
                        {category ? `Ofertas em ${category.charAt(0).toUpperCase() + category.slice(1)}` : 'Ofertas da Semana'}
                    </h1>
                    <p className="text-white/90 max-w-lg mb-4 text-lg">
                        As melhores oportunidades para você levar saúde para casa pagando menos!
                    </p>
                    <Link to="/" className="inline-flex items-center text-sm font-bold text-white bg-black/20 px-4 py-2 rounded-xl hover:bg-black/30 transition">
                        Ver catálogo completo <ArrowRight size={16} className="ml-2" />
                    </Link>
                </div>
                <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 right-20 h-20 w-20 rounded-full bg-white/5" />
            </div>

            {isLoading && allProducts.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <Spinner />
                </div>
            ) : Object.keys(offersByCategory).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <ShoppingBag size={48} className="mb-4 opacity-50 text-red-300" />
                    <p className="font-medium text-lg">Nenhuma oferta disponível {category ? 'nesta categoria' : 'no momento'}</p>
                    <Link to="/">
                        <Button className="mt-4" variant="outline">Voltar ao Catálogo</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.entries(offersByCategory).map(([catName, prods]) => (
                        <div key={catName}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-red-500 pb-1 pr-4 inline-block">{catName}</h2>
                                {!category && (
                                    <Link to={`/ofertas/${catName.toLowerCase()}`} className="text-sm font-semibold text-red-600 hover:text-red-700">
                                        Ver apenas {catName} &rsaquo;
                                    </Link>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {prods.map((product) => {
                                    const inCart = cartItems.find((i) => i.product.id === product.id);
                                    const currentQty = inCart?.quantity || 0;
                                    const remainingStock = Math.max(0, product.stock_qty - currentQty);

                                    return (
                                        <div key={product.id} className="group relative flex flex-col rounded-2xl bg-white shadow-sm hover:shadow-xl border border-red-100 overflow-hidden transition-all duration-300 hover:-translate-y-1">
                                            <div className="relative aspect-square overflow-hidden bg-gray-100">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className={`h-full w-full object-cover ${remainingStock === 0 ? 'grayscale' : 'group-hover:scale-110 transition-transform duration-500'}`} loading="lazy" />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-gray-300"><ShoppingBag size={40} /></div>
                                                )}
                                                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-red-600 text-xs font-bold text-white shadow-md animate-pulse">Oferta!</span>
                                                <span className={`absolute bottom-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm ${remainingStock === 0 ? 'bg-gray-800 text-white' : remainingStock < 5 ? 'bg-red-100 text-red-700' : 'bg-white/90 text-brand-700'}`}>
                                                    {remainingStock === 0 ? 'Esgotado' : `${remainingStock} un`}
                                                </span>
                                            </div>
                                            <div className="flex flex-1 flex-col p-4">
                                                <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">{product.name}</h3>
                                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description}</p>
                                                <div className="mt-auto">
                                                    <span className="text-xl font-bold text-red-600 block mb-2">{formatCurrency(product.price)}</span>
                                                    <Button 
                                                        onClick={() => {
                                                            if (remainingStock > 0) addItem(product);
                                                        }} 
                                                        disabled={remainingStock <= 0} 
                                                        className={`w-full ${remainingStock > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-200 text-gray-500'}`}
                                                    >
                                                        {remainingStock <= 0 ? 'Esgotado' : 'Adicionar'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Mobile Bottom Bar (copy from Catalog for cart status) */}
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
