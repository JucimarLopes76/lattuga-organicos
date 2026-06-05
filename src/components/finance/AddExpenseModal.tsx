
import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useFinanceStore } from '@/stores/financeStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EXPENSE_CATEGORIES = [
    'Fornecedores de Produtos', 'Aluguel', 'Energia Elétrica', 'Água', 'Internet/Telefone',
    'Salários', 'Manutenção', 'Embalagens', 'Marketing', 'Impostos',
    'Transportes/Combustível', 'Equipamentos', 'Limpeza', 'Contador',
    'Tarifas Bancárias', 'Pró-labore', 'Software/Sistemas', 'Outros'
];

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Boleto'];

export function AddExpenseModal({ isOpen, onClose }: AddExpenseModalProps) {
    const { addExpense, addExpenses } = useFinanceStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState(2);

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Fornecedores de Produtos',
        supplier: '',
        due_date: new Date().toISOString().split('T')[0],
        payment_date: '',
        payment_method: '',
        proof_url: '',
        status: 'pending' as 'pending' | 'paid'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isInstallment) {
                const count = Math.max(2, installmentsCount);
                const totalAmount = parseFloat(formData.amount);
                const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
                const remainingAmount = totalAmount - (baseAmount * count);

                const expensesData = [];
                for (let i = 0; i < count; i++) {
                    const date = new Date(formData.due_date);
                    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
                    adjustedDate.setMonth(adjustedDate.getMonth() + i);
                    const formattedDate = adjustedDate.toISOString().split('T')[0];

                    const isLast = i === count - 1;
                    const amount = isLast ? Number((baseAmount + remainingAmount).toFixed(2)) : baseAmount;

                    expensesData.push({
                        description: `${formData.description} (${i + 1}/${count})`,
                        amount,
                        category: formData.category,
                        supplier: formData.supplier || null,
                        due_date: formattedDate,
                        payment_date: i === 0 ? (formData.payment_date || null) : null,
                        payment_method: i === 0 ? (formData.payment_method || null) : null,
                        proof_url: formData.proof_url || null,
                        status: i === 0 ? formData.status : 'pending' as const
                    });
                }
                await addExpenses(expensesData);
            } else {
                await addExpense({
                    description: formData.description,
                    amount: parseFloat(formData.amount),
                    category: formData.category,
                    supplier: formData.supplier || null,
                    due_date: formData.due_date,
                    payment_date: formData.payment_date || null,
                    payment_method: formData.payment_method || null,
                    proof_url: formData.proof_url || null,
                    status: formData.status
                });
            }
            setFormData({
                description: '', amount: '', category: 'Fornecedores de Produtos', supplier: '',
                due_date: new Date().toISOString().split('T')[0], payment_date: '',
                payment_method: '', proof_url: '', status: 'pending'
            });
            setIsInstallment(false);
            setInstallmentsCount(2);
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao salvar despesa: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-scale-in">

                {/* Header — fixo */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">Nova Despesa</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body — scrollável */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Installment Toggle */}
                            <div className="sm:col-span-2 flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800">Despesa Parcelada</h3>
                                    <p className="text-xs text-gray-500">Criar lançamentos automáticos mês a mês</p>
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

                            {/* Description */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                    placeholder="Ex: Compra de embalagens"
                                />
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {isInstallment ? 'Valor Total (R$) *' : 'Valor (R$) *'}
                                </label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                    placeholder="0,00"
                                />
                            </div>

                            {/* Installments Count */}
                            {isInstallment && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Parcelas *</label>
                                    <input
                                        required
                                        type="number"
                                        min="2"
                                        max="120"
                                        value={installmentsCount}
                                        onChange={e => setInstallmentsCount(parseInt(e.target.value) || 2)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                    />
                                </div>
                            )}

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                                >
                                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Supplier */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                                <input
                                    type="text"
                                    value={formData.supplier}
                                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                    placeholder="Ex: Gráfica XYZ"
                                />
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento *</label>
                                <input
                                    required
                                    type="date"
                                    value={formData.due_date}
                                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                />
                            </div>

                            <div className="sm:col-span-2 border-t border-gray-100"></div>

                            {/* Status Toggle */}
                            <div className="sm:col-span-2 flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-700">Status:</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: 'pending', payment_date: '' })}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                            formData.status === 'pending'
                                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        Pendente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: 'paid', payment_date: new Date().toISOString().split('T')[0] })}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                            formData.status === 'paid'
                                                ? "bg-green-100 text-green-800 border-green-200"
                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        Pago
                                    </button>
                                </div>
                            </div>

                            {/* Payment Details (Only if Paid) */}
                            {formData.status === 'paid' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento</label>
                                        <input
                                            type="date"
                                            value={formData.payment_date}
                                            onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                                        <select
                                            value={formData.payment_method}
                                            onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                                        >
                                            <option value="">Selecione...</option>
                                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Proof URL */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante (URL)</label>
                                <input
                                    type="url"
                                    value={formData.proof_url}
                                    onChange={e => setFormData({ ...formData, proof_url: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer — fixo */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-2xl">
                        <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : <><Save size={18} className="mr-2" /> Salvar</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
