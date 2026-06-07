import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ShoppingCart, Minus, Plus, Trash2, X } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useProductsStore } from '@/stores/productsStore';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { POSCheckoutModal } from '@/components/pos/POSCheckoutModal';
import { CashRegisterOpenModal } from '@/components/pos/CashRegisterOpenModal';
import { CashRegisterCloseModal } from '@/components/pos/CashRegisterCloseModal';
import { Receipt, type ReceiptData } from '@/components/pos/Receipt';
import { useCashRegisterStore } from '@/stores/cashRegisterStore';
import { isSameDay, parseISO, format } from 'date-fns';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';

export default function POS() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(() => localStorage.getItem('pos_last_category') || 'Todas');

    const handleCategoryChange = (cat: string) => {
        setActiveCategory(cat);
        localStorage.setItem('pos_last_category', cat);
    };
    const [showCheckout, setShowCheckout] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    const cart = useCartStore();
    const { products, categories, isLoading, fetchProducts } = useProductsStore();
    const { currentSession, fetchCurrentSession, isLoading: sessionLoading } = useCashRegisterStore();

    const [showOpenRegister, setShowOpenRegister] = useState(false);
    const [showCloseRegister, setShowCloseRegister] = useState(false);
    const [staleSessionAlert, setStaleSessionAlert] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCurrentSession();
    }, [fetchProducts, fetchCurrentSession]);

    // Check for stale session (open from previous day)
    useEffect(() => {
        if (currentSession && !isSameDay(new Date(), parseISO(currentSession.opened_at))) {
            setStaleSessionAlert(true);
        } else {
            setStaleSessionAlert(false);
        }
    }, [currentSession]);

    const handleStartCheckout = () => {
        if (!currentSession) {
            setShowOpenRegister(true);
            return;
        }
        setShowCheckout(true);
    };

    // FLV categories always appear first in the pills (case-insensitive match)
    const FLV_KEYS = ['FRUTAS', 'LEGUMES', 'VERDURAS'];
    const sortedCategories = [
        ...(categories.includes('Todas') ? ['Todas'] : []),
        ...FLV_KEYS.map(k => categories.find(c => c.toUpperCase() === k)).filter(Boolean) as string[],
        ...categories.filter(c => c !== 'Todas' && !FLV_KEYS.includes(c.toUpperCase()))
    ];

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchCategory =
                activeCategory === 'Todas' || p.category === activeCategory;
            const matchSearch = p.name
                .toLowerCase()
                .includes(search.toLowerCase());
            return matchCategory && matchSearch && p.is_active;
        });
    }, [search, activeCategory, products]);

    const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

    const handleCheckoutComplete = (receiptData: ReceiptData) => {
        setLastReceipt(receiptData);
        setShowCheckout(false);
        // Print receipt (desativado — reativar quando tiver impressora)
        // setTimeout(() => {
        //     window.print();
        //     cart.reset();
        //     setLastReceipt(null);
        // }, 200);
        cart.reset();
        setLastReceipt(null);
    };

    return (
        <div className="flex h-full">
            {/* ===== LEFT: Product Grid ===== */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <div className="sticky top-0 z-10 bg-white px-4 py-3 border-b border-gray-100 space-y-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                            PDV
                        </h1>
                        <div className="relative flex-1 max-w-md">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                            />
                        </div>

                        {/* Cash Register Status Badge/Button */}
                        <button
                            onClick={() => currentSession ? setShowCloseRegister(true) : setShowOpenRegister(true)}
                            className={cn(
                                "hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                                currentSession
                                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            )}
                        >
                            {currentSession ? <Unlock size={16} /> : <Lock size={16} />}
                            {currentSession ? "Caixa Aberto" : "Caixa Fechado"}
                        </button>

                        {/* Mobile cart toggle */}
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative lg:hidden p-2.5 rounded-xl bg-brand-600 text-white cursor-pointer"
                        >
                            <ShoppingCart size={20} />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {itemCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Stale Session Alert */}
                    {staleSessionAlert && currentSession && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-amber-800 animate-slide-down">
                            <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                            <div className="text-sm">
                                <span className="font-bold">Atenção:</span> O caixa está aberto desde {format(parseISO(currentSession.opened_at), "dd/MM 'às' HH:mm")}.
                                Por favor, feche o caixa do dia anterior antes de iniciar as vendas de hoje.
                                <button
                                    onClick={() => setShowCloseRegister(true)}
                                    className="ml-2 underline font-medium hover:text-amber-900"
                                >
                                    Fechar agora
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Category Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {sortedCategories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={cn(
                                    'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                                    activeCategory === cat
                                        ? 'bg-brand-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4" style={{ overscrollBehavior: 'none' }}>
                    {isLoading && products.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                            {filteredProducts.map((product) => {
                                const inCart = cart.items.find(
                                    (i) => i.product.id === product.id
                                );
                                const currentQty = inCart?.quantity || 0;
                                const remainingStock = Math.max(0, product.stock_qty - currentQty);

                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            if (remainingStock > 0) {
                                                cart.addItem(product);
                                            }
                                        }}
                                        disabled={remainingStock <= 0}
                                        className={cn(
                                            'group relative flex flex-col rounded-2xl border-2 bg-white p-3 text-left transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]',
                                            inCart
                                                ? 'border-brand-500 shadow-md shadow-brand-500/10'
                                                : 'border-transparent shadow-sm',
                                            remainingStock <= 0 && 'opacity-60 cursor-not-allowed bg-gray-50'
                                        )}
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 mb-3">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className={`h-full w-full object-cover transition-transform duration-300 ${remainingStock === 0 ? 'grayscale' : 'group-hover:scale-105'}`}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-gray-300">
                                                    <ShoppingCart size={32} />
                                                </div>
                                            )}
                                            {inCart && (
                                                <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold shadow-lg z-10">
                                                    {inCart.quantity}
                                                </div>
                                            )}
                                            {/* Stock Badge */}
                                            <div className={`absolute bottom-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm z-10 ${remainingStock === 0 ? 'bg-gray-800 text-white' : remainingStock < 5 ? 'bg-red-100 text-red-700' : 'bg-white/90 text-brand-700'}`}>
                                                {remainingStock === 0 ? 'Esgotado' : `${remainingStock} un`}
                                            </div>
                                        </div>
                                        {/* Info */}
                                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                                            {product.name}
                                        </p>
                                        <p className="mt-auto pt-2 text-lg font-bold text-brand-600">
                                            {formatCurrency(product.price)}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {!isLoading && filteredProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Search size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">Nenhum produto encontrado</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== Mobile Bottom Bar ===== */}
            {itemCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
                    <button
                        onClick={handleStartCheckout}
                        className="w-full flex items-center justify-between bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl px-5 py-3.5 transition-all cursor-pointer"
                    >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                {itemCount}
                            </span>
                            {itemCount === 1 ? '1 item' : `${itemCount} itens`}
                        </span>
                        <span className="text-sm font-bold">Finalizar Venda</span>
                        <span className="text-sm font-semibold">{formatCurrency(cart.getSubtotal())}</span>
                    </button>
                </div>
            )}

            {/* ===== RIGHT: Cart Sidebar (Desktop) ===== */}
            <div className="hidden lg:flex w-96 flex-col bg-white border-l border-gray-100">
                <CartSidebar
                    onFinalize={handleStartCheckout}
                />
            </div>

            {/* ===== Mobile Cart Overlay ===== */}
            {showCart && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setShowCart(false)}
                    />
                    <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white flex flex-col animate-slide-up shadow-2xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">Carrinho</h2>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <CartSidebar
                            onFinalize={() => {
                                setShowCart(false);
                                handleStartCheckout();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            <POSCheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                onComplete={handleCheckoutComplete}
            />

            {/* Hidden receipt for printing */}
            {lastReceipt && (
                <div ref={receiptRef}>
                    <Receipt data={lastReceipt} />
                </div>
            )}

            <CashRegisterOpenModal
                isOpen={showOpenRegister}
                onClose={() => setShowOpenRegister(false)}
                onSuccess={() => fetchCurrentSession()}
            />

            <CashRegisterCloseModal
                isOpen={showCloseRegister}
                onClose={() => setShowCloseRegister(false)}
                onSuccess={() => fetchCurrentSession()}
            />
        </div>
    );
}

// ===== Cart Sidebar Component =====
function CartSidebar({ onFinalize }: { onFinalize: () => void }) {
    const cart = useCartStore();

    if (cart.items.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400 p-6">
                <ShoppingCart size={48} className="mb-4 opacity-50" />
                <p className="font-medium">Carrinho vazio</p>
                <p className="text-sm">Clique em um produto para adicionar</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">
                    Carrinho ({cart.items.length})
                </h3>
                <button
                    onClick={cart.reset}
                    className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer"
                >
                    Limpar
                </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {cart.items.map((item) => (
                    <div
                        key={item.product.id}
                        className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 animate-fade-in"
                    >
                        {/* Thumbnail */}
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            {item.product.image_url ? (
                                <img
                                    src={item.product.image_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-400">
                                    <ShoppingCart size={16} />
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                                {item.product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                                {formatCurrency(item.product.price)} un.
                            </p>
                        </div>

                        {/* Qty controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() =>
                                    cart.updateQuantity(item.product.id, item.quantity - 1)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                {item.quantity === 1 ? (
                                    <Trash2 size={14} className="text-red-500" />
                                ) : (
                                    <Minus size={14} />
                                )}
                            </button>
                            <span className="w-8 text-center text-sm font-bold">
                                {item.quantity}
                            </span>
                            <button
                                onClick={() => {
                                    if (item.quantity < item.product.stock_qty) {
                                        cart.updateQuantity(item.product.id, item.quantity + 1);
                                    }
                                }}
                                disabled={item.quantity >= item.product.stock_qty}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-gray-600 transition-colors cursor-pointer ${item.quantity >= item.product.stock_qty ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Line total */}
                        <p className="w-20 text-right text-sm font-bold text-gray-900">
                            {formatCurrency(item.product.price * item.quantity)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Bottom summary */}
            <div className="border-t border-gray-100 px-4 py-4 space-y-3">
                <div className="flex items-center justify-between text-lg font-bold text-gray-900">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cart.getSubtotal())}</span>
                </div>
                <Button
                    onClick={onFinalize}
                    className="w-full"
                    size="lg"
                >
                    Finalizar Venda
                </Button>
            </div>
        </>
    );
}
