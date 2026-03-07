import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function Cart() {
    const { items, updateQuantity, removeItem, getSubtotal } =
        useOnlineCartStore();

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center">
                <ShoppingBag size={64} className="mx-auto mb-6 text-gray-300" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Seu carrinho está vazio
                </h2>
                <p className="text-gray-500 mb-6">
                    Explore nosso catálogo e adicione produtos orgânicos frescos!
                </p>
                <Link to="/">
                    <Button size="lg">Ver Catálogo</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
            </h1>

            <div className="space-y-3 mb-6">
                {items.map((item) => (
                    <div
                        key={item.product.id}
                        className="flex flex-wrap items-center gap-3 sm:gap-4 rounded-2xl bg-white p-3 sm:p-4 shadow-sm border border-gray-100 animate-fade-in"
                    >
                        {/* Image */}
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.product.image_url ? (
                                <img
                                    src={item.product.image_url}
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                    <ShoppingBag size={24} />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 truncate text-sm sm:text-base">
                                {item.product.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {formatCurrency(item.product.price)} / un.
                            </p>
                        </div>

                        {/* Price on mobile - shown inline */}
                        <p className="font-bold text-brand-600 sm:hidden text-sm">
                            {formatCurrency(item.product.price * item.quantity)}
                        </p>

                        {/* Qty */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    updateQuantity(item.product.id, item.quantity - 1)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                            >
                                {item.quantity === 1 ? (
                                    <Trash2 size={14} className="text-red-500" />
                                ) : (
                                    <Minus size={14} />
                                )}
                            </button>
                            <span className="w-8 text-center font-bold text-gray-900">
                                {item.quantity}
                            </span>
                            <button
                                onClick={() =>
                                    updateQuantity(item.product.id, item.quantity + 1)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Total - desktop */}
                        <p className="hidden sm:block w-24 text-right font-bold text-brand-600">
                            {formatCurrency(item.product.price * item.quantity)}
                        </p>

                        {/* Remove - desktop */}
                        <button
                            onClick={() => removeItem(item.product.id)}
                            className="hidden sm:block p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between text-xl font-bold text-gray-900 mb-4">
                    <span>Subtotal</span>
                    <span className="text-brand-600">
                        {formatCurrency(getSubtotal())}
                    </span>
                </div>
                <Link to="/checkout">
                    <Button className="w-full" size="lg" rightIcon={<ArrowRight size={18} />}>
                        Finalizar Pedido
                    </Button>
                </Link>
            </div>
        </div>
    );
}
