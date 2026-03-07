import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
    User,
    MapPin,
    CreditCard,
    Store,
    Truck,
    QrCode,
    CheckCircle2,
    MessageCircle,
} from 'lucide-react';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import { useOnlineSessionStore } from '@/stores/onlineSessionStore';
import { useCustomersStore } from '@/stores/customersStore';
import { useOrdersStore } from '@/stores/ordersStore';
import { formatCurrency, generateWhatsAppLink, generateOrderSummary } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import type { DeliveryMethod, PaymentMethod } from '@/types';

type Step = 'info' | 'delivery' | 'payment' | 'confirm';

export default function Checkout() {
    const navigate = useNavigate();
    const { items, getSubtotal, reset } = useOnlineCartStore();
    const { customer, setCustomer } = useOnlineSessionStore();
    const findCustomerByPhone = useCustomersStore((s) => s.findCustomerByPhone);
    const createCustomer = useCustomersStore((s) => s.createCustomer);
    const addOrder = useOrdersStore((s) => s.addOrder);
    const [step, setStep] = useState<Step>('info');
    const [loading, setLoading] = useState(false);

    // Form state - initialize from session
    const [name, setName] = useState(customer.name);
    const [phone, setPhone] = useState(customer.phone);
    const [email, setEmail] = useState(customer.email);
    const [address, setAddress] = useState(customer.address);
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [payNow, setPayNow] = useState(true);

    // Auto-update session when fields change
    useEffect(() => {
        setCustomer({ name, phone, email, address });
    }, [name, phone, email, address, setCustomer]);

    // Lookup customer on mount or when phone changes (debounced could be better, but simple for now)
    useEffect(() => {
        const lookupCustomer = async () => {
            if (phone.length >= 10) { // arbitrary length check
                const found = await findCustomerByPhone(phone);
                if (found) {
                    // Only fill if local fields are empty or match
                    if (!email) setEmail(found.email || '');
                    if (!address) setAddress(found.address || '');
                    if (!name) setName(found.name);
                }
            }
        };
        // Trigger lookup only if we have a phone and haven't fully filled details yet
        if (phone && (!email || !address)) {
            lookupCustomer();
        }
    }, [phone, findCustomerByPhone]); // eslint-disable-line react-hooks/exhaustive-deps


    const subtotal = getSubtotal();
    const storeAddress = import.meta.env.VITE_STORE_ADDRESS || 'Rua das Hortaliças, 123 - Centro';
    const pixKey = import.meta.env.VITE_PIX_KEY || 'pix@lattugaorganicos.com.br';
    const whatsAppPhone = import.meta.env.VITE_WHATSAPP_PHONE || '5511999999999';

    if (items.length === 0) {
        navigate('/cart');
        return null;
    }

    const handleComplete = async () => {
        setLoading(true);

        // 1. Ensure customer exists or create/update
        let customerId = null;

        // Try to find again to be sure
        const existing = await findCustomerByPhone(phone);

        if (existing) {
            customerId = existing.id;
            // Optionally update address if changed? For now, we just use the ID.
        } else {
            // Create new customer
            // We can't easily get the ID back from createCustomer current implementation void return
            // But let's assume valid flow. 
            // Ideally stores should return the Created ID. 
            // For now, we will skip hard linking via ID if not found, OR we modify store. 
            // But wait, the task said "handled transparently".
            // Let's just create it. The order will record customer details textually if needed?
            // Actually `orders` table has `customer_id`.
            // Let's rely on the fact that `addOrder` currently allows `customer_id: null`.
            // But we want to register. 
            // To fix this properly without changing too much, let's just create raw.
            await createCustomer({ name, phone, email, address });
            // And try to find it immediately? Or just proceed.
            const newlyCreated = await findCustomerByPhone(phone);
            if (newlyCreated) customerId = newlyCreated.id;
        }

        // Save to Supabase
        const orderId = await addOrder(
            {
                customer_id: customerId,
                type: 'online',
                status: 'pending',
                delivery_method: deliveryMethod,
                payment_method: payNow ? 'pix' : paymentMethod,
                total_amount: subtotal,
                discount_amount: 0,
                surcharge_amount: 0,
                delivery_address: deliveryMethod === 'delivery' ? address : null,
            },
            items.map((i) => ({
                product_id: i.product.id,
                quantity: i.quantity,
                unit_price: i.product.price,
                productName: i.product.name,
                productCategory: i.product.category,
            }))
        );

        if (!orderId) {
            setLoading(false);
            alert('Erro ao criar pedido. Tente novamente.');
            return;
        }

        // Generate WhatsApp message
        const summary = generateOrderSummary(
            orderId,
            items.map((i) => ({
                name: i.product.name,
                quantity: i.quantity,
                unitPrice: i.product.price,
            })),
            subtotal,
            deliveryMethod,
            paymentMethod,
            name,
            deliveryMethod === 'delivery' ? address : null
        );

        const waLink = generateWhatsAppLink(whatsAppPhone, summary);

        // Reset cart & redirect
        reset();
        window.open(waLink, '_blank');
        setLoading(false);
        navigate('/');
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
                {(['info', 'delivery', 'payment', 'confirm'] as Step[]).map(
                    (s, idx) => (
                        <div key={s} className="flex items-center gap-2 flex-1">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${step === s
                                    ? 'bg-brand-600 text-white'
                                    : idx <
                                        ['info', 'delivery', 'payment', 'confirm'].indexOf(step)
                                        ? 'bg-brand-200 text-brand-700'
                                        : 'bg-gray-200 text-gray-500'
                                    }`}
                            >
                                {idx + 1}
                            </div>
                            {idx < 3 && (
                                <div className="flex-1 h-0.5 bg-gray-200 rounded">
                                    <div
                                        className="h-full bg-brand-400 rounded transition-all"
                                        style={{
                                            width:
                                                idx <
                                                    ['info', 'delivery', 'payment', 'confirm'].indexOf(step)
                                                    ? '100%'
                                                    : '0%',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Step 1: Customer Info */}
            {step === 'info' && (
                <div className="animate-fade-in space-y-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Seus Dados</h2>
                            <p className="text-sm text-gray-500">
                                Precisamos de algumas informações
                            </p>
                        </div>
                    </div>

                    <Input
                        label="Nome completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome"
                        required
                    />
                    <Input
                        label="Telefone (WhatsApp)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        required
                    />
                    <Input
                        label="E-mail (opcional)"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                    />

                    <Button
                        onClick={() => setStep('delivery')}
                        className="w-full"
                        size="lg"
                        disabled={!name || !phone}
                    >
                        Continuar
                    </Button>
                </div>
            )}

            {/* Step 2: Delivery */}
            {step === 'delivery' && (
                <div className="animate-fade-in space-y-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Entrega</h2>
                            <p className="text-sm text-gray-500">Como deseja receber?</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setDeliveryMethod('pickup')}
                            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all cursor-pointer ${deliveryMethod === 'pickup'
                                ? 'border-brand-500 bg-brand-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Store
                                size={28}
                                className={
                                    deliveryMethod === 'pickup'
                                        ? 'text-brand-600'
                                        : 'text-gray-400'
                                }
                            />
                            <span className="font-semibold text-sm text-gray-800">
                                Retirada
                            </span>
                            <span className="text-xs text-gray-500">Na loja</span>
                        </button>
                        <button
                            onClick={() => setDeliveryMethod('delivery')}
                            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all cursor-pointer ${deliveryMethod === 'delivery'
                                ? 'border-brand-500 bg-brand-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Truck
                                size={28}
                                className={
                                    deliveryMethod === 'delivery'
                                        ? 'text-brand-600'
                                        : 'text-gray-400'
                                }
                            />
                            <span className="font-semibold text-sm text-gray-800">
                                Delivery
                            </span>
                            <span className="text-xs text-gray-500">Em casa</span>
                        </button>
                    </div>

                    {deliveryMethod === 'pickup' && (
                        <div className="rounded-xl bg-brand-50 p-4 text-sm">
                            <p className="font-semibold text-brand-800 mb-1">
                                📍 Endereço da loja:
                            </p>
                            <p className="text-brand-700">{storeAddress}</p>
                        </div>
                    )}

                    {deliveryMethod === 'delivery' && (
                        <Input
                            label="Endereço de entrega"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Rua, número, complemento, bairro, cidade, CEP"
                            icon={<MapPin size={16} />}
                            required
                        />
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setStep('info')}
                            className="flex-1"
                        >
                            Voltar
                        </Button>
                        <Button
                            onClick={() => setStep('payment')}
                            className="flex-1"
                            size="lg"
                            disabled={deliveryMethod === 'delivery' && !address}
                        >
                            Continuar
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Payment */}
            {step === 'payment' && (
                <div className="animate-fade-in space-y-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Pagamento</h2>
                            <p className="text-sm text-gray-500">Como deseja pagar?</p>
                        </div>
                    </div>

                    {/* Pay now or on delivery */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => {
                                setPayNow(true);
                                setPaymentMethod('pix');
                            }}
                            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all cursor-pointer ${payNow
                                ? 'border-brand-500 bg-brand-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <QrCode
                                size={28}
                                className={payNow ? 'text-brand-600' : 'text-gray-400'}
                            />
                            <span className="font-semibold text-sm text-gray-800">
                                Pagar Agora
                            </span>
                            <span className="text-xs text-gray-500">Via Pix</span>
                        </button>
                        <button
                            onClick={() => setPayNow(false)}
                            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all cursor-pointer ${!payNow
                                ? 'border-brand-500 bg-brand-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <CreditCard
                                size={28}
                                className={!payNow ? 'text-brand-600' : 'text-gray-400'}
                            />
                            <span className="font-semibold text-sm text-gray-800">
                                Na Entrega
                            </span>
                            <span className="text-xs text-gray-500">
                                Pix, Débito, Crédito
                            </span>
                        </button>
                    </div>

                    {payNow && (
                        <div className="rounded-xl bg-brand-50 p-5 text-center space-y-3">
                            <div className="mx-auto h-32 w-32 rounded-xl bg-white flex items-center justify-center border-2 border-dashed border-brand-300">
                                <QrCode size={64} className="text-brand-400" />
                            </div>
                            <p className="text-sm text-gray-600">
                                Chave Pix:{' '}
                                <span className="font-mono font-bold text-brand-700">
                                    {pixKey}
                                </span>
                            </p>
                            <p className="text-xs text-gray-500">
                                Envie o comprovante pelo WhatsApp
                            </p>
                        </div>
                    )}

                    {!payNow && (
                        <Select
                            label="Forma de pagamento"
                            options={[
                                { value: 'pix', label: 'Pix' },
                                { value: 'debit', label: 'Cartão de Débito' },
                                { value: 'credit', label: 'Cartão de Crédito' },
                                { value: 'cash', label: 'Dinheiro' },
                            ]}
                            value={paymentMethod}
                            onChange={(e) =>
                                setPaymentMethod(e.target.value as PaymentMethod)
                            }
                        />
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setStep('delivery')}
                            className="flex-1"
                        >
                            Voltar
                        </Button>
                        <Button
                            onClick={() => setStep('confirm')}
                            className="flex-1"
                            size="lg"
                        >
                            Revisar Pedido
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 'confirm' && (
                <div className="animate-fade-in space-y-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                Confirmar Pedido
                            </h2>
                            <p className="text-sm text-gray-500">
                                Revise seu pedido antes de enviar
                            </p>
                        </div>
                    </div>

                    {/* Summary card */}
                    <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                        {/* Customer */}
                        <div className="px-5 py-4 border-b border-gray-100">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                Cliente
                            </p>
                            <p className="font-semibold text-gray-900">{name}</p>
                            <p className="text-sm text-gray-600">{phone}</p>
                        </div>

                        {/* Delivery */}
                        <div className="px-5 py-4 border-b border-gray-100">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                Entrega
                            </p>
                            <p className="font-semibold text-gray-900">
                                {deliveryMethod === 'pickup'
                                    ? '🏪 Retirada na loja'
                                    : `🚚 Delivery`}
                            </p>
                            {deliveryMethod === 'delivery' && (
                                <p className="text-sm text-gray-600">{address}</p>
                            )}
                        </div>

                        {/* Payment */}
                        <div className="px-5 py-4 border-b border-gray-100">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                Pagamento
                            </p>
                            <p className="font-semibold text-gray-900">
                                {payNow
                                    ? '💰 Pix (antecipado)'
                                    : `💳 ${paymentMethod === 'pix'
                                        ? 'Pix'
                                        : paymentMethod === 'debit'
                                            ? 'Débito'
                                            : 'Crédito'
                                    } na entrega`}
                            </p>
                        </div>

                        {/* Items */}
                        <div className="px-5 py-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                                Itens ({items.length})
                            </p>
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <div
                                        key={item.product.id}
                                        className="flex justify-between text-sm"
                                    >
                                        <span className="text-gray-600">
                                            {item.quantity}x {item.product.name}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {formatCurrency(item.product.price * item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-lg font-bold text-brand-700">
                                <span>Total</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setStep('payment')}
                            className="flex-1"
                        >
                            Voltar
                        </Button>
                        <Button
                            onClick={handleComplete}
                            className="flex-1"
                            size="lg"
                            isLoading={loading}
                            leftIcon={<MessageCircle size={18} />}
                        >
                            Enviar via WhatsApp
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
