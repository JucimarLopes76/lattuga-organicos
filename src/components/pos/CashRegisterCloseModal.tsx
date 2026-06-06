import { useState, useEffect } from 'react';
import { useCashRegisterStore, type SalesSummary } from '@/stores/cashRegisterStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import { Calculator, CheckCircle, AlertCircle, Banknote, CreditCard, Smartphone } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CashRegisterCloseModal({ isOpen, onClose, onSuccess }: Props) {
    const { closeRegister, getSessionSalesSummary, currentSession } = useCashRegisterStore();

    const [summary, setSummary] = useState<SalesSummary | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Counted values
    const [cashCount, setCashCount] = useState('');
    const [pixCount, setPixCount] = useState('');
    const [debitCount, setDebitCount] = useState('');
    const [creditCount, setCreditCount] = useState('');
    const [notes, setNotes] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSummary();
        }
    }, [isOpen]);

    const loadSummary = async () => {
        setLoadingSummary(true);
        const data = await getSessionSalesSummary();
        setSummary(data);

        // Auto-fill non-cash values
        setPixCount(data.byPix.toFixed(2));
        setDebitCount(data.byDebit.toFixed(2));
        setCreditCount(data.byCredit.toFixed(2));
        setCashCount(''); // User must count cash

        setLoadingSummary(false);
    };

    const handleCloseRegister = async () => {
        if (!summary) return;

        setIsSubmitting(true);
        try {
            const success = await closeRegister(
                {
                    closing_cash: parseFloat(cashCount.replace(',', '.')) || 0,
                    closing_pix: parseFloat(pixCount.replace(',', '.')) || 0,
                    closing_debit: parseFloat(debitCount.replace(',', '.')) || 0,
                    closing_credit: parseFloat(creditCount.replace(',', '.')) || 0,
                },
                summary,
                notes
            );

            if (success) {
                onSuccess();
                onClose();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculations
    const openingBalance = currentSession?.opening_balance || 0;
    const expectedCash = (summary?.byCash || 0) + openingBalance;
    const countedCash = parseFloat(cashCount.replace(',', '.')) || 0;
    const diffCash = countedCash - expectedCash;

    const expectedPix = summary?.byPix || 0;
    const countedPix = parseFloat(pixCount.replace(',', '.')) || 0;
    const diffPix = countedPix - expectedPix;

    const expectedDebit = summary?.byDebit || 0;
    const countedDebit = parseFloat(debitCount.replace(',', '.')) || 0;
    const diffDebit = countedDebit - expectedDebit;

    const expectedCredit = summary?.byCredit || 0;
    const countedCredit = parseFloat(creditCount.replace(',', '.')) || 0;
    const diffCredit = countedCredit - expectedCredit;

    const totalDiff = diffCash + diffPix + diffDebit + diffCredit;

    if (!summary) return null;

    // Helper for rows
    const renderRow = (
        icon: React.ReactNode,
        label: string,
        sublabel: string | null,
        expected: number,
        value: string,
        onChange: (val: string) => void,
        diff: number,
        isCash: boolean = false
    ) => (
        <div className={`rounded-xl border p-4 space-y-3 ${Math.abs(diff) > 0.01 ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-white'}`}>
            {/* Header: icon + label + diff badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${isCash ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {icon}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 text-sm">{label}</p>
                        {sublabel && <p className="text-[10px] text-gray-500">{sublabel}</p>}
                    </div>
                </div>
                {Math.abs(diff) > 0.01 ? (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${diff < 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                        <CheckCircle size={14} /> OK
                    </span>
                )}
            </div>

            {/* Sistema + Físico side by side */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Sistema</p>
                    <p className="text-base font-bold text-gray-700">{formatCurrency(expected)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Físico</p>
                    <input
                        type="number"
                        step="0.01"
                        className={`w-full text-base font-bold bg-white border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-all ${Math.abs(diff) > 0.01
                                ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20 text-amber-900'
                                : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 text-gray-900'
                            }`}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="0,00"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Fechar Caixa" size="lg">
            <div className="max-h-[85vh] overflow-y-auto pr-1">
                {/* Header Stats */}
                <div className="flex bg-gray-900 text-white rounded-xl p-4 mb-6 shadow-lg">
                    <div className="flex-1 text-center border-r border-gray-700">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Vendas Totais</p>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalSales)}</p>
                    </div>
                    <div className="flex-1 text-center border-r border-gray-700">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Pedidos</p>
                        <p className="text-2xl font-bold">{summary.totalOrders}</p>
                    </div>
                    <div className="flex-1 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Fundo Inicial</p>
                        <p className="text-xl font-bold text-gray-300">{formatCurrency(openingBalance)}</p>
                    </div>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-center px-2 mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                            <Calculator size={16} /> Conferência de Valores
                        </h4>
                        {Math.abs(totalDiff) > 0.01 && (
                            <span className={`text-xs font-bold flex items-center gap-1 ${totalDiff < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                <AlertCircle size={12} />
                                Diferença Total: {totalDiff > 0 ? '+' : ''}{formatCurrency(totalDiff)}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="contents">
                            {renderRow(
                                <Banknote size={20} />,
                                "Dinheiro",
                                `Vendas: ${formatCurrency(summary.byCash)}`,
                                expectedCash,
                                cashCount,
                                setCashCount,
                                diffCash,
                                true
                            )}
                            {renderRow(
                                <Smartphone size={20} />,
                                "Pix",
                                null,
                                expectedPix,
                                pixCount,
                                setPixCount,
                                diffPix
                            )}
                            {renderRow(
                                <CreditCard size={20} />,
                                "Débito",
                                null,
                                expectedDebit,
                                debitCount,
                                setDebitCount,
                                diffDebit
                            )}
                            {renderRow(
                                <CreditCard size={20} />,
                                "Crédito",
                                null,
                                expectedCredit,
                                creditCount,
                                setCreditCount,
                                diffCredit
                            )}
                        </div>
                    </div>
                </div>

                {(summary.totalOrdersPdvCount > 0 || summary.totalOrdersOnlineCount > 0) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Origem das Vendas</p>
                        <div className="flex gap-3">
                            <div className="flex-1 bg-white rounded-lg border border-gray-100 p-2 text-center">
                                <p className="text-xs text-gray-500">PDV</p>
                                <p className="text-sm font-bold text-gray-800">{formatCurrency(summary.totalSalesPdv)}</p>
                                <p className="text-[10px] text-gray-400">{summary.totalOrdersPdvCount} pedido{summary.totalOrdersPdvCount !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="flex-1 bg-white rounded-lg border border-gray-100 p-2 text-center">
                                <p className="text-xs text-gray-500">Online</p>
                                <p className="text-sm font-bold text-gray-800">{formatCurrency(summary.totalSalesOnline)}</p>
                                <p className="text-[10px] text-gray-400">{summary.totalOrdersOnlineCount} pedido{summary.totalOrdersOnlineCount !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </div>
                )}

                {summary.byPayLater > 0 && (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
                        <div>
                            <p className="text-sm font-semibold text-amber-700">A Receber (Pagará Depois)</p>
                            <p className="text-xs text-amber-500">Não contabilizado no caixa</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-amber-700">{formatCurrency(summary.byPayLater)}</p>
                        </div>
                    </div>
                )}

                {summary.cancelledOrders > 0 && (
                    <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                        <div>
                            <p className="text-sm font-semibold text-red-700">Pedidos Cancelados</p>
                            <p className="text-xs text-red-500">Não contabilizados no fechamento</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-red-700">{summary.cancelledOrders} pedido{summary.cancelledOrders > 1 ? 's' : ''}</p>
                            <p className="text-xs text-red-500">{formatCurrency(summary.cancelledAmount)}</p>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações do Fechamento
                    </label>
                    <textarea
                        className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none transition-all shadow-sm"
                        rows={2}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex: Justificativa de quebra de caixa, ocorrências do dia..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-6">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCloseRegister}
                        isLoading={isSubmitting}
                        className={Math.abs(totalDiff) > 10 ? 'bg-amber-600 hover:bg-amber-700' : undefined}
                    >
                        {Math.abs(totalDiff) > 10 ? 'Fechar com Diferença' : 'Fechar Caixa'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
