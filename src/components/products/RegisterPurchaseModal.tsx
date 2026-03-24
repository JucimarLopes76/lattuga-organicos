import { useState, useMemo } from 'react';
import { X, Search, Plus, Trash2, ArrowRight, Save, Receipt, Package } from 'lucide-react';
import { useProductsStore } from '@/stores/productsStore';
import { usePurchasesStore } from '@/stores/purchasesStore';
import { Button } from '@/components/ui/Button';
import { formatCurrency, cn } from '@/lib/utils';
import type { Expense } from '@/types';

interface RegisterPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface PurchaseItem {
    product_id: string;
    quantity: number;
    unit_cost: number;
    name: string;
}

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Boleto'];

export function RegisterPurchaseModal({ isOpen, onClose }: RegisterPurchaseModalProps) {
    const { products } = useProductsStore();
    const { registerPurchases } = usePurchasesStore();

    const [step, setStep] = useState<1 | 2>(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Items & Supplier
    const [supplier, setSupplier] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [searchPrompt, setSearchPrompt] = useState('');
    
    // Step 2: Finance
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState(2);
    const [financeData, setFinanceData] = useState({
        due_date: new Date().toISOString().split('T')[0],
        payment_date: '',
        payment_method: '',
        status: 'pending' as 'pending' | 'paid'
    });

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    }, [items]);

    const handleAddItem = (product: any) => {
        if (items.find(i => i.product_id === product.id)) return;
        setItems([...items, {
            product_id: product.id,
            name: product.name,
            quantity: 1,
            unit_cost: product.cost_price || 0
        }]);
        setSearchPrompt('');
    };

    const handleUpdateItem = (productId: string, field: keyof PurchaseItem, value: number) => {
        setItems(items.map(item => 
            item.product_id === productId ? { ...item, [field]: Math.max(0, value) } : item
        ));
    };

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(i => i.product_id !== productId));
    };

    const handleNextStep = () => {
        if (!supplier.trim()) return alert('Informe o fornecedor.');
        if (items.length === 0) return alert('Adicione pelo menos um produto.');
        if (items.some(i => i.quantity <= 0)) return alert('A quantidade deve ser maior que zero.');
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Build the purchases array
            const purchases = items.map(item => ({
                product_id: item.product_id,
                supplier,
                quantity: item.quantity,
                unit_cost: item.unit_cost
            }));

            // Build the expense data
            const expenseParams: Omit<Expense, 'id' | 'created_at'> = {
                description: `Compra de Produtos - ${supplier}`,
                amount: totalAmount,
                category: 'Fornecedores de Produtos',
                supplier: supplier,
                due_date: financeData.due_date,
                payment_date: financeData.payment_date || null,
                payment_method: financeData.payment_method || null,
                proof_url: null,
                status: financeData.status
            };

            await registerPurchases(purchases, expenseParams, isInstallment, installmentsCount);

            // Reset and close
            setSupplier('');
            setItems([]);
            setStep(1);
            setFinanceData({
                due_date: new Date().toISOString().split('T')[0],
                payment_date: '',
                payment_method: '',
                status: 'pending'
            });
            onClose();
        } catch (error: any) {
            alert('Erro ao registrar a compra: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProducts = searchPrompt.length > 2 
        ? products.filter(p => p.name.toLowerCase().includes(searchPrompt.toLowerCase())).slice(0, 5)
        : [];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Registrar Compra</h2>
                        <p className="text-sm text-gray-500">
                            {step === 1 ? '1. Produtos e Fornecedor' : '2. Dados Financeiros'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body Step 1 */}
                {step === 1 && (
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor *</label>
                            <input
                                required
                                type="text"
                                value={supplier}
                                onChange={e => setSupplier(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                placeholder="Nome do Fornecedor / Empresa"
                            />
                        </div>

                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <label className="block text-sm font-medium text-gray-800 mb-2">Quais produtos deseja comprar?</label>
                            
                            <div className="relative mb-3">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchPrompt}
                                    onChange={e => setSearchPrompt(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm shadow-sm"
                                    placeholder="Buscar produto para adicionar..."
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-1" style={{ maxHeight: '200px' }}>
                                {products
                                    .filter(p => !searchPrompt || p.name.toLowerCase().includes(searchPrompt.toLowerCase()))
                                    .map(p => {
                                        const isSelected = items.some(i => i.product_id === p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => !isSelected && handleAddItem(p)}
                                                disabled={isSelected}
                                                className={cn(
                                                    "flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left bg-white group",
                                                    isSelected 
                                                        ? "border-brand-200 bg-brand-50/50 opacity-60 cursor-not-allowed"
                                                        : "border-gray-200 hover:border-brand-300 hover:bg-brand-50 hover:shadow-sm cursor-pointer"
                                                )}
                                            >
                                                <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative group-hover:ring-2 ring-brand-500/30 transition-all">
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <Package size={16} />
                                                        </div>
                                                    )}
                                                    {!isSelected && (
                                                        <div className="absolute inset-0 bg-brand-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Plus size={16} className="text-brand-700 scale-0 group-hover:scale-100 transition-transform" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-xs font-semibold truncate leading-tight mb-0.5", isSelected ? "text-brand-900" : "text-gray-800")}>
                                                        {p.name}
                                                    </p>
                                                    <p className={cn("text-[10px] font-medium", isSelected ? "text-brand-600" : "text-gray-500")}>
                                                        {isSelected ? 'Já adicionado' : `Custo: ${formatCurrency(p.cost_price || 0)}`}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                })}
                            </div>
                        </div>

                        {/* Items Table */}
                        {items.length > 0 && (
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Produto</th>
                                            <th className="px-4 py-3 font-medium w-24">Qtd</th>
                                            <th className="px-4 py-3 font-medium w-32">Custo Un. (R$)</th>
                                            <th className="px-4 py-3 font-medium w-32">Subtotal</th>
                                            <th className="px-4 py-3 font-medium w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map(item => (
                                            <tr key={item.product_id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={e => handleUpdateItem(item.product_id, 'quantity', parseInt(e.target.value) || 0)}
                                                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-brand-500/20"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        min="0"
                                                        value={item.unit_cost}
                                                        onChange={e => handleUpdateItem(item.product_id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-brand-500/20"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-600">
                                                    {formatCurrency(item.quantity * item.unit_cost)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemoveItem(item.product_id)}
                                                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right font-medium text-gray-500">Total da Compra:</td>
                                            <td className="px-4 py-3 font-bold text-gray-900 text-lg">{formatCurrency(totalAmount)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Body Step 2 */}
                {step === 2 && (
                    <form id="finance-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
                        <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-sm font-semibold text-brand-900">Resumo da Compra</h3>
                                <p className="text-xs text-brand-700">{supplier} • {items.length} produto(s)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-brand-700">Valor Total</p>
                                <p className="text-xl font-bold text-brand-900">{formatCurrency(totalAmount)}</p>
                            </div>
                        </div>

                        {/* Installment Toggle */}
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 mb-2">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">Compra Parcelada</h3>
                                <p className="text-xs text-gray-500">Dividir pagamento em várias vezes</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={isInstallment}
                                    onChange={(e) => setIsInstallment(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Installments Count */}
                            {isInstallment && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Parcelas *</label>
                                    <input
                                        required
                                        type="number"
                                        min="2"
                                        max="120"
                                        value={installmentsCount}
                                        onChange={e => setInstallmentsCount(parseInt(e.target.value) || 2)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {isInstallment ? 'Vencimento 1ª Parcela *' : 'Vencimento *'}
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={financeData.due_date}
                                    onChange={e => setFinanceData({ ...financeData, due_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center gap-4 mt-2">
                                <span className="text-sm font-medium text-gray-700">Status:</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFinanceData({ ...financeData, status: 'pending', payment_date: '' })}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                            financeData.status === 'pending'
                                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        Pendente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFinanceData({ ...financeData, status: 'paid', payment_date: new Date().toISOString().split('T')[0] })}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                            financeData.status === 'paid'
                                                ? "bg-green-100 text-green-800 border-green-200"
                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        Pago
                                    </button>
                                </div>
                            </div>

                            {financeData.status === 'paid' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento</label>
                                        <input
                                            type="date"
                                            value={financeData.payment_date}
                                            onChange={e => setFinanceData({ ...financeData, payment_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                                        <select
                                            value={financeData.payment_method}
                                            onChange={e => setFinanceData({ ...financeData, payment_method: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 outline-none bg-white"
                                        >
                                            <option value="">Selecione...</option>
                                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    </form>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
                    <Button variant="outline" type="button" onClick={() => step === 2 ? setStep(1) : onClose()} disabled={isLoading}>
                        {step === 2 ? 'Voltar' : 'Cancelar'}
                    </Button>
                    
                    {step === 1 ? (
                        <Button type="button" onClick={handleNextStep}>
                            Avançar <ArrowRight size={18} className="ml-2" />
                        </Button>
                    ) : (
                        <Button form="finance-form" type="submit" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : <><Save size={18} className="mr-2" /> Finalizar Despesa</>}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
