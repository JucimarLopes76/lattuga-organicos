import { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, UserCheck, SkipForward, MapPin, Truck, Store } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useOrdersStore } from '@/stores/ordersStore';
import { useCustomersStore } from '@/stores/customersStore';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import type { ReceiptData } from '@/components/pos/Receipt';
import type { PaymentMethod, DiscountType, Customer, DeliveryMethod } from '@/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (receiptData: ReceiptData) => void;
}

const paymentOptions = [
    { value: 'pix', label: 'Pix' },
    { value: 'debit', label: 'Débito' },
    { value: 'credit', label: 'Crédito' },
    { value: 'cash', label: 'Dinheiro' },
];

type Step = 'customer' | 'delivery' | 'payment';

interface AddressForm {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    referencia: string;
}

const emptyAddress: AddressForm = {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    referencia: '',
};

function formatAddress(a: AddressForm): string {
    const parts = [
        a.logradouro,
        a.numero ? `nº ${a.numero}` : '',
        a.complemento,
        a.bairro,
        a.cidade,
        a.cep,
    ].filter(Boolean);
    const addr = parts.join(', ');
    return a.referencia ? `${addr} (Ref: ${a.referencia})` : addr;
}

export function POSCheckoutModal({ isOpen, onClose, onComplete }: Props) {
    const cart = useCartStore();
    const addOrder = useOrdersStore((s) => s.addOrder);
    const { customers, fetchCustomers, createCustomer, updateCustomer } = useCustomersStore();

    // Steps
    const [step, setStep] = useState<Step>('customer');

    // Customer step
    const [phoneSearch, setPhoneSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showRegister, setShowRegister] = useState(false);
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [registering, setRegistering] = useState(false);

    // Delivery step
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
    const [address, setAddress] = useState<AddressForm>(emptyAddress);
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState('');

    // Payment step
    const [discountType, setDiscountType] = useState<DiscountType>('value');
    const [discountValue, setDiscountValue] = useState(0);
    const [surcharge, setSurcharge] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [loading, setLoading] = useState(false);

    // Fetch customers when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            setStep('customer');
            setPhoneSearch('');
            setSelectedCustomer(null);
            setShowRegister(false);
            setRegName('');
            setRegPhone('');
            setRegEmail('');
            setDeliveryMethod('pickup');
            setAddress(emptyAddress);
            setCepError('');
        }
    }, [isOpen, fetchCustomers]);

    // Search results
    const searchResults = useMemo(() => {
        if (phoneSearch.length < 3) return [];
        const query = phoneSearch.replace(/\D/g, '');
        return customers.filter((c) => {
            const phone = (c.phone || '').replace(/\D/g, '');
            return phone.includes(query);
        });
    }, [phoneSearch, customers]);

    const subtotal = cart.getSubtotal();
    const discountAmount =
        discountType === 'percentage'
            ? (subtotal * discountValue) / 100
            : discountValue;
    const total = Math.max(0, subtotal - discountAmount + surcharge);

    // ---- Customer handlers ----
    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setPhoneSearch('');
        setShowRegister(false);
    };

    const handleSkipCustomer = () => {
        setSelectedCustomer(null);
        setStep('delivery');
    };

    const handleContinueWithCustomer = () => {
        setStep('delivery');
    };

    const handleStartRegister = () => {
        const digits = phoneSearch.replace(/\D/g, '');
        setRegPhone(digits);
        setRegName('');
        setRegEmail('');
        setShowRegister(true);
    };

    const handleRegister = async () => {
        setRegistering(true);
        await createCustomer({
            name: regName,
            phone: regPhone || null,
            email: regEmail || null,
            address: null,
        });
        await fetchCustomers();
        setRegistering(false);
        setShowRegister(false);
        const digits = regPhone.replace(/\D/g, '');
        const found = useCustomersStore.getState().customers.find(
            (c) => (c.phone || '').replace(/\D/g, '') === digits
        );
        if (found) setSelectedCustomer(found);
        setPhoneSearch('');
    };

    // ---- CEP lookup ----
    const handleCepLookup = async () => {
        const cep = address.cep.replace(/\D/g, '');
        if (cep.length !== 8) {
            setCepError('CEP deve ter 8 dígitos');
            return;
        }
        setCepLoading(true);
        setCepError('');
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (data.erro) {
                setCepError('CEP não encontrado');
            } else {
                setAddress((prev) => ({
                    ...prev,
                    logradouro: data.logradouro || prev.logradouro,
                    bairro: data.bairro || prev.bairro,
                    cidade: data.localidade || prev.cidade,
                }));
            }
        } catch {
            setCepError('Erro ao buscar CEP');
        } finally {
            setCepLoading(false);
        }
    };

    const handleDeliveryContinue = () => {
        setStep('payment');
    };

    // ---- Confirm ----
    const handleConfirm = async () => {
        setLoading(true);

        const deliveryAddr = deliveryMethod === 'delivery' ? formatAddress(address) : null;

        const receiptData: ReceiptData = {
            items: cart.items.map((i) => ({
                name: i.product.name,
                quantity: i.quantity,
                unitPrice: i.product.price,
                total: i.product.price * i.quantity,
            })),
            subtotal,
            discountAmount,
            surcharge,
            total,
            paymentMethod,
            date: new Date(),
            customerName: selectedCustomer?.name || null,
            customerPhone: selectedCustomer?.phone || null,
            deliveryMethod,
            deliveryAddress: deliveryAddr,
        };

        await addOrder(
            {
                customer_id: selectedCustomer?.id || null,
                type: 'pdv',
                status: 'completed',
                delivery_method: deliveryMethod,
                payment_method: paymentMethod,
                total_amount: total,
                discount_amount: discountAmount,
                surcharge_amount: surcharge,
                delivery_address: deliveryAddr,
            },
            cart.items.map((i) => ({
                product_id: i.product.id,
                quantity: i.quantity,
                unit_price: i.product.price,
                productName: i.product.name,
                productCategory: i.product.category,
            }))
        );

        // Save address to customer if delivery + customer selected
        if (deliveryMethod === 'delivery' && selectedCustomer && deliveryAddr) {
            await updateCustomer(selectedCustomer.id, { address: deliveryAddr });
        }

        setLoading(false);
        setDiscountValue(0);
        setSurcharge(0);
        setPaymentMethod('pix');
        setSelectedCustomer(null);
        onComplete(receiptData);
    };

    const handleClose = () => {
        setStep('customer');
        setSelectedCustomer(null);
        setShowRegister(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Finalizar Venda" size="lg">
            {/* ======== STEP 1: Customer Selection ======== */}
            {step === 'customer' && (
                <div className="space-y-4 animate-fade-in">
                    <p className="text-sm text-gray-500">
                        Busque o cliente pelo telefone, cadastre um novo, ou prossiga sem cliente.
                    </p>

                    {selectedCustomer && (
                        <div className="flex items-center gap-3 rounded-xl bg-brand-50 border border-brand-200 p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600 font-bold text-sm">
                                {selectedCustomer.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{selectedCustomer.name}</p>
                                <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                            </div>
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer"
                            >
                                Remover
                            </button>
                        </div>
                    )}

                    {!selectedCustomer && !showRegister && (
                        <>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por telefone..."
                                    value={phoneSearch}
                                    onChange={(e) => setPhoneSearch(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            {phoneSearch.length >= 3 && (
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {searchResults.length > 0 ? (
                                        searchResults.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => handleSelectCustomer(c)}
                                                className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50 transition cursor-pointer text-left"
                                            >
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold text-sm flex-shrink-0">
                                                    {c.name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
                                                    <p className="text-xs text-gray-500">{c.phone}</p>
                                                </div>
                                                <UserCheck size={16} className="text-brand-500 ml-auto flex-shrink-0" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-gray-400 mb-3">Nenhum cliente encontrado</p>
                                            <Button variant="outline" size="sm" leftIcon={<UserPlus size={16} />} onClick={handleStartRegister}>
                                                Cadastrar Novo
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {showRegister && (
                        <div className="space-y-3 rounded-xl border border-gray-200 p-4 animate-fade-in">
                            <h4 className="text-sm font-semibold text-gray-700">Cadastro Rápido</h4>
                            <Input label="Nome" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Nome completo" required />
                            <Input label="Telefone (com DDD)" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="11999999999" required />
                            <Input label="E-mail" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="email@exemplo.com" />
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowRegister(false)} className="flex-1">Cancelar</Button>
                                <Button size="sm" onClick={handleRegister} disabled={!regName || !regPhone} isLoading={registering} className="flex-1">Cadastrar</Button>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button variant="ghost" onClick={handleClose} className="flex-1">Cancelar</Button>
                        <Button variant="outline" onClick={handleSkipCustomer} className="flex-1" leftIcon={<SkipForward size={16} />}>Sem Cliente</Button>
                        {selectedCustomer && (
                            <Button onClick={handleContinueWithCustomer} className="flex-1">Continuar</Button>
                        )}
                    </div>
                </div>
            )}

            {/* ======== STEP 2: Delivery Method ======== */}
            {step === 'delivery' && (
                <div className="space-y-4 animate-fade-in">
                    {selectedCustomer && (
                        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs">
                            <UserCheck size={12} className="text-brand-600" />
                            <span className="text-gray-700">Cliente: <strong>{selectedCustomer.name}</strong></span>
                        </div>
                    )}

                    <p className="text-sm text-gray-500">Como o cliente vai receber o pedido?</p>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { setDeliveryMethod('pickup'); setAddress(emptyAddress); }}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${deliveryMethod === 'pickup'
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                        >
                            <Store size={24} />
                            <span className="text-sm font-medium">Retira na Loja</span>
                        </button>
                        <button
                            onClick={() => {
                                setDeliveryMethod('delivery');
                                // Auto-fill from customer's saved address if available
                                if (selectedCustomer?.address && address.logradouro === '') {
                                    const saved = selectedCustomer.address;
                                    // Try to extract CEP (8 digits pattern like 00000-000 or 00000000)
                                    const cepMatch = saved.match(/(\d{5}-?\d{3})/);
                                    // Try to extract 'nº XXX' pattern
                                    const numMatch = saved.match(/nº\s*(\S+)/i);
                                    // Simple heuristic: fill logradouro with the full saved string so user can edit
                                    setAddress((prev) => ({
                                        ...prev,
                                        cep: cepMatch ? cepMatch[1] : '',
                                        logradouro: saved.replace(/,?\s*nº\s*\S+/i, '').replace(/,?\s*\d{5}-?\d{3}/g, '').replace(/\s*\(Ref:.*\)$/i, '').split(',')[0]?.trim() || saved,
                                        numero: numMatch ? numMatch[1].replace(',', '') : '',
                                    }));
                                }
                            }}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${deliveryMethod === 'delivery'
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                        >
                            <Truck size={24} />
                            <span className="text-sm font-medium">Entrega</span>
                        </button>
                    </div>

                    {/* Address form for delivery */}
                    {deliveryMethod === 'delivery' && (
                        <div className="space-y-2.5 animate-fade-in">
                            {/* CEP row */}
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">CEP</label>
                                    <input
                                        type="text"
                                        maxLength={9}
                                        value={address.cep}
                                        onChange={(e) => setAddress((p) => ({ ...p, cep: e.target.value }))}
                                        placeholder="00000-000"
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCepLookup}
                                    isLoading={cepLoading}
                                    leftIcon={<Search size={14} />}
                                >
                                    Buscar
                                </Button>
                            </div>
                            {cepError && <p className="text-xs text-red-500">{cepError}</p>}

                            {/* Logradouro + Numero */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Logradouro</label>
                                    <input
                                        type="text"
                                        value={address.logradouro}
                                        onChange={(e) => setAddress((p) => ({ ...p, logradouro: e.target.value }))}
                                        placeholder="Rua, Av..."
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Número</label>
                                    <input
                                        type="text"
                                        value={address.numero}
                                        onChange={(e) => setAddress((p) => ({ ...p, numero: e.target.value }))}
                                        placeholder="Nº"
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Complemento + Bairro */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Complemento</label>
                                    <input
                                        type="text"
                                        value={address.complemento}
                                        onChange={(e) => setAddress((p) => ({ ...p, complemento: e.target.value }))}
                                        placeholder="Apto, bloco..."
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Bairro</label>
                                    <input
                                        type="text"
                                        value={address.bairro}
                                        onChange={(e) => setAddress((p) => ({ ...p, bairro: e.target.value }))}
                                        placeholder="Bairro"
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Cidade + Referencia */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
                                    <input
                                        type="text"
                                        value={address.cidade}
                                        onChange={(e) => setAddress((p) => ({ ...p, cidade: e.target.value }))}
                                        placeholder="Cidade"
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Referência</label>
                                    <input
                                        type="text"
                                        value={address.referencia}
                                        onChange={(e) => setAddress((p) => ({ ...p, referencia: e.target.value }))}
                                        placeholder="Próximo a..."
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button variant="ghost" onClick={() => setStep('customer')} className="flex-1" size="sm">Voltar</Button>
                        <Button
                            onClick={handleDeliveryContinue}
                            className="flex-1"
                            disabled={deliveryMethod === 'delivery' && !address.logradouro}
                        >
                            Continuar
                        </Button>
                    </div>
                </div>
            )}

            {/* ======== STEP 3: Payment ======== */}
            {step === 'payment' && (
                <div className="space-y-3 animate-fade-in">
                    {/* Customer + delivery indicator */}
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                        {selectedCustomer && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5">
                                <UserCheck size={12} className="text-brand-600" />
                                <span className="text-gray-700">{selectedCustomer.name}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5">
                            {deliveryMethod === 'pickup' ? <Store size={12} /> : <Truck size={12} />}
                            <span className="text-gray-700">{deliveryMethod === 'pickup' ? 'Retira na loja' : 'Entrega'}</span>
                        </div>
                        <button onClick={() => setStep('delivery')} className="text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer ml-auto">
                            Alterar
                        </button>
                    </div>

                    {/* Order Summary */}
                    <div className="rounded-lg bg-gray-50 p-3">
                        <h3 className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Resumo</h3>
                        <div className="space-y-0.5 max-h-28 overflow-y-auto">
                            {cart.items.map((item) => (
                                <div key={item.product.id} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{item.quantity}x {item.product.name}</span>
                                    <span className="font-medium text-gray-800">{formatCurrency(item.product.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between font-semibold text-sm text-gray-900">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                    </div>

                    {/* Discount + Surcharge side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">Desconto</label>
                            <div className="flex gap-1.5">
                                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                    <button
                                        onClick={() => setDiscountType('value')}
                                        className={`px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${discountType === 'value' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >R$</button>
                                    <button
                                        onClick={() => setDiscountType('percentage')}
                                        className={`px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${discountType === 'percentage' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >%</button>
                                </div>
                                <Input type="number" min={0} step={0.01} value={discountValue || ''} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} placeholder="0,00" className="flex-1 !py-1.5 !text-xs" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">Acréscimo (R$)</label>
                            <Input type="number" min={0} step={0.01} value={surcharge || ''} onChange={(e) => setSurcharge(parseFloat(e.target.value) || 0)} placeholder="0,00" className="!py-1.5 !text-xs" />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <Select label="Forma de Pagamento" options={paymentOptions} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} />

                    {/* Totals */}
                    <div className="rounded-lg bg-brand-50 p-3 space-y-1">
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-xs text-red-600">
                                <span>Desconto</span>
                                <span>- {formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        {surcharge > 0 && (
                            <div className="flex justify-between text-xs text-amber-600">
                                <span>Acréscimo</span>
                                <span>+ {formatCurrency(surcharge)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-brand-700">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setStep('delivery')} className="flex-1" size="sm">Voltar</Button>
                        <Button onClick={handleConfirm} className="flex-1" isLoading={loading}>Confirmar Venda</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
